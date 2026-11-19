import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const templatePath = path.join(root,
  'docs/database/education-assessment-report-20261118/live-evidence/LIVE_EVIDENCE_INTAKE_TEMPLATE.json')
const factsPath = path.join(root,
  'docs/database/education-assessment-report-20261118/EXTERNAL_FACT_EVIDENCE_REGISTER.json')
const manifestPath = path.join(root,
  'database/canonical/forward-candidates/education-assessment-report/manifest-0041-education-assessment-report.json')

const readJson = file => JSON.parse(readFileSync(file, 'utf8'))
const facts = readJson(factsPath)
const manifest = readJson(manifestPath)
const exactKeys = (value, expected, label) => {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} contains missing or unexpected fields`)
}
const clone = value => structuredClone(value)
const sha256Pattern = /^[a-f0-9]{64}$/
const commitPattern = /^[a-f0-9]{40}$/
const forbiddenValuePattern = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]+|postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b)/i
const placeholderPattern = /(?:^|[\s/_-])(todo|tbd|placeholder|example|synthetic|replace[-_ ]?me)(?:$|[\s/_-])/i

function assertUtc(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a UTC timestamp`)
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/, `${label} must be RFC3339 UTC`)
  assert.equal(Number.isNaN(Date.parse(value)), false, `${label} is not a valid timestamp`)
}

function assertHttpsRef(value, label, { allowTest = false } = {}) {
  assert.equal(typeof value, 'string', `${label} must be an HTTPS reference`)
  const url = new URL(value)
  assert.equal(url.protocol, 'https:', `${label} must use HTTPS`)
  assert.equal(url.username, '', `${label} must not include embedded credentials`)
  assert.equal(url.password, '', `${label} must not include embedded credentials`)
  assert.equal(url.search, '', `${label} must not include query parameters or tokens`)
  if (!allowTest) {
    assert.equal(url.hostname.endsWith('.invalid'), false, `${label} cannot use a test-only host`)
    assert.equal(placeholderPattern.test(value), false, `${label} contains a placeholder value`)
  }
}

function validateShape(packet) {
  exactKeys(packet,
    ['packetVersion', 'status', 'testOnly', 'candidate', 'target', 'gates', 'promotionDecision'], 'packet')
  assert.equal(packet.packetVersion, 'education-live-integration-evidence.v1')
  assert.equal(typeof packet.testOnly, 'boolean')
  assert(['HOLD', 'PASS'].includes(packet.status), 'packet status must be HOLD or PASS')

  exactKeys(packet.candidate, ['proposedMigration', 'sourceSha256Lf'], 'candidate')
  assert.equal(packet.candidate.proposedMigration, manifest.proposedMigration)
  assert.equal(packet.candidate.sourceSha256Lf, manifest.sourceSha256Lf)

  exactKeys(packet.target, ['environment', 'runtimeCommitSha', 'serviceBindingRef'], 'target')
  assert.equal(packet.target.environment, 'controlled-nonproduction')
  assert(Array.isArray(packet.gates), 'gates must be an array')
  assert.deepEqual(packet.gates.map(gate => gate.id), facts.gates.map(gate => gate.id))

  for (const [index, gate] of packet.gates.entries()) {
    const source = facts.gates[index]
    exactKeys(gate,
      ['id', 'status', 'observedAtUtc', 'reviewer', 'reportSha256', 'evidenceRefs', 'containsSecretsOrRealIdentifiers'],
      `gate ${gate.id}`)
    assert(['HOLD', 'PASS'].includes(gate.status), `${gate.id} status must be HOLD or PASS`)
    assert.equal(gate.containsSecretsOrRealIdentifiers, false, `${gate.id} must not contain secrets or real identifiers`)
    exactKeys(gate.evidenceRefs, source.requiredReferences, `${gate.id} evidenceRefs`)
  }

  exactKeys(packet.promotionDecision,
    ['status', 'finalMigration', 'targetEnvironment', 'approvedBy', 'approvedAtUtc', 'approvalRef'],
    'promotionDecision')
  assert(['HOLD', 'PASS'].includes(packet.promotionDecision.status))
  assert.equal(forbiddenValuePattern.test(JSON.stringify(packet)), false,
    'packet contains credential or private-key material')
}

function validateTemplate(packet) {
  validateShape(packet)
  assert.equal(packet.status, 'HOLD')
  assert.equal(packet.testOnly, false)
  assert.equal(packet.target.runtimeCommitSha, null)
  assert.equal(packet.target.serviceBindingRef, null)
  for (const gate of packet.gates) {
    assert.equal(gate.status, 'HOLD')
    assert.equal(gate.observedAtUtc, null)
    assert.equal(gate.reviewer, null)
    assert.equal(gate.reportSha256, null)
    assert(Object.values(gate.evidenceRefs).every(value => value === null))
  }
  assert.deepEqual(packet.promotionDecision, {
    status: 'HOLD',
    finalMigration: null,
    targetEnvironment: null,
    approvedBy: null,
    approvedAtUtc: null,
    approvalRef: null
  })
}

function validatePromotion(packet, { allowTest = false } = {}) {
  validateShape(packet)
  assert.equal(packet.status, 'PASS')
  assert.equal(packet.testOnly, allowTest, allowTest
    ? 'self-test packet must be testOnly'
    : 'test-only evidence cannot satisfy promotion')
  assert.match(packet.target.runtimeCommitSha, commitPattern, 'runtime commit must be a 40 character SHA')
  assertHttpsRef(packet.target.serviceBindingRef, 'serviceBindingRef', { allowTest })

  for (const gate of packet.gates) {
    assert.equal(gate.status, 'PASS', `${gate.id} remains HOLD`)
    assertUtc(gate.observedAtUtc, `${gate.id}.observedAtUtc`)
    assert.equal(typeof gate.reviewer, 'string', `${gate.id}.reviewer is required`)
    assert(gate.reviewer.trim().length >= 3, `${gate.id}.reviewer is required`)
    if (!allowTest) assert.equal(placeholderPattern.test(gate.reviewer), false, `${gate.id}.reviewer is a placeholder`)
    assert.match(gate.reportSha256, sha256Pattern, `${gate.id}.reportSha256 must be SHA-256`)
    for (const [key, value] of Object.entries(gate.evidenceRefs)) {
      assertHttpsRef(value, `${gate.id}.${key}`, { allowTest })
    }
  }

  const decision = packet.promotionDecision
  assert.equal(decision.status, 'PASS', 'Founder promotion decision remains HOLD')
  assert.equal(decision.finalMigration, manifest.proposedMigration)
  assert.equal(decision.targetEnvironment, 'controlled-nonproduction')
  assert.equal(typeof decision.approvedBy, 'string')
  assert(decision.approvedBy.trim().length >= 3, 'approvedBy is required')
  if (!allowTest) assert.equal(placeholderPattern.test(decision.approvedBy), false, 'approvedBy is a placeholder')
  assertUtc(decision.approvedAtUtc, 'promotionDecision.approvedAtUtc')
  assertHttpsRef(decision.approvalRef, 'promotionDecision.approvalRef', { allowTest })
}

function makeSelfTestPacket(template) {
  const packet = clone(template)
  packet.status = 'PASS'
  packet.testOnly = true
  packet.target.runtimeCommitSha = '1'.repeat(40)
  packet.target.serviceBindingRef = 'https://receipts.invalid/service-binding'
  for (const gate of packet.gates) {
    gate.status = 'PASS'
    gate.observedAtUtc = '2026-11-19T00:00:00Z'
    gate.reviewer = 'validator-self-test'
    gate.reportSha256 = '2'.repeat(64)
    for (const key of Object.keys(gate.evidenceRefs)) {
      gate.evidenceRefs[key] = `https://receipts.invalid/${gate.id.toLowerCase()}/${key}`
    }
  }
  packet.promotionDecision = {
    status: 'PASS',
    finalMigration: manifest.proposedMigration,
    targetEnvironment: 'controlled-nonproduction',
    approvedBy: 'validator-self-test',
    approvedAtUtc: '2026-11-19T00:00:00Z',
    approvalRef: 'https://receipts.invalid/founder-decision'
  }
  return packet
}

function runSelfTest() {
  const template = readJson(templatePath)
  validateTemplate(template)
  const testPacket = makeSelfTestPacket(template)
  validatePromotion(testPacket, { allowTest: true })
  assert.throws(() => validatePromotion(testPacket), /test-only evidence/)

  const missingGate = clone(testPacket)
  missingGate.gates.pop()
  assert.throws(() => validatePromotion(missingGate, { allowTest: true }))

  const wrongDigest = clone(testPacket)
  wrongDigest.candidate.sourceSha256Lf = '3'.repeat(64)
  assert.throws(() => validatePromotion(wrongDigest, { allowTest: true }))

  const leakedCredential = clone(testPacket)
  leakedCredential.gates[0].reviewer = 'Bearer abcdefghijklmnopqrstuvwxyz'
  assert.throws(() => validatePromotion(leakedCredential, { allowTest: true }), /credential/)

  const nonHttps = clone(testPacket)
  nonHttps.gates[0].evidenceRefs.provider_session_validation_ref = 'http://receipts.invalid/provider'
  assert.throws(() => validatePromotion(nonHttps, { allowTest: true }), /HTTPS/)
}

const [mode, file] = process.argv.slice(2)
if (mode === '--template' && file === undefined) {
  validateTemplate(readJson(templatePath))
  console.log('PASS live evidence template is structurally complete and remains fail-closed HOLD')
  console.log('PROMOTION_FACTS=HOLD')
} else if (mode === '--self-test' && file === undefined) {
  runSelfTest()
  console.log('PASS evidence gate self-tests: complete test packet accepted only in test mode')
  console.log('PASS missing gate, wrong digest, credential material and non-HTTPS reference are rejected')
  console.log('PROMOTION_FACTS=HOLD')
} else if (mode === '--promotion' && file !== undefined) {
  validatePromotion(readJson(path.resolve(file)))
  console.log('PROMOTION_FACTS=PASS')
} else {
  throw new Error('usage: live-evidence-gate.mjs --template | --self-test | --promotion <packet.json>')
}
