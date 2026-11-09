import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test, { type TestContext } from 'node:test'
import type { Pool } from 'pg'
import { createPrivateFamilyWorkbench } from '../src/services/private-family-workbench'

const authorityOrigin = 'https://private-authority.test'
const authorityKey = 'private_authority_test_credential_123'
const token = 'opaque_synthetic_private_family_token'
const principalId = '01920000-0000-7000-8000-000000000001'
const actorPersonId = '01920000-0000-7000-8000-000000000002'
const familyId = '01920000-0000-7000-8000-000000000003'
const project = '01920000-0000-7000-8000-000000000004'
const document = '01920000-0000-7000-8000-000000000005'

function fixture() {
  const assertion = {
    customerId: '00000000-0000-4000-8000-000000000001', sessionHash: 'a'.repeat(64),
    principalId, actorPersonId, familyId, channel: 'FAMILY', expiresAt: Date.now() + 60_000
  }
  const sql: string[] = []
  let inspections = 0
  let grantStatus = 200
  let afterRead = () => {}
  let afterCommit = () => {}
  function pool(): Pool {
    return {
      on() {},
      async end() {},
      async connect() {
        return {
          release() {},
          async query(statement: string, parameters: unknown[]) {
            sql.push(statement)
            if (statement.includes('FROM pg_catalog.pg_roles')) return { rows: [{ ok: true }] }
            if (statement.includes('auth.issue_context_ticket')) {
              assert.deepEqual(parameters.slice(0, 4), [principalId, actorPersonId, familyId, 'FAMILY'])
              return { rows: [{ ticket: 'synthetic-ticket' }] }
            }
            if (statement.includes('service.workbench_customer_snapshot')) {
              assert.deepEqual(parameters, [project])
              afterRead()
              return { rows: [{ result: { status: 'ALLOW', data: {
                schemaVersion: 'service-workbench.v1', project: { id: project, write: true, manage: true }
              } } }] }
            }
            if (statement === 'COMMIT') afterCommit()
            if (/^(?:SET ROLE |SET LOCAL |SELECT auth\.(?:clear_context|redeem_context_ticket)|BEGIN|COMMIT|ROLLBACK|DISCARD ALL)/.test(statement)) {
              return { rows: [] }
            }
            throw new Error('Unexpected private gateway query')
          }
        }
      }
    } as unknown as Pool
  }
  const request: typeof fetch = async (input, init) => {
    inspections++
    const req = new Request(input, init)
    assert.equal(req.url, authorityOrigin + '/v1/workbench/customer-session/inspect')
    assert.equal(req.method, 'POST')
    assert.equal(req.redirect, 'error')
    assert.equal(req.headers.get('authorization'), 'Bearer ' + authorityKey)
    assert.deepEqual(await req.json(), { token })
    return grantStatus === 200 ? Response.json(assertion) : new Response(null, { status: grantStatus })
  }
  return {
    assertion, sql, request, authorityKey, authorityOrigin, app: pool(), binder: pool(),
    inspections: () => inspections,
    onRead(callback: () => void) { afterRead = callback },
    onCommit(callback: () => void) { afterCommit = callback },
    revoke() { grantStatus = 403 }
  }
}

async function serve(t: TestContext, state = fixture()) {
  const gateway = createPrivateFamilyWorkbench(state)
  const server = createServer((request, response) => { void gateway.handle(request, response) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await gateway.close()
  })
  const origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  const headers = { Authorization: 'Bearer ' + token }
  return {
    state, headers,
    get: (resource: string) => fetch(origin + '/v1/service-workbench/' + resource, { headers }),
    send: (resource: string, init?: RequestInit) => fetch(origin + '/v1/service-workbench/' + resource, init)
  }
}

test('private gateway requires separate pools and an exact HTTPS authority origin', () => {
  const state = fixture()
  assert.throws(() => createPrivateFamilyWorkbench({ ...state, app: state.binder }))
  assert.throws(() => createPrivateFamilyWorkbench({ ...state, authorityKey: '' }))
  assert.throws(() => createPrivateFamilyWorkbench({ ...state, authorityOrigin: 'http://private-authority.test' }))
  assert.throws(() => createPrivateFamilyWorkbench({ ...state, authorityOrigin: authorityOrigin + '/redirect' }))
})

test('private workbench rejects browser authority, synthetic markers, writes and downloads before DB access', async t => {
  const { state, headers, send } = await serve(t)
  assert.equal((await send('projects')).status, 401)
  for (const [name, value] of Object.entries({
    Cookie: 'site=synthetic', Origin: authorityOrigin, 'X-Phoenix-Customer-Bridge': 'p1', 'X-Customer-Id': 'supplied'
  })) {
    assert.equal((await send('projects', { headers: { ...headers, [name]: value } })).status, 403)
  }
  for (const resource of ['dev-session', 'summary', 'projects/' + project + '/commands', 'projects/' + project + '/materials']) {
    assert.equal((await send(resource, { method: 'POST', headers, body: '{}' })).status, 405)
  }
  assert.equal((await send('projects/' + project + '/materials/' + document + '/download', { headers })).status, 405)
  assert.equal(state.inspections(), 0)
  assert.deepEqual(state.sql, [])
})

test('private FAMILY detail uses the customer projection and removes write and manage capabilities', async t => {
  const { state, get } = await serve(t)
  const response = await get('projects/' + project)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await response.json(), {
    schemaVersion: 'service-workbench.v1', project: { id: project, write: false, manage: false }
  })
  assert.equal(state.inspections(), 4)
  assert(state.sql.includes('COMMIT'))
  assert(!state.sql.some(query => query.includes('service.workbench_command')))
})

test('private workbench denies an expired, revoked or rebound authority assertion', async t => {
  const expired = fixture()
  expired.assertion.expiresAt = Date.now() - 1
  const expiredGateway = await serve(t, expired)
  assert.equal((await expiredGateway.get('projects/' + project)).status, 401)
  assert.deepEqual(expired.sql, [])

  const revoked = fixture()
  revoked.onRead(revoked.revoke)
  const revokedGateway = await serve(t, revoked)
  assert.equal((await revokedGateway.get('projects/' + project)).status, 403)
  assert(revoked.sql.includes('ROLLBACK'))
  assert(!revoked.sql.includes('COMMIT'))

  const rebound = fixture()
  rebound.onRead(() => { rebound.assertion.sessionHash = 'b'.repeat(64) })
  const reboundGateway = await serve(t, rebound)
  assert.equal((await reboundGateway.get('projects/' + project)).status, 403)
  assert(rebound.sql.includes('ROLLBACK'))
})

test('private workbench rechecks the grant after the query commits and before disclosing the snapshot', async t => {
  const state = fixture()
  state.onCommit(state.revoke)
  const { get } = await serve(t, state)
  const response = await get('projects/' + project)
  assert.equal(response.status, 403)
  assert.equal((await response.json()).error.code, 'ACCESS_DENIED')
  assert(state.sql.includes('COMMIT'))
  assert(!state.sql.includes('ROLLBACK'))
})
