$ErrorActionPreference = "Stop"
$target = "D:\CODEX\PhoenixNova\feishu"
if (-not (Test-Path $target)) {
  New-Item -ItemType Directory -Path $target -Force | Out-Null
}
Set-Location $target

if (-not (Test-Path ".env")) {
@"
FEISHU_APP_ID=cli_aa00204988785d10
FEISHU_APP_SECRET=
FEISHU_BITABLE_APP_TOKEN=D3MsbRiv2aZwhEsbyGjc7erFnWc
FEISHU_TABLE_ID=tblF6MwUEbFfT9WI
"@ | Set-Content ".env" -Encoding UTF8
  Write-Host "已创建 .env。请把重置后的新 App Secret 填到 FEISHU_APP_SECRET= 后面。" -ForegroundColor Yellow
} else {
  Write-Host ".env 已存在，未覆盖。" -ForegroundColor Green
}

Write-Host "接下来运行：" -ForegroundColor Cyan
Write-Host "npm install"
Write-Host "npm run test:feishu"
