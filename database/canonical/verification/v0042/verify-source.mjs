import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const read = (value) => readFileSync(path.join(root,value))
await import('../v0037/verify-source.mjs')

const directory = path.join(root,'database/canonical/migrations')
const historical = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()
assert.equal(historical.length,37)
assert.equal(historical.at(-1),'0037_scoped_public_id_projection_read_audit.sql')

const candidateRelative = 'database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql'
const manifestRelative = 'database/canonical/forward-candidates/workspace-authorization/manifest-0042-workspace-authorization.json'
const candidate = read(candidateRelative)
const sql = candidate.toString('utf8')
const manifest = JSON.parse(read(manifestRelative))
assert.equal(manifest.candidate_number,'0042')
assert.equal(manifest.historical_migrations,37)
assert.equal(manifest.sha256,hash(candidate))
assert.equal(manifest.isolated_ledger_rows,38)
assert.equal(manifest.isolated_tables,98)
assert.equal(manifest.isolated_policies_including_auth,88)
assert.deepEqual(manifest.reserved_candidates.map((item) => item.number),['0038','0039','0040','0041'])
assert.equal(candidate.includes(13),false)
assert(sql.startsWith('BEGIN;\n'))
assert(sql.trimEnd().endsWith('\nCOMMIT;'))
assert.equal((sql.match(/^CREATE TABLE /gm) ?? []).length,5)
assert.equal((sql.match(/^CREATE POLICY /gm) ?? []).length,5)
for (const table of [
  'core.organization_workspace_profiles','core.organization_memberships',
  'auth.workspace_role_bindings','auth.workspace_sessions',
  'service.project_assignment_organization_scopes'
]) assert(sql.includes(`CREATE TABLE ${table} (`),table)
for (const token of [
  'FORCE ROW LEVEL SECURITY','REVOKE ALL ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC',
  'auth.rotate_workspace_session','auth.issue_workspace_context_ticket',
  'auth.redeem_workspace_context_ticket','service.read_staff_workspace_projects',
  'ALTER TABLE auth.context_exchange_tickets','ALTER TABLE auth.session_contexts',
  'workspace_session_id=NULL','workspace_binding_id=NULL','workspace_session_id IS NULL',
  'pg_stat_activity','backend_start'
]) assert(sql.includes(token),token)
assert(!sql.includes('CREATE TABLE auth.workspace_context_tickets'))
assert(!sql.includes('CREATE TABLE auth.workspace_session_contexts'))
assert(!/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?/i.test(sql))
assert(!/(?:1\.12\.77\.180|POSTGRES_PASSWORD|PGPASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY)/.test(sql))

const service = read('Phoenix Compass/education compass/server/src/services/canonical-workspace-access.ts').toString('utf8')
const app = read('Phoenix Compass/education compass/server/src/http/app.ts').toString('utf8')
const index = read('Phoenix Compass/education compass/server/src/index.ts').toString('utf8')
for (const route of ['/v1/me/workspaces','/v1/workspace-contexts','/v1/staff/projects']) {
  assert(service.includes(route) || app.includes(route),route)
}
for (const rejected of ['x-role','x-organization-id','x-family-id','x-principal-id']) assert(service.includes(rejected),rejected)
assert(service.includes('HttpOnly; Secure; SameSite=Strict'))
assert(service.includes('timingSafeEqual'))
assert(service.includes('DISCARD ALL'))
assert(app.includes('workspaceAccess?: CanonicalWorkspaceAccess'))
assert(!index.includes('canonical-workspace-access'),'workspace access must remain explicitly composed and default off')

for (const relative of [
  candidateRelative,manifestRelative,
  'database/canonical/verification/v0042/cluster.mjs',
  'database/canonical/verification/v0042/fixtures.mjs',
  'database/canonical/verification/v0042/runtime.mjs',
  'database/canonical/verification/v0042/acceptance.mjs',
  'Phoenix Compass/education compass/server/src/services/canonical-workspace-access.ts',
  'Phoenix Compass/education compass/server/tests/canonical-workspace-access.test.ts'
]) assert.equal(read(relative).includes(13),false,`${relative} must use LF`)

console.log(`PASS 0042 source guard sha256=${manifest.sha256} historical=37 reserved=0038-0041 default=OFF`)
