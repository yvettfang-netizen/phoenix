import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import {
  createPrivateStagingAuthority,
  createPrivateStagingResolver,
  privateStagingProjectSafetyGuard,
  privateStagingReadiness,
  readPrivateStagingConfig,
} from '../src/services/service-workbench-staging'

const principal = '01920000-0000-7000-8000-000000000201'
const actor = '01920000-0000-7000-8000-000000000202'
const family = '01920000-0000-7000-8000-000000000203'
const assertion = 'a'.repeat(43)
const machine = 'machine-secret-for-private-staging-2026'
const baseEnv = {
  PHOENIX_SERVICE_WORKBENCH_MODE: 'private-staging',
  PHOENIX_SERVICE_WORKBENCH_HOST: '127.0.0.1',
  PHOENIX_SERVICE_WORKBENCH_PORT: '4776',
  PHOENIX_STAGING_DB_NAME: 'phoenix_family_staging',
  PHOENIX_STAGING_APP_DSN: 'postgresql://staging_app:secret@127.0.0.1/phoenix_family_staging',
  PHOENIX_STAGING_BINDER_DSN: 'postgresql://staging_binder:secret@127.0.0.1/phoenix_family_staging',
  WORKBENCH_STAGING_IDENTITY_KEY: machine,
  PHOENIX_STAGING_IDENTITY_URL: 'http://127.0.0.1:4780',
}

test('private staging configuration rejects public listeners, shared roles, and production-like databases', () => {
  assert.throws(() => readPrivateStagingConfig({ ...baseEnv, PHOENIX_SERVICE_WORKBENCH_HOST: '0.0.0.0' }), /loopback/)
  assert.throws(() => readPrivateStagingConfig({ ...baseEnv, PHOENIX_STAGING_BINDER_DSN: baseEnv.PHOENIX_STAGING_APP_DSN }), /不同数据库角色/)
  assert.throws(() => readPrivateStagingConfig({ ...baseEnv, PHOENIX_STAGING_DB_NAME: 'phoenix_production' }), /专用 Phoenix Staging/)
  assert.throws(() => readPrivateStagingConfig({ ...baseEnv, PHOENIX_STAGING_IDENTITY_URL: 'http://10.0.0.8:4780' }), /loopback HTTP/)
  assert.throws(() => readPrivateStagingConfig({ ...baseEnv, WORKBENCH_STAGING_IDENTITY_KEY: undefined }), /machine token/)
})

test('private staging identity authority uses loopback machine authentication and fail-closed current checks', async () => {
  const calls: Array<{ auth: string; body: Record<string, unknown> }> = []
  let currentStatus = 204
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    calls.push({ auth: String(request.headers.authorization), body: JSON.parse(Buffer.concat(chunks).toString('utf8')) })
    if (calls.at(-1)?.body.action === 'assert-current') {
      response.writeHead(currentStatus)
      response.end(currentStatus === 204 ? undefined : JSON.stringify({ status: 'DENY' }))
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      status: 'ALLOW', principalId: principal, actorPersonId: actor, familyId: family,
      channel: 'FAMILY', assertionToken: assertion, expiresAt: new Date(Date.now() + 30_000).toISOString(),
    }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert(address && typeof address === 'object')
    const config = readPrivateStagingConfig({ ...baseEnv, PHOENIX_STAGING_IDENTITY_URL: `http://127.0.0.1:${address.port}` })
    const authority = createPrivateStagingAuthority(config)
    const identity = await authority.resolveBearer('b'.repeat(43))
    assert.equal(identity?.channel, 'FAMILY')
    await authority.assertCurrent(assertion, 'FAMILY')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].auth, `Bearer ${machine}`)
    assert.deepEqual(calls[0].body, { action: 'resolve-bearer', token: 'b'.repeat(43) })
    assert.deepEqual(calls[1].body, { action: 'assert-current', token: assertion, channel: 'FAMILY' })
    currentStatus = 200
    await assert.rejects(() => authority.assertCurrent(assertion, 'FAMILY'))
    currentStatus = 403
    await assert.rejects(() => authority.assertCurrent(assertion, 'FAMILY'))
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('staging resolver derives identity from the verified bearer and rejects browser-shaped inputs', async () => {
  const resolver = createPrivateStagingResolver({
    async resolveBearer(token) {
      assert.equal(token, 'b'.repeat(43))
      return { principalId: principal, actorPersonId: actor, familyId: family, channel: 'FAMILY', assertionToken: assertion, expiresAt: new Date(Date.now() + 30_000).toISOString() }
    },
    async assertCurrent(token, channel) { assert.equal(token, assertion); assert.equal(channel, 'FAMILY') },
  })
  const identity = await resolver('Bearer ' + 'b'.repeat(43))
  assert.equal(identity.channel, 'FAMILY')
  assert.equal(identity.profile, 'CUSTOMER')
  await identity.assertCurrent()
  await assert.rejects(() => resolver(undefined), error => (error as { code?: string }).code === 'AUTH_REQUIRED')
  await assert.rejects(() => resolver('Bearer customer-id=forged'), error => (error as { code?: string }).code === 'AUTH_REQUIRED')
})

test('readiness is sanitized and disabled storage stays fail-closed', () => {
  const config = readPrivateStagingConfig(baseEnv)
  const result = privateStagingReadiness(config)
  assert.equal(result.status, 'blocked')
  assert.equal(result.syntheticLogin, false)
  assert.equal(result.objectStorage, 'disabled-fail-closed')
  assert.equal(result.database.name, config.databaseName)
  assert.equal('appDsn' in result, false)
  assert.equal('machineToken' in result, false)
})

test('staging blocks advisor access to mixed Health projects before legacy snapshot or command SQL', async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = []
  const mixedClient = { query: async (sql: string, params?: unknown[]) => { calls.push({ sql, params }); return { rows: [{ mixed: true }] } } }
  await assert.rejects(
    () => privateStagingProjectSafetyGuard(mixedClient, { channel: 'ADVISOR' }, '01920000-0000-7000-8000-000000000318'),
    error => (error as { code?: string }).code === 'MIXED_HEALTH_PROJECT_DENIED',
  )
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].params, ['01920000-0000-7000-8000-000000000318'])
  await privateStagingProjectSafetyGuard({ query: async () => ({ rows: [{ mixed: true }] }) }, { channel: 'FAMILY' }, '01920000-0000-7000-8000-000000000318')
  await privateStagingProjectSafetyGuard({ query: async () => ({ rows: [{ mixed: false }] }) }, { channel: 'ADVISOR' })
})
