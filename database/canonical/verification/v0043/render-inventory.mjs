import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const input = process.argv[2]
const output = process.argv[3]
assert(input && output, 'Usage: node render-inventory.mjs catalog.json TABLE_REUSE_MATRIX.md')
const catalog = JSON.parse(readFileSync(input, 'utf8'))
assert.equal(catalog.tables.length, 102)
assert.equal(catalog.ledger.length, 39)
const candidate0042 = new Set([
  'core.organization_workspace_profiles', 'core.organization_memberships',
  'auth.workspace_role_bindings', 'auth.workspace_sessions',
  'auth.workspace_context_tickets', 'auth.workspace_session_contexts',
  'service.project_assignment_organization_scopes'
])
const candidate0043 = new Set([
  'service.task_handoff_requests', 'service.task_handoff_events'
])
function action(name) {
  if (candidate0043.has(name)) return 'New: 0043 isolation candidate'
  if (candidate0042.has(name)) return 'New: 0042 dependency candidate'
  if (name === 'crm.follow_ups') return 'Reuse; DB-03 lifecycle extension under review'
  if (name === 'docs.documents' || name === 'docs.document_versions') {
    return 'Reuse; DB-04 cross-project rules under review'
  }
  return 'Reuse unchanged in DB-02; broader business fit not asserted'
}
const lines = [
  '# Canonical V3.1 Table Reuse Matrix — DB-02 candidate',
  '',
  'Generated from the actual PostgreSQL catalog of a disposable synthetic PG16 cluster.',
  'It contains formal 0001–0037 plus isolated 0042 and 0043; it is **not** a live,',
  'nonproduction, or production deployment inventory. PG17 catalog is verified separately.',
  'Status “Reuse” means DB-02 does not alter that table, not that every future flow is approved.',
  '',
  `Candidate SHA-256: \`${catalog.candidateSha256}\`.`,
  `Measured: ${catalog.counts.tables} tables, ${catalog.counts.functions} functions, ${catalog.counts.policies} policies, ${catalog.counts.rlsForced} FORCE RLS tables.`,
  '',
  '| Table | PK | Columns | FK | UNIQUE | Indexes | RLS | Policies | Existing → action |',
  '|---|---|---:|---:|---:|---:|---|---:|---|'
]
for (const table of catalog.tables) {
  const name = `${table.schema_name}.${table.table_name}`
  const pk = table.constraints?.find((item) => item.type === 'p')?.name ?? 'none'
  const fk = table.constraints?.filter((item) => item.type === 'f').length ?? 0
  const unique = table.constraints?.filter((item) => item.type === 'u').length ?? 0
  lines.push(`| \`${name}\` | \`${pk}\` | ${table.columns?.length ?? 0} | ${fk} | ${unique} | ${table.indexes?.length ?? 0} | ${table.rls_enabled ? (table.rls_forced ? 'FORCE' : 'ON') : 'OFF'} | ${table.policies?.length ?? 0} | ${action(name)} |`)
}
lines.push('',
  'No existing table is marked Deprecated. Retirement requires a separate proven replacement.',
  'Proposed DB-03 `education.study_enrollments` and lifecycle occurrence storage, DB-04',
  'document reuse and AI review, and DB-05 learning evidence are not installed by 0043.', '')
writeFileSync(path.resolve(output), lines.join('\n'))
console.log(`PASS rendered ${catalog.tables.length} table rows to ${output}`)
