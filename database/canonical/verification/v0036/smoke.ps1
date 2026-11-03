param(
  [ValidateSet('16','17')][string]$Version,
  [ValidateSet('fresh','upgrade')][string]$Mode
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$image = if ($Version -eq '16') {
  'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
} else {
  'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
}
$nonce = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(6)).ToLowerInvariant()
$name = "canonical-premerge-pg$Version-$Mode-$nonce"
$envPath = Join-Path ([IO.Path]::GetTempPath()) "$name.env"
$restoreName = "$name-restore"
$restoreEnvPath = Join-Path ([IO.Path]::GetTempPath()) "$restoreName.env"
$backupVolume = "$name-backup"

function Run([string]$label,[string[]]$dockerArgs) {
  Write-Output "COMMAND $label"
  & docker @dockerArgs 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "FAIL $label exit=$LASTEXITCODE" }
}
try {
  $secret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
  @('POSTGRES_DB=phoenix_canonical_dev','POSTGRES_USER=phoenix_bootstrap',"POSTGRES_PASSWORD=$secret",'POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C.UTF-8 --auth-local=scram-sha-256 --auth-host=scram-sha-256') |
    Set-Content -LiteralPath $envPath
  $secret = $null
  if ($IsWindows) {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls $envPath /inheritance:r /grant:r "${identity}:F" *> $null
  } else { & chmod 600 $envPath }
  if($LASTEXITCODE -ne 0) { throw 'Synthetic credential permissions failed' }
  Run 'start isolated disposable PostgreSQL' @('run','-d','--name',$name,'--network','none','--env-file',$envPath,$image)
  $ready = $false
  for($i=0;$i -lt 60;$i++) {
    & docker exec $name pg_isready -U phoenix_bootstrap -d phoenix_canonical_dev *> $null
    if($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if(-not $ready) { throw 'FAIL PostgreSQL readiness' }
  Run 'prepare disposable migration directory' @('exec',$name,'mkdir','-p','/opt/canonical-migrations','/opt/verification','/tmp/staged')
  Run 'copy integration branch SQL bytes' @('cp',(Join-Path $root 'migrations/.'),"${name}:/opt/canonical-migrations")
  Run 'copy public verification runner' @('cp',(Join-Path $PSScriptRoot '../migrate.sh'),"${name}:/opt/verification/migrate.sh")
  Run 'copy 0036 permanent regression' @('cp',$PSScriptRoot,"${name}:/opt/verification/v0036")
  if($Mode -eq 'upgrade') {
    Run 'stage 0026-0036 in disposable container' @('exec',$name,'bash','-c','for f in /opt/canonical-migrations/*.sql; do n=$(basename "$f"); [ "${n:0:4}" -gt 25 ] && mv "$f" /tmp/staged/; done; true')
    Run 'install 0001-0025' @('exec','-e','CANONICAL_EXPECTED_MIGRATIONS=25',$name,'bash','/opt/verification/migrate.sh')
    Run 'seed two synthetic 0025 master records' @('exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',$name,'psql','-X','-q','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1','-c',"INSERT INTO core.people(person_id,display_name) VALUES ('018f0000-0000-7000-8000-000000003601','Synthetic Premerge Person'); INSERT INTO core.families(family_id,display_name) VALUES ('018f0000-0000-7000-8000-000000003602','Synthetic Premerge Family');")
    Run 'restore 0026-0036 staging' @('exec',$name,'bash','-c','mv /tmp/staged/*.sql /opt/canonical-migrations/')
    Run 'stage only 0036 for precise 0035 upgrade boundary' @('exec',$name,'bash','-c','mv /opt/canonical-migrations/0036_*.sql /tmp/staged/')
    Run 'install 0026-0035 before candidate' @('exec','-e','CANONICAL_EXPECTED_MIGRATIONS=35',$name,'bash','/opt/verification/migrate.sh')
    $legacy="INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label) VALUES('018f0000-0000-7000-8000-000000035901',NULL,'SERVICE','ACTIVE','canonical_crm_v2'); INSERT INTO crm.lead_sources(lead_source_id,source_system,source_channel,status,created_by_principal_id) VALUES('018f0000-0000-7000-8000-000000035902','synthetic_upgrade','WEBSITE','ACTIVE','018f0000-0000-7000-8000-000000035901'); INSERT INTO crm.leads(lead_id,lead_source_id,lead_status,qualification_status,created_by_principal_id,updated_by_principal_id) VALUES('018f0000-0000-7000-8000-000000035903','018f0000-0000-7000-8000-000000035902','NEW','UNVERIFIED','018f0000-0000-7000-8000-000000035901','018f0000-0000-7000-8000-000000035901'); INSERT INTO crm.lead_attributions(lead_attribution_id,lead_id,attribution_kind,lead_source_id,compass_kind,source_system,attribution_model_version,created_by_principal_id) VALUES('018f0000-0000-7000-8000-000000035904','018f0000-0000-7000-8000-000000035903','FIRST_TOUCH','018f0000-0000-7000-8000-000000035902','FAMILY_COMPASS','synthetic_upgrade','v1','018f0000-0000-7000-8000-000000035901');"
    Run 'seed legacy 0035 First Touch without new provenance' @('exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',$name,'psql','-X','-q','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1','-c',$legacy)
    Run 'restore exact 0036 after legacy boundary' @('exec',$name,'bash','-c','mv /tmp/staged/0036_*.sql /opt/canonical-migrations/')
  }
  Run 'install through 0036' @('exec','-e','CANONICAL_EXPECTED_MIGRATIONS=36',$name,'bash','/opt/verification/migrate.sh')
  Run 'repeat through 0036' @('exec','-e','CANONICAL_EXPECTED_MIGRATIONS=36',$name,'bash','/opt/verification/migrate.sh')
  if($Mode -eq 'upgrade') {
    $preserved = & docker exec -e PGPASSFILE=/tmp/canonical-premerge.pgpass $name psql -X -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -c "SELECT (SELECT count(*) FROM core.people WHERE person_id='018f0000-0000-7000-8000-000000003601')=1 AND (SELECT count(*) FROM core.families WHERE family_id='018f0000-0000-7000-8000-000000003602')=1" 2>&1
    if($LASTEXITCODE -ne 0 -or ($preserved -join '').Trim() -ne 't') { throw 'FAIL synthetic upgrade records not preserved' }
    Write-Output 'PASS synthetic 0025 master records preserved through 0036'
    $preserved=& docker exec -e PGPASSFILE=/tmp/canonical-premerge.pgpass $name psql -X -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -c "SELECT compass_kind='FAMILY_COMPASS' AND acquisition_contract_id IS NULL AND entry_ref IS NULL AND source_event_ref IS NULL FROM crm.lead_attributions WHERE lead_attribution_id='018f0000-0000-7000-8000-000000035904'"
    if($LASTEXITCODE -ne 0 -or ($preserved -join '').Trim() -ne 't') { throw 'Legacy First Touch changed or fabricated backfill' }
    Write-Output 'PASS exact 0035 to 0036 upgrade preserves legacy First Touch; no fabricated provenance'
  }
  $drift = & docker exec $name bash -c 'printf "\n-- synthetic drift probe\n" >> /opt/canonical-migrations/0036_crm_acquisition_provenance_and_need_facts.sql; CANONICAL_EXPECTED_MIGRATIONS=36 bash /opt/verification/migrate.sh' 2>&1
  $driftCode = $LASTEXITCODE
  if($driftCode -eq 0 -or ($drift -join ' ') -notmatch 'DRIFT_REFUSED') { throw 'FAIL drift not rejected' }
  Write-Output 'PASS drift refused for disposable copy of 0036'
  Run 'restore unmodified 0036' @('cp',(Join-Path $root 'migrations/0036_crm_acquisition_provenance_and_need_facts.sql'),"${name}:/opt/canonical-migrations/0036_crm_acquisition_provenance_and_need_facts.sql")
  $atomic = & docker exec $name bash -c 'export PGPASSFILE=/tmp/canonical-premerge.pgpass; printf "BEGIN; CREATE SCHEMA canonical_atomic_probe; SELECT 1/0; COMMIT;\n" | psql -X -q -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -v ON_ERROR_STOP=1' 2>&1
  if($LASTEXITCODE -eq 0) { throw 'FAIL atomicity probe unexpectedly committed' }
  $check = & docker exec $name bash -c 'export PGPASSFILE=/tmp/canonical-premerge.pgpass; psql -X -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -c "SELECT to_regnamespace(''canonical_atomic_probe'') IS NULL"' 2>&1
  if($LASTEXITCODE -ne 0 -or ($check -join '').Trim() -ne 't') { throw 'FAIL atomic rollback check' }
  Run '0036 separate LOGIN permanent regression' @('exec',$name,'bash','/opt/verification/v0036/acceptance.sh')
  Run 'create exact disposable backup volume' @('volume','create',$backupVolume)
  # Export through the dedicated backup LOGIN, never bootstrap or migrator.
  Run 'export synthetic backup with dedicated backup LOGIN' @('exec',$name,'bash','-c','umask 077; set -euo pipefail; mkdir -p /tmp/0036-backup; PGPASSFILE=/tmp/0036-backup.pgpass pg_dump -h 127.0.0.1 -U canonical_0036_backup -d phoenix_canonical_dev -Fc > /tmp/0036-backup/source.dump; sha256sum /tmp/0036-backup/source.dump | cut -d" " -f1 > /tmp/0036-backup/source.sha256')
  $secret=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
  @('POSTGRES_DB=phoenix_canonical_dev','POSTGRES_USER=phoenix_bootstrap',"POSTGRES_PASSWORD=$secret",'POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C.UTF-8 --auth-local=scram-sha-256 --auth-host=scram-sha-256') | Set-Content -LiteralPath $restoreEnvPath
  $secret=$null
  if($IsWindows) { & icacls $restoreEnvPath /inheritance:r /grant:r "${identity}:F" *> $null } else { & chmod 600 $restoreEnvPath }
  if($LASTEXITCODE -ne 0) { throw 'Restore credential permissions failed' }
  Run 'start fresh disposable restore cluster' @('run','-d','--name',$restoreName,'--network','none','--env-file',$restoreEnvPath,'--mount',"type=volume,source=$backupVolume,target=/backup",$image)
  $ready=$false
  for($i=0;$i -lt 60;$i++) { & docker exec $restoreName pg_isready -U phoenix_bootstrap -d phoenix_canonical_dev *> $null; if($LASTEXITCODE -eq 0) { $ready=$true; break }; Start-Sleep -Seconds 1 }
  if(-not $ready) { throw 'Restore readiness failed' }
  Run 'copy restore regression' @('cp',(Join-Path $PSScriptRoot '..'),"${restoreName}:/opt/verification")
  # docker cp does not stream safely between containers: use a protected host
  # directory for the synthetic dump only; no passwords/globals are exported.
  $backupPath=Join-Path ([IO.Path]::GetTempPath()) "$name-backup"
  $null=New-Item -ItemType Directory -Path $backupPath
  if($IsWindows) { & icacls $backupPath /inheritance:r /grant:r "${identity}:(OI)(CI)F" *> $null } else { & chmod 700 $backupPath }
  if($LASTEXITCODE -ne 0) { throw 'Backup directory permissions failed' }
  Run 'copy exact synthetic dump out' @('cp',"${name}:/tmp/0036-backup/.",$backupPath)
  Run 'copy exact synthetic dump into fresh cluster' @('cp',"$backupPath/.","${restoreName}:/backup")
  Run 'damage only disposable manifest for rejection test' @('exec',$restoreName,'bash','-c','printf "%064d\n" 0 > /backup/source.sha256')
  $tamper=& docker exec $restoreName bash /opt/verification/v0036/restore.sh 2>&1
  if($LASTEXITCODE -eq 0 -or ($tamper -join ' ') -notmatch 'RESTORE_MANIFEST_DIGEST_MISMATCH') { throw 'Corrupt restore manifest was not refused' }
  Write-Output 'PASS corrupted backup manifest refused before cluster restore'
  Run 'restore original synthetic manifest' @('cp',(Join-Path $backupPath 'source.sha256'),"${restoreName}:/backup/source.sha256")
  Run 'restore and re-run 0036 acceptance with separate LOGINs' @('exec',$restoreName,'bash','/opt/verification/v0036/restore.sh')
  Write-Output "PASS PostgreSQL $Version ${Mode}: migration, repeat, drift, atomicity, split LOGIN regression, fresh-cluster restore; isolated network"
} finally {
  if(@(docker ps -a --format '{{.Names}}') -contains $restoreName) { & docker rm -f -v $restoreName *> $null }
  if(@(docker ps -a --format '{{.Names}}') -contains $name) { & docker rm -f -v $name *> $null }
  if(@(docker volume ls --format '{{.Name}}') -contains $backupVolume) { & docker volume rm $backupVolume *> $null }
  if(Test-Path -LiteralPath $envPath) { Remove-Item -LiteralPath $envPath -Force }
  if(Test-Path -LiteralPath $restoreEnvPath) { Remove-Item -LiteralPath $restoreEnvPath -Force }
  if($backupPath -and (Test-Path -LiteralPath $backupPath)) {
    $resolved=[IO.Path]::GetFullPath($backupPath)
    $expected=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "$name-backup"))
    if($resolved -ne $expected) { throw 'Backup cleanup target mismatch' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
  Write-Output 'CLEANUP own disposable clusters, volumes, synthetic dump and credentials only'
}
