import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto'
import { createBrokerVerifier } from '../src/auth/broker-identity'
import { createSessionFamilyResolver } from '../src/auth/session-family-bridge'
import { loadSessionBoundFamilyProjection, loadApplicationSessionProjection } from '../src/services/canonical-family-projection'
import { InMemoryStore } from '../src/store/memory-store'
import { AuthService } from '../src/services/auth-service'
import { MockWechatAuthProvider } from '../src/auth/wechat-auth-provider'
import { tokenDigest } from '../src/utils/runtime'
import { Store } from '../src/store/store'

const profile = { issuer: 'https://broker.synthetic.invalid/canonical-identity',
  audience: 'phoenix-canonical-postgresql', jwksUri: 'https://broker.synthetic.invalid/jwks' }
const pair = () => generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const first = pair(), second = pair()
const jwk = (key = first, kid = 'ephemeral-first') => ({ ...key.publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' })
function jwt(changes: Record<string, unknown> = {}, header: Record<string, unknown> = {}, key = first, at = Date.now(), raw?: string) {
  const now = Math.floor(at / 1000)
  const p = { iss: profile.issuer, aud: profile.audience, sub: 'usr_parent_a', iat: now, nbf: now, exp: now + 300, jti: randomUUID(), ...changes }
  const input = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'ephemeral-first', ...header })).toString('base64url') + '.' +
    Buffer.from(raw ?? JSON.stringify(p)).toString('base64url')
  return input + '.' + sign('sha256', Buffer.from(input), { key: key.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
}

test('broker strict selected profile verifies internal subject-only assertions and rejects forged/expanded claims', async () => {
  const verifier = createBrokerVerifier(profile, async uri => { assert.equal(uri, profile.jwksUri); return { keys: [jwk()] } })
  const identity = await verifier.verify(jwt())
  assert.equal(identity.sub, 'usr_parent_a'); assert(Object.isFrozen(identity))
  assert.equal('application_family_id' in identity, false)
  const now = Math.floor(Date.now() / 1000)
  const invalid: [string, string][] = [
    ['signature', jwt({}, {}, second)], ['issuer', jwt({ iss: 'https://other.invalid' })],
    ['audience', jwt({ aud: 'other' })], ['audience-array', jwt({ aud: [profile.audience] })],
    ['expired', jwt({ exp: now - 1 })], ['future-iat', jwt({ iat: now + 5 })], ['future-nbf', jwt({ nbf: now + 5 })],
    ['overlong-lifetime', jwt({ exp: now + 301 })], ['missing-claim', jwt({ nbf: undefined })],
    ['fractional-time', jwt({ iat: now - 0.5 })], ['negative-lifetime', jwt({ exp: now - 5, iat: now })],
    ['family-claim', jwt({ application_family_id: 'fam_' + 'b'.repeat(32) })], ['role-claim', jwt({ role: 'admin' })],
    ['PII-claim', jwt({ openid: 'synthetic-not-real' })], ['wrong-subject-shape', jwt({ sub: 'openid_synthetic' })],
    ['bad-jti', jwt({ jti: '' })], ['none', jwt({}, { alg: 'none' })], ['HMAC', jwt({}, { alg: 'HS256' })],
    ['RS256-not-selected', jwt({}, { alg: 'RS256' })], ['header-source', jwt({}, { jku: 'https://attacker.invalid/jwks' })],
    ['duplicate-json', jwt({}, {}, first, Date.now(), '{"iss":"first","iss":"second"}')],
    ['malformed', 'not-a-jwt'], ['oversized', 'a'.repeat(8193)], ['unknown-kid', jwt({}, { kid: 'unknown' })]
  ]
  for (const [name, value] of invalid) await assert.rejects(verifier.verify(value), e => {
    assert.equal((e as { status: number }).status, 401, name); assert(!String(e).includes(value)); return true
  }, name)
  for (const changed of [{ audience: 'widened' }, { issuer: 'http://broker.synthetic.invalid' },
    { jwksUri: 'https://other.invalid/jwks' }, { jwksUri: profile.jwksUri + '?key=untrusted' }])
    assert.throws(() => createBrokerVerifier({ ...profile, ...changed }, async () => ({ keys: [jwk()] })))
})

test('JWKS cache bounded at300s, unknown kid refresh rate-limited, rotation and outage fail closed', async () => {
  let at = Date.now(), calls = 0, keys: unknown = { keys: [jwk()] }, outage = false
  const verifier = createBrokerVerifier(profile, async () => { calls++; if (outage) throw Error('upstream detail must not escape'); return keys }, () => at)
  await Promise.all(Array.from({ length: 6 }, () => verifier.verify(jwt({}, {}, first, at))))
  assert.equal(calls, 1)
  await assert.rejects(verifier.verify(jwt({}, { kid: 'rotated' }, second, at))); assert.equal(calls, 1)
  at += 31_000; keys = { keys: [jwk(second, 'rotated')] }
  await verifier.verify(jwt({}, { kid: 'rotated' }, second, at)); assert.equal(calls, 2)
  await assert.rejects(verifier.verify(jwt({}, {}, first, at))); assert.equal(calls, 2)
  at += 300_001; outage = true
  await assert.rejects(verifier.verify(jwt({}, { kid: 'rotated' }, second, at)), e => !String(e).includes('upstream detail'))
  assert.equal(calls, 3)
  await assert.rejects(verifier.verify(jwt({}, { kid: 'rotated' }, second, at))); assert.equal(calls, 3)
})

test('malformed, duplicate, private, wrong-use and overlarge JWKS are refused', async () => {
  for (const keys of [null, { keys: [] }, { keys: [jwk(), jwk()] }, { keys: [{ ...jwk(), d: 'synthetic-forbidden' }] },
    { keys: [{ ...jwk(), use: 'enc' }] }, { keys: [{ ...jwk(), key_ops: ['sign'] }] },
    { keys: [{ ...jwk(), x: 'bad' }] }, { keys: [jwk()], extra: true }, { keys: Array(9).fill(jwk()) }]) {
    await assert.rejects(createBrokerVerifier(profile, async () => keys).verify(jwt()))
  }
})

test('JWKS loader deadline fails closed without waiting for an unresponsive source', async () => {
  const verifier = createBrokerVerifier(profile, async () => new Promise(() => {}))
  const started = Date.now()
  await assert.rejects(verifier.verify(jwt()))
  assert(Date.now() - started < 3000)
})

async function fixture() {
  const store = new InMemoryStore(), secret = randomBytes(32).toString('hex'), token = randomBytes(32).toString('base64url')
  const now = new Date().toISOString(), family = 'fam_' + 'a'.repeat(32)
  await store.transaction(async tx => {
    await tx.insert('users', { id: 'usr_parent_a', role: 'family_user', createdAt: now })
    await tx.insert('families', { id: family, userId: 'usr_parent_a', familyName: null, parentName: null, phone: null, location: null, goal: null, createdAt: now, updatedAt: now })
    await tx.insert('sessions', { id: 'ses_synthetic', userId: 'usr_parent_a', tokenHash: tokenDigest(token, secret),
      expiresAt: new Date(Date.now() + 60_000).toISOString(), revokedAt: null, createdAt: now })
  })
  const auth = new AuthService(store, new MockWechatAuthProvider(), secret)
  let brokerCalls = 0
  const deps = { store, auth, verifier: createBrokerVerifier(profile, async () => ({ keys: [jwk()] })),
    async tokenForSubject(subject: string) { brokerCalls++; return jwt({ sub: subject }) } }
  return { store, auth, deps, token, family, calls: () => brokerCalls }
}

test('trusted session+Store ownership derives family; broker subject binding and current recheck deny changes', async () => {
  const f = await fixture(), resolve = createSessionFamilyResolver(f.deps)
  const identity = await resolve('Bearer ' + f.token, 'family')
  assert.equal(identity.sub, 'usr_parent_a'); assert.equal(identity.application_family_id, f.family)
  assert.equal(identity.iss, profile.issuer); await identity.assertCurrent()
  assert.equal((await resolve('Bearer ' + f.token, 'students')).application_family_id, f.family)
  const before = f.calls()
  for (const operation of ['student', 'write', 'unknown']) await assert.rejects(resolve('Bearer ' + f.token, operation))
  await assert.rejects(resolve('Bearer ' + jwt(), 'family')); assert.equal(f.calls(), before)
  await assert.rejects(createSessionFamilyResolver({ ...f.deps, tokenForSubject: async () => jwt({ sub: 'usr_parent_b' }) })('Bearer ' + f.token, 'family'))
  await f.store.transaction(tx => tx.update('families', f.family, { userId: 'usr_parent_b' }))
  await assert.rejects(identity.assertCurrent()); await assert.rejects(resolve('Bearer ' + f.token, 'family'))
})

test('revoked/expired/deleted/admin/missing/ambiguous ownership refuse before issuing broker assertion', async () => {
  for (const condition of ['revoked', 'expired', 'deleted', 'admin', 'missing', 'ambiguous']) {
    const f = await fixture()
    await f.store.transaction(async tx => {
      if (condition === 'revoked') await tx.update('sessions', 'ses_synthetic', { revokedAt: new Date().toISOString() })
      if (condition === 'expired') await tx.update('sessions', 'ses_synthetic', { expiresAt: new Date(0).toISOString() })
      if (condition === 'deleted') await tx.update('users', 'usr_parent_a', { deletedAt: new Date().toISOString() })
      if (condition === 'admin') await tx.update('users', 'usr_parent_a', { role: 'admin' })
      if (condition === 'missing') await tx.delete('families', f.family)
      if (condition === 'ambiguous') {
        const original = await tx.findById('families', f.family); assert(original)
        // Existing Store uniqueness protects this invariant; malformed Store response must also deny.
      }
    })
    const malformed: Store = { transaction: f.store.transaction.bind(f.store), read: work => f.store.read(tx => work(new Proxy(tx, {
      get(target, key) {
        if (key === 'findMany') return async () => [{ id: f.family, userId: 'usr_parent_a' }, { id: 'fam_' + 'b'.repeat(32), userId: 'usr_parent_a' }]
        const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
      }
    }))) }
    const deps = condition !== 'ambiguous' ? f.deps : { ...f.deps, store: malformed }
    await assert.rejects(createSessionFamilyResolver(deps)('Bearer ' + f.token, 'family'), condition)
    assert.equal(f.calls(), 0, condition)
  }
})

test('session bridge stays disabled with no file reads, and refuses production/non-audited modes', async () => {
  const deps = (await fixture()).deps
  assert.equal(await loadSessionBoundFamilyProjection({}, deps), undefined)
  for (const env of [{ NODE_ENV: 'production' }, { NODE_ENV: 'development' }, { NODE_ENV: 'test' }]) {
    await assert.rejects(loadSessionBoundFamilyProjection({ ...env, CANONICAL_BROKER_SESSION_BRIDGE_ENABLED: 'true' }, deps))
  }
  await assert.rejects(loadSessionBoundFamilyProjection({ NODE_ENV: 'test', LISTEN_HOST: '0.0.0.0',
    CANONICAL_BROKER_SESSION_BRIDGE_ENABLED: 'true', CANONICAL_FAMILY_PROJECTION_ENABLED: 'true',
    CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED: 'true' }, deps))
})

test('session revoke during internal token issuance is rejected by the fresh ownership/session check', async () => {
  const f = await fixture()
  const resolve = createSessionFamilyResolver({ ...f.deps, tokenForSubject: async subject => {
    await f.auth.revokeSession(f.token); return jwt({ sub: subject })
  } })
  await assert.rejects(resolve('Bearer ' + f.token, 'family'))
})

test('application composition defaults off and has no inferred broker or synthetic-JWT fallback', async () => {
  const f = await fixture()
  assert.equal(await loadApplicationSessionProjection({}, { auth: f.auth, store: f.store }), undefined)
  await assert.rejects(loadApplicationSessionProjection({ NODE_ENV: 'test', CANONICAL_BROKER_SESSION_BRIDGE_ENABLED: 'true' },
    { auth: f.auth, store: f.store }), e => (e as { status: number }).status === 503)
})
