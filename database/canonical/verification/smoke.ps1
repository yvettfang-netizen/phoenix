param(
  [ValidateSet('16','17')][string]$Version,
  [ValidateSet('fresh','upgrade')][string]$Mode
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$image = if ($Version -eq '16') {
  'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
} else {
  'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
}
$nonce = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(6)).ToLowerInvariant()
$name = "canonical-premerge-pg$Version-$Mode-$nonce"
$envPath = Join-Path ([IO.Path]::GetTempPath()) "$name.env"

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
  if (-not $IsWindows) { & chmod 600 $envPath }
  Run 'start isolated disposable PostgreSQL' @('run','-d','--name',$name,'--network','none','--env-file',$envPath,$image)
  $ready = $false
  for($i=0;$i -lt 60;$i++) {
    & docker exec $name pg_isready -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev *> $null
    if($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if(-not $ready) { throw 'FAIL PostgreSQL readiness' }
  Run 'prepare disposable migration directory' @('exec',$name,'mkdir','-p','/opt/canonical-migrations','/opt/verification','/tmp/staged')
  Run 'copy integration branch SQL bytes' @('cp',(Join-Path $root 'migrations/.'),"${name}:/opt/canonical-migrations")
  Run 'copy public verification runner' @('cp',(Join-Path $PSScriptRoot 'migrate.sh'),"${name}:/opt/verification/migrate.sh")
  if($Mode -eq 'upgrade') {
    Run 'stage 0026-0035 in disposable container' @('exec',$name,'bash','-c','for f in /opt/canonical-migrations/*.sql; do n=$(basename "$f"); [ "${n:0:4}" -gt 25 ] && mv "$f" /tmp/staged/; done; true')
    Run 'install 0001-0025' @('exec','-e','CANONICAL_EXPECTED_MIGRATIONS=25',$name,'bash','/opt/verification/migrate.sh')
    Run 'seed two synthetic 0025 master records' @('exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',$name,'psql','-X','-q','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1','-c',"INSERT INTO core.people(person_id,display_name) VALUES ('018f0000-0000-7000-8000-000000003501','Synthetic Premerge Person'); INSERT INTO core.families(family_id,display_name) VALUES ('018f0000-0000-7000-8000-000000003502','Synthetic Premerge Family');")
    Run 'restore 0026-0035 staging' @('exec',$name,'bash','-c','mv /tmp/staged/*.sql /opt/canonical-migrations/')
  }
  Run 'install through 0035' @('exec',$name,'bash','/opt/verification/migrate.sh')
  Run 'repeat through 0035' @('exec',$name,'bash','/opt/verification/migrate.sh')
  if($Mode -eq 'upgrade') {
    $preserved = & docker exec -e PGPASSFILE=/tmp/canonical-premerge.pgpass $name psql -X -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -c "SELECT (SELECT count(*) FROM core.people WHERE person_id='018f0000-0000-7000-8000-000000003501')=1 AND (SELECT count(*) FROM core.families WHERE family_id='018f0000-0000-7000-8000-000000003502')=1" 2>&1
    if($LASTEXITCODE -ne 0 -or ($preserved -join '').Trim() -ne 't') { throw 'FAIL synthetic upgrade records not preserved' }
    Write-Output 'PASS synthetic 0025 master records preserved through 0035'
  }
  $drift = & docker exec $name bash -c 'printf "\n-- synthetic drift probe\n" >> /opt/canonical-migrations/0035_m5_service_delivery_governance.sql; bash /opt/verification/migrate.sh' 2>&1
  $driftCode = $LASTEXITCODE
  if($driftCode -eq 0 -or ($drift -join ' ') -notmatch 'DRIFT_REFUSED') { throw 'FAIL drift not rejected' }
  Write-Output 'PASS drift refused for disposable copy of 0035'
  Run 'restore unmodified 0035' @('cp',(Join-Path $root 'migrations/0035_m5_service_delivery_governance.sql'),"${name}:/opt/canonical-migrations/0035_m5_service_delivery_governance.sql")
  $atomic = & docker exec $name bash -c 'export PGPASSFILE=/tmp/canonical-premerge.pgpass; printf "BEGIN; CREATE SCHEMA canonical_atomic_probe; SELECT 1/0; COMMIT;\n" | psql -X -q -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -v ON_ERROR_STOP=1' 2>&1
  if($LASTEXITCODE -eq 0) { throw 'FAIL atomicity probe unexpectedly committed' }
  $check = & docker exec $name bash -c 'export PGPASSFILE=/tmp/canonical-premerge.pgpass; psql -X -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -c "SELECT to_regnamespace(''canonical_atomic_probe'') IS NULL"' 2>&1
  if($LASTEXITCODE -ne 0 -or ($check -join '').Trim() -ne 't') { throw 'FAIL atomic rollback check' }
  Write-Output "PASS PostgreSQL $Version ${Mode}: migration, repeat, drift, atomicity; isolated network"
} finally {
  if(@(docker ps -a --format '{{.Names}}') -contains $name) { & docker rm -f -v $name *> $null }
  if(Test-Path -LiteralPath $envPath) { Remove-Item -LiteralPath $envPath -Force }
}
