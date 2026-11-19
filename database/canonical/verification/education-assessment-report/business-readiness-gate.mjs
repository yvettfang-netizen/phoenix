import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = relative => readFileSync(path.join(root, relative), 'utf8')
const json = relative => JSON.parse(read(relative))
const lf = value => value.replaceAll('\r\n', '\n')
const sha256 = value => createHash('sha256').update(value).digest('hex')

const register = json('docs/database/education-assessment-report-20261118/BUSINESS_COMPLETION_REGISTER.json')
const facts = json('docs/database/education-assessment-report-20261118/EXTERNAL_FACT_EVIDENCE_REGISTER.json')
const evidence = json('docs/database/education-assessment-report-20261118/live-evidence/LIVE_EVIDENCE_INTAKE_TEMPLATE.json')
const manifest = json('database/canonical/forward-candidates/education-assessment-report/manifest-0041-education-assessment-report.json')
const candidate = lf(read('database/canonical/forward-candidates/education-assessment-report/education_assessment_report.sql'))
const config = read('Phoenix Compass/education compass/server/src/config.ts')
const tests = read('Phoenix Compass/education compass/server/tests/domain.test.ts')
const decisions = read('Phoenix Compass/education compass/docs/OPEN_DECISIONS.md')
const acceptance = read('Phoenix Compass/education compass/docs/MVP_ACCEPTANCE.md')

assert.equal(register.overallStatus, 'HOLD')
assert.equal(register.engineeringCandidateStatus, 'PASS')
assert.equal(register.controlledBusinessUseStatus, 'HOLD')
assert.equal(register.productionStatus, 'HOLD')
assert.equal(register.businessReady, false)
assert.equal(register.productionReady, false)
assert.equal(register.formalMigrationLedger, '0037')
assert.equal(register.candidateMigration, manifest.proposedMigration)
assert.equal(register.candidateSha256Lf, sha256(candidate))
assert.deepEqual(register.requiredExternalGates, ['I-1', 'I-2', 'H-1', 'P-1'])
assert.deepEqual(register.phases.map(phase => phase.id),
  ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13'])
assert.deepEqual(register.phases.map(phase => phase.status),
  ['PASS', 'PASS', 'HOLD', 'HOLD', 'HOLD', 'HOLD', 'PASS', 'PASS', 'NOT_RUN', 'PARTIAL', 'NOT_RUN', 'NOT_RUN', 'NOT_RUN', 'NOT_RUN'])

assert.equal(facts.overallStatus, 'HOLD')
assert.deepEqual(facts.gates.map(gate => gate.id), register.requiredExternalGates)
assert(facts.gates.every(gate => gate.externalFactStatus === 'HOLD' && gate.evidenceRefs.length === 0))
assert.equal(evidence.status, 'HOLD')
assert.equal(evidence.promotionDecision.status, 'HOLD')
assert(evidence.gates.every(gate => gate.status === 'HOLD'))

assert.equal(manifest.status, 'FORWARD_CANDIDATE_ONLY')
assert.deepEqual(manifest.deployment, {
  mainMigrationLedger: false,
  tencentNonProduction: false,
  production: false
})
assert.match(candidate, /p_product='EDUCATION_GROWTH_DISCOVERY_SINGLE_V1' AND p_amount=3990 AND p_currency='CNY'/)
assert.match(candidate, /REVOKE ALL ON ALL TABLES IN SCHEMA education_compass FROM PUBLIC;/)
assert.match(candidate, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA education_compass FROM PUBLIC;/)

assert.match(config, /booleanSetting\(env\.PAID_COMPASS_ENABLED, false, 'PAID_COMPASS_ENABLED'\)/)
assert.match(config, /booleanSetting\(env\.OPENAI_AGENT_ENABLED, false, 'OPENAI_AGENT_ENABLED'\)/)
assert.match(config, /booleanSetting\(env\.AI_WORKER_ENABLED, false, 'AI_WORKER_ENABLED'\)/)
assert.match(tests, /a trusted in-flight payment remains deliverable after the purchase switch and source catalog close/)
assert.match(tests, /concurrent duplicate order creation is idempotent and membership SKU cannot unlock a report/)
assert.match(tests, /report QA rejects every prohibited admissions promise phrase/)

assert.match(decisions, /PAID_COMPASS_ENABLED=false/)
assert.match(decisions, /OPENAI_AGENT_ENABLED=false/)
for (const decision of ['OD-01', 'OD-02', 'OD-03', 'OD-04', 'OD-05', 'OD-06', 'OD-12', 'OD-15']) {
  assert.match(decisions, new RegExp(`\\| ${decision} \\| P0 \\|`))
}
const openTestGapEntries = acceptance
  .split(/\r?\n/u)
  .filter((line) => /^\s*- `\[ \] test-gap`/u.test(line))
  .filter((line) => !line.includes('当前代码有相应边界'))
assert.deepEqual(openTestGapEntries, [])
assert.match(acceptance, /当前最终判定：\*\*不允许生产开启购买或OpenAI Agent/)

console.log('PASS engineering candidate controls, product invariants and PG acceptance prerequisites are pinned')
console.log('PASS stale automated test gaps are closed by direct regression evidence')
console.log('CONTROLLED_BUSINESS_USE=HOLD external gates=I-1,I-2,H-1,P-1')
console.log('PRODUCTION_READY=HOLD P0 decisions, UAT, operational rehearsal and Founder go/no-go remain open')
