param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$expected = @{}
$manifest = Join-Path $root '../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md'
foreach ($line in Get-Content -LiteralPath $manifest) {
    if ($line -match '^\| ([0-9]{4}) \| `([0-9a-f]{64})` \|$') { $expected[$Matches[1]]=$Matches[2] }
}
$files = @(Get-ChildItem -LiteralPath (Join-Path $root 'migrations') -File -Filter '*.sql' | Sort-Object Name)
if ($expected.Count -ne 35 -or $files.Count -ne 35) { throw 'INVENTORY_NOT_35' }
$rows = for ($index=0; $index -lt 35; $index++) {
    $number = '{0:D4}' -f ($index+1)
    $hash = (Get-FileHash -LiteralPath $files[$index].FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if (-not $files[$index].Name.StartsWith("${number}_") -or $hash -ne $expected[$number]) { throw "HISTORICAL_MIGRATION_DRIFT: $number" }
    [ordered]@{number=$number;sha256=$hash;file=$files[$index].Name}
}
$result = [ordered]@{baseline='9355d28667ee9cf4761b4abcdaf959f0ad154820';matched=35;status='PASS';migrations=@($rows)}
if ($OutputPath) { $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8 }
Write-Output 'PASS immutable 0001-0035: 35/35 SHA-256 match reviewed manifest; no runtime change'
