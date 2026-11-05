param([string]$CanonicalRoot=(Join-Path $PSScriptRoot '../..'))
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $CanonicalRoot).Path
$verify=Join-Path $root 'verification/v0036/verify.ps1'
& $verify -CanonicalRoot $root
if(-not $?) { throw 'INVENTORY_POSITIVE_CONTROL_FAILED' }
$nonce=[guid]::NewGuid().ToString('N')
$temp=Join-Path ([IO.Path]::GetTempPath()) "canonical-inventory-regression-$nonce"
$target=Join-Path $temp 'database/canonical'
$null=New-Item -ItemType Directory -Path $target
function Expect-Rejection([string]$label,[string]$code) {
    Write-Output "COMMAND inventory negative: $label"
    $out=& pwsh -NoProfile -File $verify -CanonicalRoot $target 2>&1
    if($LASTEXITCODE -eq 0 -or ($out -join ' ') -notmatch $code) { throw "INVENTORY_NEGATIVE_NOT_REFUSED: $label" }
    Write-Output "PASS inventory negative: $label rejected ($code)"
}
try {
    Copy-Item -Path (Join-Path $root '*') -Destination $target -Recurse
    $docs=Join-Path $temp 'docs/database/premerge-0035'
    $null=New-Item -ItemType Directory -Path $docs -Force
    Copy-Item -LiteralPath (Join-Path $root '../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md') -Destination $docs
    & $verify -CanonicalRoot $target
    if(-not $?) { throw 'COPIED_INVENTORY_POSITIVE_CONTROL_FAILED' }
    $path=Join-Path $target 'migration-manifests/0036-candidate.json'
    $original=[IO.File]::ReadAllText($path)
    $manifest=$original | ConvertFrom-Json
    $count=@($manifest.verification).Count
    $manifest.verification=@(1..$count | ForEach-Object {$manifest.verification[0]})
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding utf8
    $restore=Join-Path $target 'verification/v0036/restore.sh'
    Add-Content -LiteralPath $restore -Value '# synthetic omitted-file drift'
    Expect-Rejection 'duplicate paths cannot hide an omitted modified helper' '0036_VERIFICATION_INVENTORY_DRIFT'
    [IO.File]::WriteAllText($path,$original,[Text.UTF8Encoding]::new($false))
    Expect-Rejection 'correct inventory still refuses modified helper' '0036_VERIFICATION_DIGEST_DRIFT'
    Copy-Item -LiteralPath (Join-Path $root 'verification/v0036/restore.sh') -Destination $restore -Force
    $migration=Join-Path $target 'migrations/0036_crm_acquisition_provenance_and_need_facts.sql'
    Add-Content -LiteralPath $migration -Value '-- synthetic candidate drift'
    Expect-Rejection 'modified candidate SQL refused' '0036_CANDIDATE_DIGEST_DRIFT'
    Write-Output 'PASS P41-A5 exact unique complete verification inventory and drift regressions'
} finally {
    $resolved=[IO.Path]::GetFullPath($temp)
    $expected=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "canonical-inventory-regression-$nonce"))
    if($resolved -ne $expected) { throw 'INVENTORY_CLEANUP_TARGET_MISMATCH' }
    if(Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
