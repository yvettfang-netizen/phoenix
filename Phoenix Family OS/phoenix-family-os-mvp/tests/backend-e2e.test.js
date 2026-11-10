'use strict'
const assert = require('node:assert/strict')
const { createBackend } = require('../backend/server')
const calls = []
const canonicalProvider = {
  async verifySession(token) { return token === 'v'.repeat(43) ? { principalId: 'synthetic-approved' } : null },
  async saveEducationSubmission(input) {
    calls.push(input)
    return { status: 'synced', submissionId: 'synthetic-canonical-submission', receivedAt: '2026-11-10T00:00:00.000Z', duplicate: false }
  },
  async healthCheck() { return true }
}
async function run() {
  const backend = createBackend({ port: 0, canonicalProvider })
  try {
    const address = await backend.listen()
    const base = 'http://127.0.0.1:' + address.port
    const unauth = await fetch(base + '/v1/questionnaire-submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    assert.equal(unauth.status, 401)
    const rejected = await fetch(base + '/v1/questionnaire-submissions', { method: 'POST', headers: { Authorization: 'Bearer ' + 'x'.repeat(43), 'content-type': 'application/json' }, body: '{}' })
    assert.equal(rejected.status, 401)
    const ok = await fetch(base + '/v1/questionnaire-submissions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + 'v'.repeat(43), 'content-type': 'application/json' },
      body: JSON.stringify({ clientSubmissionId: 'synthetic-id', answers: { synthetic: true } })
    })
    assert.equal(ok.status, 201)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].principal.principalId, 'synthetic-approved')
    assert.equal((await ok.json()).status, 'synced')
    const health = await fetch(base + '/health')
    assert.equal((await health.json()).source, 'canonical-postgresql')
    console.log('✓ Canonical-only adapter: authorization and synthetic provider contract')
  } finally { await backend.close() }
}
run().catch(e => { console.error(e); process.exitCode = 1 })
