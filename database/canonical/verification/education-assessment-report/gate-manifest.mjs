import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const candidatePath = path.join(root,
  'database/canonical/forward-candidates/education-assessment-report/education_assessment_report.sql')
const manifestPath = path.join(root,
  'database/canonical/forward-candidates/education-assessment-report/manifest-0041-education-assessment-report.json')
const factsPath = path.join(root,
  'docs/database/education-assessment-report-20261118/EXTERNAL_FACT_EVIDENCE_REGISTER.json')
const runtimePath = path.join(root,
  'Phoenix Compass/education compass/server/src/services/canonical-education-runtime.ts')
const handlerPath = path.join(root,
  'Phoenix Compass/education compass/server/src/http/app.ts')

const read = file => readFileSync(file, 'utf8')
const json = file => JSON.parse(read(file))
const lf = value => value.replaceAll('\r\n', '\n')
const sha256 = value => createHash('sha256').update(value).digest('hex')

const migrations = readdirSync(path.join(root, 'database/canonical/migrations'))
  .filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()
assert.equal(migrations.length, 37)
assert.match(migrations.at(-1), /^0037_/)
assert.equal(migrations.some(name => /^00(?:38|39|40|41)_/.test(name)), false)

const manifest = json(manifestPath)
const candidate = lf(read(candidatePath))
assert.equal(manifest.status, 'FORWARD_CANDIDATE_ONLY')
assert.equal(manifest.proposedMigration, '0041')
assert.equal(manifest.activePredecessor, '0037')
assert.equal(manifest.activeLedgerExpected, 37)
assert.equal(manifest.sourceSha256Lf, sha256(candidate))
assert.deepEqual(manifest.reservationEvidence.map(item => item.migration), ['0038', '0039', '0040'])
assert.deepEqual(manifest.deployment, {
  mainMigrationLedger: false,
  tencentNonProduction: false,
  production: false
})

assert.match(candidate, /current_setting\('phoenix\.education_compass_candidate',true\) IS DISTINCT FROM 'isolated'/)
assert.match(candidate, /REVOKE ALL ON ALL TABLES IN SCHEMA education_compass FROM PUBLIC;/)
assert.match(candidate, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA education_compass FROM PUBLIC;/)
const definers = candidate.match(/SECURITY DEFINER/g) ?? []
const pinnedDefiners = candidate.match(/SECURITY DEFINER SET search_path=pg_catalog,pg_temp/g) ?? []
assert(definers.length > 0)
assert.equal(pinnedDefiners.length, definers.length)
assert.doesNotMatch(candidate, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)[\s\S]{0,160}\bTO\s+phoenix_education_compass_(?:app|publisher|settlement)\b/i)

const runtime = read(runtimePath)
assert.match(runtime, /env\.NODE_ENV !== 'test'/)
assert.match(runtime, /env\.DATABASE_URL !== undefined/)
assert.match(runtime, /env\.CANONICAL_BROKER_SESSION_BRIDGE_ENABLED === 'true'/)
assert.match(runtime, /env\.CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED !== 'true'/)
assert.match(runtime, /const host = '127\.0\.0\.1'/)

const handler = read(handlerPath)
assert.match(handler, /CANONICAL_CONTRACT_HOLD/)
assert.match(handler, /'x-family-id','x-principal-id','x-role','x-channel','x-source-system'/)

const facts = json(factsPath)
assert.equal(facts.overallStatus, 'HOLD')
assert.deepEqual(facts.gates.map(gate => gate.id), ['I-1', 'I-2', 'H-1', 'P-1'])
for (const gate of facts.gates) {
  assert.equal(gate.mechanismStatus, 'PASS')
  assert.equal(gate.externalFactStatus, 'HOLD')
  assert.deepEqual(gate.evidenceRefs, [])
  assert.equal(gate.containsSecretsOrRealIdentifiers, false)
  assert(gate.requiredReferences.length > 0)
}

console.log('PASS active ledger=37 latest=0037; proposed Education candidate=0041 only')
console.log('PASS candidate LF SHA-256=' + manifest.sourceSha256Lf)
console.log('PASS isolation, PUBLIC revoke, pinned SECURITY DEFINER and default-off runtime gates')
console.log('PASS external fact gates I-1/I-2/H-1/P-1 remain explicit HOLD with no fabricated evidence')
