import type { Pool } from 'pg'
import { AppError } from '../domain/errors'
import { createServiceWorkbench, type WorkbenchIdentity } from './service-workbench'

const opaque = /^[A-Za-z0-9_-]{32,256}$/
const customerUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const canonicalUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const sessionHash = /^[a-f0-9]{64}$/
const maxLifetimeMs = 300_000
const unavailable = () => new AppError(503, 'WORKBENCH_AUTHORITY_UNAVAILABLE', '工作台认证暂不可用')
const denied = () => new AppError(403, 'ACCESS_DENIED', '工作台访问未授权')
const expired = () => new AppError(401, 'SIGN_IN_REQUIRED', '请重新登录')

interface FamilyAssertion {
  customerId: string
  sessionHash: string
  principalId: string
  actorPersonId: string
  familyId: string
  channel: 'FAMILY'
  expiresAt: number
}

interface PrivateFamilyWorkbenchOptions {
  app: Pool
  binder: Pool
  authorityOrigin: string
  authorityKey: string
  request?: typeof fetch
}

function inspectUrl(origin: string): URL {
  const url = new URL(origin)
  if (url.protocol !== 'https:' || url.origin !== origin) {
    throw new Error('Private workbench authority requires an exact HTTPS origin')
  }
  return new URL('/v1/workbench/customer-session/inspect', url)
}

async function decodeAssertion(response: Response): Promise<FamilyAssertion> {
  if (!response.body || !response.headers.get('content-type')?.match(/^application\/json(?:;|$)/i)) throw unavailable()
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        await reader.cancel()
        throw unavailable()
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  const assertion = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) as Partial<FamilyAssertion> | null
  if (!assertion || Object.keys(assertion).sort().join(',') !==
      'actorPersonId,channel,customerId,expiresAt,familyId,principalId,sessionHash' ||
      assertion.channel !== 'FAMILY' || typeof assertion.customerId !== 'string' || !customerUuid.test(assertion.customerId) ||
      typeof assertion.sessionHash !== 'string' || !sessionHash.test(assertion.sessionHash) ||
      typeof assertion.principalId !== 'string' || !canonicalUuid.test(assertion.principalId) ||
      typeof assertion.actorPersonId !== 'string' || !canonicalUuid.test(assertion.actorPersonId) ||
      typeof assertion.familyId !== 'string' || !canonicalUuid.test(assertion.familyId) ||
      typeof assertion.expiresAt !== 'number' || !Number.isSafeInteger(assertion.expiresAt) ||
      assertion.expiresAt > Date.now() + maxLifetimeMs) throw denied()
  if (assertion.expiresAt <= Date.now()) throw expired()
  return assertion as FamilyAssertion
}

function sameAssertion(before: FamilyAssertion, after: FamilyAssertion): boolean {
  return before.customerId === after.customerId && before.sessionHash === after.sessionHash &&
    before.principalId === after.principalId && before.actorPersonId === after.actorPersonId &&
    before.familyId === after.familyId && before.expiresAt === after.expiresAt
}

/** Private gateway composition. The authority must recheck the bound D1 session and current grants on every inspection. */
export function createPrivateFamilyWorkbench(options: PrivateFamilyWorkbenchOptions) {
  const key = options.authorityKey
  if (!opaque.test(key) || options.app === options.binder) {
    throw new Error('Private workbench requires authority credentials and separate database pools')
  }
  const endpoint = inspectUrl(options.authorityOrigin)
  const request = options.request ?? fetch
  async function inspect(token: string): Promise<FamilyAssertion> {
    try {
      const response = await request(endpoint, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({ token }),
        redirect: 'error',
        signal: AbortSignal.timeout(3000)
      })
      if (response.status !== 200 || response.redirected) await response.body?.cancel()
      if (response.status === 401) throw expired()
      if (response.status === 403 || response.status === 404) throw denied()
      if (response.status !== 200 || response.redirected) throw unavailable()
      return await decodeAssertion(response)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw unavailable()
    }
  }

  async function resolve(authorization: string | undefined): Promise<WorkbenchIdentity> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!opaque.test(token)) throw expired()
    const assertion = await inspect(token)
    return {
      principalId: assertion.principalId,
      actorPersonId: assertion.actorPersonId,
      familyId: assertion.familyId,
      channel: 'FAMILY',
      profile: 'CUSTOMER',
      async assertCurrent() {
        if (assertion.expiresAt <= Date.now()) throw expired()
        if (!sameAssertion(assertion, await inspect(token))) throw denied()
      }
    }
  }

  const workbench = createServiceWorkbench({
    app: options.app,
    binder: options.binder,
    mode: 'private-family',
    resolve,
    objects: { async put() { throw denied() }, async get() { throw denied() } }
  })
  return { handle: workbench.handle, close: workbench.close }
}
