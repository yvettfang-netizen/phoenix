$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..\..')).Path
Set-Location -LiteralPath $repo

Write-Output 'COMMAND gh api repos/yvettfang-netizen/phoenix/commits/main --jq .sha'
gh api repos/yvettfang-netizen/phoenix/commits/main --jq .sha
foreach ($number in @(76, 77, 83)) {
  Write-Output "COMMAND gh pr view $number --repo yvettfang-netizen/phoenix --json headRefOid,baseRefOid,isDraft,url"
  gh pr view $number --repo yvettfang-netizen/phoenix --json headRefOid,baseRefOid,isDraft,url
  Write-Output "COMMAND gh pr checks $number --repo yvettfang-netizen/phoenix"
  gh pr checks $number --repo yvettfang-netizen/phoenix
  Write-Output "CHECKS_EXIT=$LASTEXITCODE"
}

$reviewSha = '80cbf0d98b346f12587568689196e07a8f6e481e'
Write-Output "COMMAND git show ${reviewSha}:<path> | SHA-256 (fixed PR83 baseline)"
$paths = @(
  'database/canonical/migrations/0003_core_consent_access.sql',
  'database/canonical/migrations/0007_security_boundary_fixes.sql',
  'database/canonical/migrations/0008_expiry_and_ephemeral_cleanup.sql',
  'database/canonical/migrations/0009_application_write_api.sql',
  'database/canonical/migrations/0012_service_principal_and_context.sql',
  'database/canonical/migrations/0018_advisor_session_scope_and_binder_hardening.sql',
  'database/canonical/migrations/0019_education_master_and_records.sql',
  'database/canonical/migrations/0022_learning_core.sql',
  'database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql',
  'docs/architecture/academic-studio-v21-p0-20261120/FOUNDER_DECISIONS.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_IDENTITY_CONTRACT.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_SHARED_RESOURCE_CONTRACT.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_ASSESSMENT_CONTRACT.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_COMMERCIAL_OPTIONS_HOLD.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_MIGRATION_IMPACT_AND_NEGATIVE_TESTS.md',
  'docs/architecture/academic-studio-v21-p0-20261120/P0_1_GATE_PLAN.md'
)
foreach ($item in $paths) {
  $hash = node -e "const{spawnSync}=require('child_process');const{createHash}=require('crypto');const r=spawnSync('git',['show',process.argv[1]+':'+process.argv[2]]);if(r.status!==0)process.exit(r.status);console.log(createHash('sha256').update(r.stdout).digest('hex'))" $reviewSha $item
  if ($LASTEXITCODE -ne 0) { throw "Missing fixed baseline blob: $item" }
  Write-Output "$hash  $item"
}

Write-Output 'COMMAND candidate 0042 SHA-256 from fixed PR77 Git blob'
node -e "const{spawnSync}=require('child_process');const{createHash}=require('crypto');const p='380fec99da5151fd28b8a5d3a2acaaa7292d3c23:database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql';const r=spawnSync('git',['show',p]);if(r.status!==0)process.exit(r.status);console.log(createHash('sha256').update(r.stdout).digest('hex')+'  '+p)"
Write-Output 'COMMAND git status --short and formal migration count'
git status --short
(rg --files database/canonical/migrations -g '*.sql' | Measure-Object).Count
