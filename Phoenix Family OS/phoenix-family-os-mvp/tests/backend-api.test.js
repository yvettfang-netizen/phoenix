'use strict'
const assert = require('node:assert/strict')
const memory = new Map()
const requests = []
let origin = null
global.wx = {
  getExtConfigSync: () => origin ? { phoenixCanonicalApiOrigin: origin } : {},
  getStorageSync: k => memory.get(k),
  setStorageSync: (k,v) => memory.set(k,v),
  removeStorageSync: k => memory.delete(k),
  request(input) {
    requests.push(input)
    input.success({ statusCode: 201, data: { status: 'synced', submissionId: 'synthetic-canonical-id', receivedAt: '2026-11-10T00:00:00.000Z' } })
  }
}
const { submitQuestionnaire, SESSION_KEY, clearSession } = require('../services/backend-api')
async function run() {
  await assert.rejects(submitQuestionnaire({}), e => e.code === 'canonical_not_configured')
  origin = 'https://canonical.example.invalid'
  await assert.rejects(submitQuestionnaire({}), e => e.code === 'canonical_sign_in_required')
  memory.set(SESSION_KEY, { token: 'v'.repeat(43), expiresAt: '2099-01-01T00:00:00.000Z' })
  const result = await submitQuestionnaire({ clientSubmissionId: 'synthetic' })
  assert.equal(result.status, 'synced')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, origin + '/v1/questionnaire-submissions')
  assert.equal(requests[0].header.Authorization, 'Bearer ' + 'v'.repeat(43))
  assert(!requests.some(r => /demo\/sessions|127\.0\.0\.1/.test(r.url)))
  clearSession()
  assert(!memory.has(SESSION_KEY))
  console.log('✓ Mini program requires trusted Canonical session; no local demo token minting')
}
run().catch(e => { console.error(e); process.exitCode = 1 })
