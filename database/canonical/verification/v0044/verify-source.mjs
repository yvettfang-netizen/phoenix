import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

await import('../v0042/verify-source.mjs')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (name) => readFileSync(path.join(root, name))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const folder = 'database/canonical/forward-candidates/study-lifecycle/'
const manifest = JSON.parse(read(`${folder}manifest-0044-study-review.json`))
const sql = read(`${folder}${manifest.candidate_file}`)
assert.equal(manifest.state, 'ISOLATED_FORWARD_CANDIDATE_NOT_MERGE_OR_RUNTIME_APPROVAL')
assert.equal(manifest.candidate_number, '0044')
assert.equal(manifest.sha256, hash(sql))
assert.equal(manifest.requires_sha256,
  hash(read('database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql')))
assert.equal(manifest.historical_migrations, 37)
assert.equal(manifest.isolated_ledger_rows, 39)
assert.equal(manifest.isolated_tables, 100)
assert.equal(manifest.isolated_policies_all_schemas, 90)
assert(!sql.includes(13), 'Candidate SQL must use LF')
const source = sql.toString('utf8')
assert(source.startsWith('BEGIN;\n'))
assert(source.trimEnd().endsWith('COMMIT;'))
assert.equal((source.match(/^CREATE TABLE /gm) ?? []).length, 2)
assert.equal((source.match(/^CREATE POLICY /gm) ?? []).length, 2)
for (const required of [
  'FORCE ROW LEVEL SECURITY', 'SOURCE_REVIEW_REQUIRED', 'REVIEW_REQUIRED',
  'FOR SHARE', 'AS RESTRICTIVE FOR ALL', 'USING (false) WITH CHECK (false)',
  'UNIQUE (study_enrollment_id,journey_cycle_id,rule_key)',
  'study_enrollments_source_identity_unique', 'source_system',
  'source_version', 'source_payload_sha256', 'record_study_enrollment_review',
  'SOURCE_REPLAY_IDENTICAL', 'SOURCE_CONFLICT_REVIEW_REQUIRED',
  'STUDY_MEMBER_NOT_CURRENT', 'STUDY_PROGRAM_MISMATCH'
]) assert(source.includes(required), required)
assert(!/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+/i.test(source))
assert(!/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+education\.record_study_enrollment_review/i.test(source))
assert(!/(?:POSTGRES_PASSWORD|PGPASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY)/.test(source))
console.log(`PASS 0044 source guard sha256=${manifest.sha256} parent=0042 historical=37 no-DB02`)
