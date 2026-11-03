param([string]$CanonicalRoot=(Join-Path $PSScriptRoot '../..'))
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $CanonicalRoot).Path
$files=@(Get-ChildItem (Join-Path $root 'migrations') -File -Filter '*.sql' | Sort-Object Name)
$expected=@{}
foreach($line in Get-Content (Join-Path $root '../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md')) {
    if($line -match '^\| ([0-9]{4}) \| `([0-9a-f]{64})` \|$') { $expected[$Matches[1]]=$Matches[2] }
}
if($expected.Count -ne 35 -or $files.Count -ne 36) { throw '0036_EXACT_INVENTORY_REQUIRED' }
for($i=0;$i -lt 35;$i++) {
    $number='{0:D4}' -f ($i+1)
    if(-not $files[$i].Name.StartsWith("${number}_") -or (Get-FileHash $files[$i].FullName).Hash.ToLowerInvariant() -ne $expected[$number]) { throw "FROZEN_MIGRATION_DRIFT_$number" }
}
$manifest=Get-Content (Join-Path $root 'migration-manifests/0036-candidate.json') -Raw | ConvertFrom-Json
if($manifest.baseline_migrations -ne 35 -or $manifest.total_migrations -ne 36 -or $manifest.tables -ne 93 -or $manifest.policies -ne 83 -or $manifest.approval_source_sha256 -ne 'f100e6156eb24912b0cb6cbca102ecdfb2a3d3537f06bb8ef4e1a6e8860f9b6c') { throw '0036_MANIFEST_CONTRACT_DRIFT' }
if($files[35].Name -ne $manifest.migration.filename -or (Get-FileHash $files[35].FullName).Hash.ToLowerInvariant() -ne $manifest.migration.sha256) { throw '0036_CANDIDATE_DIGEST_DRIFT' }
$required=@('verification/v0036/acceptance.sh','verification/v0036/smoke.ps1','verification/v0036/restore.sh','verification/v0036/verify.ps1')
if(@($manifest.verification).Count -ne $required.Count) { throw '0036_VERIFICATION_INVENTORY_DRIFT' }
foreach($entry in $manifest.verification) {
    if($entry.path -notin $required -or (Get-FileHash (Join-Path $root $entry.path)).Hash.ToLowerInvariant() -ne $entry.sha256) { throw '0036_VERIFICATION_DIGEST_DRIFT' }
}
Write-Output 'PASS immutable migrations=35/35; exact candidate ledger=36 tables=93 policies=83; versioned verification digests'
