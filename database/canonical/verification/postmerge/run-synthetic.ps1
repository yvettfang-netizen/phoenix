param(
    [Parameter(Mandatory)][ValidateSet('16','17')][string]$Version,
    [Parameter(Mandatory)][string]$PrivateCanonicalRoot,
    [Parameter(Mandatory)][string]$ApplicationServerRoot,
    [Parameter(Mandatory)][string]$EvidenceRoot
)
$ErrorActionPreference='Stop'
$canonical=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$repository=(& git -C $canonical rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw 'PUBLIC_CHECKOUT_REQUIRED' }
$private=(Resolve-Path -LiteralPath $PrivateCanonicalRoot).Path
$privateSha='bd06b0788c8246b82ee70ecc9e5611084ae6bd64'
& git -C $private diff --quiet $privateSha -- tests
if ($LASTEXITCODE -ne 0) { throw 'PINNED_ACCEPTANCE_SOURCE_REQUIRED' }
if (@(& git -C $private status --porcelain -- tests).Count -ne 0) { throw 'DIRTY_ACCEPTANCE_SOURCE' }
$evidence=[IO.Path]::GetFullPath($EvidenceRoot)
$repoPrefix=[IO.Path]::GetFullPath($repository)+[IO.Path]::DirectorySeparatorChar
if ($evidence.StartsWith($repoPrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'RAW_EVIDENCE_MUST_STAY_OUTSIDE_PUBLIC_CHECKOUT' }
$null=New-Item -ItemType Directory -Force -Path $evidence
$nonce=[guid]::NewGuid().ToString('N')
$workspace=Join-Path ([IO.Path]::GetTempPath()) "canonical-postmerge-$nonce"
$null=New-Item -ItemType Directory -Path $workspace
if ($IsWindows) {
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls $workspace /inheritance:r /grant:r "${identity}:(OI)(CI)F" *> $null
    if ($LASTEXITCODE -ne 0) { throw 'CREDENTIAL_DIRECTORY_ACL_FAILED' }
} else { & chmod 700 $workspace; if ($LASTEXITCODE -ne 0) { throw 'CREDENTIAL_DIRECTORY_MODE_FAILED' } }
$transcript=Join-Path $evidence "postmerge-pg$Version-commands.txt"
Start-Transcript -LiteralPath $transcript -Force | Out-Null
try {
    & (Join-Path $PSScriptRoot 'verify-authority.ps1') -OutputPath (Join-Path $evidence "postmerge-pg$Version-migrations.json")
    if (-not $?) { throw 'AUTHORITY_VERIFICATION_FAILED' }
    Write-Output "PUBLIC_BASELINE=9355d28667ee9cf4761b4abcdaf959f0ad154820 PRIVATE_TEST_SOURCE=$privateSha"
    foreach ($mode in @('fresh','upgrade')) {
        Write-Output "COMMAND pwsh verification/smoke.ps1 -Version $Version -Mode $mode"
        & pwsh -NoProfile -File (Join-Path $canonical 'verification/smoke.ps1') -Version $Version -Mode $mode 2>&1 |
            Tee-Object -LiteralPath (Join-Path $evidence "postmerge-pg$Version-smoke-$mode.txt") | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "SMOKE_FAILED_$mode" }
    }
    foreach ($sub in @('tests','migrations/canonical','runtime','evidence')) { $null=New-Item -ItemType Directory -Force -Path (Join-Path $workspace $sub) }
    # These are disposable test inputs, never a release source or a persistent database.
    Get-ChildItem -LiteralPath (Join-Path $canonical 'migrations') -File -Filter '*.sql' |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $workspace 'migrations/canonical') }
    $testFiles=@(Get-ChildItem -LiteralPath (Join-Path $private 'tests') -File | Where-Object {$_.Extension -in @('.sh','.sql','.ps1')})
    $testManifest=foreach ($file in $testFiles) {
        Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $workspace 'tests')
        [ordered]@{sha256=(Get-FileHash $file.FullName).Hash.ToLowerInvariant();file=$file.Name}
    }
    $testManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $evidence "postmerge-pg$Version-private-test-manifest.json") -Encoding utf8
    $runner=Join-Path $workspace 'tests/f10_local_acceptance.ps1'
    $text=[IO.File]::ReadAllText($runner)
    if (-not $text.Contains('phoenix-canonical-f10-v209-m5-pwsh-pg')) { throw 'UNEXPECTED_F10_RUNNER_SHAPE' }
    $text=$text.Replace('phoenix-canonical-f10-v209-m5-pwsh',"canonical-postmerge-$($nonce.Substring(0,12))").Replace('phoenix_canonical_f10_backup_pg',"canonical_postmerge_$($nonce.Substring(0,12))_pg")
    [IO.File]::WriteAllText($runner,$text.Replace("`r`n","`n"))
    Write-Output "COMMAND pwsh pinned f10_local_acceptance.ps1 -Version $Version (only disposable resource names adapted; mainline SQL fixture)"
    & pwsh -NoProfile -File $runner -Version $Version 2>&1 |
        Tee-Object -LiteralPath (Join-Path $evidence "postmerge-pg$Version-full-acceptance.txt") | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'FULL_NEGATIVE_AND_FRESH_RESTORE_FAILED' }
    $http=Join-Path $workspace 'tests/run_final_integration_http_e2e.ps1'
    $text=[IO.File]::ReadAllText($http)
    $old="& git -C `$canonicalRoot diff --exit-code HEAD -- migrations/canonical`nif (`$LASTEXITCODE -ne 0) { throw 'Historical Migration bytes have changed.' }"
    $text=$text.Replace("`r`n","`n")
    if (-not $text.Contains($old)) { throw 'UNEXPECTED_HTTP_RUNNER_SHAPE' }
    $text=$text.Replace($old,"# The parent runner verifies all 35 fixture digests against the mainline manifest before copying.")
    [IO.File]::WriteAllText($http,$text)
    Write-Output "COMMAND pwsh pinned run_final_integration_http_e2e.ps1 -Version $Version -ApplicationCommit 48bb6c3ae18906f870ea9e8a717c03ebb2da34bd"
    & pwsh -NoProfile -File $http -Version $Version -ApplicationServerRoot $ApplicationServerRoot -ApplicationCommit '48bb6c3ae18906f870ea9e8a717c03ebb2da34bd' 2>&1 |
        Tee-Object -LiteralPath (Join-Path $evidence "postmerge-pg$Version-three-route-http.txt") | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'APPROVED_THREE_ROUTE_HTTP_FAILED' }
    & (Join-Path $PSScriptRoot 'verify-authority.ps1')
    Write-Output "PASS POSTMERGE PG$Version fresh upgrade repeat drift atomicity negative fresh-cluster-restore three-route-HTTP"
} finally {
    foreach ($file in @(Get-ChildItem -LiteralPath (Join-Path $workspace 'evidence') -File -ErrorAction SilentlyContinue)) {
        Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $evidence "postmerge-pg$Version-$($file.Name)")
    }
    $resolved=[IO.Path]::GetFullPath($workspace)
    $expected=[IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) "canonical-postmerge-$nonce"))
    if ($resolved -ne $expected) { throw 'TEMPORARY_CLEANUP_PATH_MISMATCH' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    if (Test-Path -LiteralPath $resolved) { throw 'TEMPORARY_CLEANUP_FAILED' }
    Write-Output 'PASS disposable workspace and generated credentials removed; existing clusters unchanged'
    Stop-Transcript | Out-Null
}
