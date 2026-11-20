import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The 0042 source guard checks checkout line endings on its JavaScript files;
// Windows Git may expand those files. Verify the immutable SQL hashes here.
await import('../v0037/verify-source.mjs')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (name) => readFileSync(path.join(root, name))
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')
const candidate = 'database/canonical/forward-candidates/task-handoff/0043_scoped_task_handoff.sql'
const manifest = JSON.parse(read('database/canonical/forward-candidates/task-handoff/manifest-0043-task-handoff.json'))
const parentManifest = JSON.parse(read('database/canonical/forward-candidates/workspace-authorization/manifest-0042-workspace-authorization.json'))
const sqlBuffer = read(candidate)
const sql = sqlBuffer.toString('utf8')

assert.equal(manifest.state, 'ISOLATED_FORWARD_CANDIDATE_NOT_MERGE_OR_RUNTIME_APPROVAL')
assert.equal(manifest.candidate_number, '0043')
assert.equal(manifest.sha256, hash(sqlBuffer))
assert.equal(manifest.requires_sha256,
  hash(read('database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql')))
assert.equal(manifest.requires_sha256, parentManifest.sha256)
assert.equal(parentManifest.historical_migrations, 37)
assert.equal(manifest.historical_migrations, 37)
assert.equal(manifest.isolated_ledger_rows, 39)
assert.equal(manifest.isolated_tables, 102)
assert.equal(manifest.isolated_policies_all_schemas, 92)
assert(!sqlBuffer.includes(13), 'Candidate SQL must use LF')
assert(sql.startsWith('BEGIN;\n'))
assert(sql.trimEnd().endsWith('\nCOMMIT;'))
assert.equal((sql.match(/^CREATE TABLE /gm) ?? []).length, 2)
assert.equal((sql.match(/^CREATE POLICY /gm) ?? []).length, 2)
for (const token of [
  'FORCE ROW LEVEL SECURITY', 'TASK_RESPONSIBILITY_ONLY',
  'service.task_handoff_party_is_current', 'service.propose_task_handoff',
  'service.accept_task_handoff', 'service.decline_task_handoff',
  'service.read_task_handoff_inbox',
  'auth.workspace_context_is_live()', 'TASK_HANDOFF_IDEMPOTENT_REPLAY'
]) assert(sql.includes(token), token)
assert(!sql.includes('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA service'))
assert(!/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?/i.test(sql))
assert(!/(?:1\.12\.77\.180|POSTGRES_PASSWORD|PGPASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY)/.test(sql))

console.log(`PASS 0043 source guard sha256=${manifest.sha256} parent=0042 historical=37`)
