import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=fileURLToPath(new URL('../../../..',import.meta.url))
const sqlPath=resolve(root,'database/canonical/forward-candidates/service-workbench/0040_hk_identity_workbench.sql')
const manifestPath=resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0040-identity.json')
const sql=readFileSync(sqlPath,'utf8')
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))

assert.equal(createHash('sha256').update(sql).digest('hex').toUpperCase(),manifest.sha256)
assert.match(sql,/BEGIN;[\s\S]*ALTER TABLE service\.workbench_settings/)
assert.match(sql,/template_kind IN \('HK_MASTERS','HK_IDENTITY','GENERAL'\)/)
for(const stage of ['IDENTITY_ELIGIBILITY','IDENTITY_DOCUMENTS','IDENTITY_SUBMISSION','IDENTITY_APPOINTMENT','IDENTITY_DECISION','IDENTITY_COMPLETION']) assert.match(sql,new RegExp(stage))
assert.match(sql,/p\.primary_domain='IDENTITY'/)
assert.match(sql,/CREATE FUNCTION service\.validate_identity_workbench_template\(\)/)
assert.match(sql,/IDENTITY_TEMPLATE_DOMAIN_MISMATCH/)
assert.match(sql,/IDENTITY_TEMPLATE_STAGE_MISMATCH/)
assert.match(sql,/IDENTITY_STAGE_TEMPLATE_MISMATCH/)
assert.match(sql,/CREATE TRIGGER workbench_identity_template_guard/)
assert.match(sql,/CREATE FUNCTION service\.workbench_staging_staff_mixed_health\(p_project uuid DEFAULT NULL\)/)
assert.match(sql,/auth\.current_channel\(\)='ADVISOR'/)
assert.match(sql,/service\.project_domains/)
assert.match(sql,/GRANT EXECUTE ON FUNCTION service\.workbench_staging_staff_mixed_health\(uuid\)/)
assert.doesNotMatch(sql,/workbench_identity_template\s*\(/)
assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION service\.workbench_identity_template/)
assert.doesNotMatch(sql,/CREATE TABLE/)
assert.doesNotMatch(sql,/INSERT INTO (core|auth|service|docs|education)\./)
console.log('hk-identity-workbench-contract: PASS')
