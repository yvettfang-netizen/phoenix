$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..\..')).Path
Set-Location -LiteralPath $repo

function Probe($label, $pattern, $target) {
  Write-Output "COMMAND rg -n '$pattern' $target"
  rg -n $pattern $target -g '*.sql'
  Write-Output "RG_EXIT=$LASTEXITCODE"
}

Probe 'principal identity' 'person_id uuid NOT NULL UNIQUE|CREATE TABLE auth\.principals|CREATE TABLE core\.(people|families|student_profiles)' 'database/canonical/migrations'
Probe 'learning structure' 'CREATE TABLE learning\.(teacher|class|enrollment|schedule_slot|attendance_record)|room_label text|EXCLUDE USING gist|CREATE FUNCTION learning\.(create_schedule_slot|place_enrollment_in_class|can_read_sensitive|teacher_has_class_access)' 'database/canonical/migrations/0022_learning_core.sql'
Probe 'academy missing schema' 'CREATE TABLE (education\.study_enrollments|learning\.(room|lesson_package|assessment_instrument|slot_booking))' 'database/canonical/migrations'
Probe 'assessment baseline and absent instrument governance' 'CREATE TABLE (education\.(score_record|language_test)|learning\.stage_report)|instrument_code|CAT4|IELTS|JLPT|CANTONESE' 'database/canonical/migrations'
Probe 'consent and learning roles' 'CREATE FUNCTION learning\.(read_published_card|read_published_stage_report)|REVOKE ALL ON ALL TABLES IN SCHEMA learning|GRANT EXECUTE ON FUNCTION learning|CREATE OR REPLACE FUNCTION auth\.validate_context_request' 'database/canonical/migrations/0022_learning_core.sql'

Write-Output "COMMAND rg -n 'v1/learning|canonical/|academic-studio' Phoenix Compass/education compass/server/src/http/app.ts"
rg -n 'v1/learning|canonical/|academic-studio' 'Phoenix Compass/education compass/server/src/http/app.ts'
Write-Output "RG_EXIT=$LASTEXITCODE"

Write-Output 'COMMAND git show origin/pr-77-head:.../0042_organization_workspace_authorization.sql | rg -n session/context declarations'
git show 'origin/pr-77-head:database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql' |
  rg -n 'CREATE TABLE auth\.workspace_sessions|ADD COLUMN workspace_session_id|CREATE FUNCTION auth\.(rotate_workspace_session|issue_workspace_context_ticket|redeem_workspace_context_ticket|clear_workspace_context)'
Write-Output "RG_EXIT=$LASTEXITCODE"
