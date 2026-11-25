import { createPublicKey, JsonWebKey, KeyObject, verify } from 'node:crypto'
import { AppError } from '../domain/errors'

export interface BrokerIdentity {
  iss: string; aud: string; sub: string; iat: number; nbf: number; exp: number; jti: string
}
export interface BrokerVerifier { verify(token: string): Promise<BrokerIdentity> }
export interface BrokerProfile { issuer: string; audience: string; jwksUri: string }
const denied = () => new AppError(401, 'BROKER_IDENTITY_REQUIRED', '家庭资料访问未授权')
const kidPattern = /^[A-Za-z0-9_-]{1,64}$/
function httpsUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.href !== value) throw denied()
  return url
}
function compactObject(raw: Buffer): Record<string, unknown> {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  const value: unknown = JSON.parse(text)
  // Selected first-party profile emits compact JSON. This also rejects duplicate keys.
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value) !== text) throw denied()
  return value as Record<string, unknown>
}

/** No live transport is provided. The trusted caller supplies an exact-source JWKS reader.
 * Local acceptance injects only ephemeral public keys; no discovery or token-controlled URLs.
 */
export function createBrokerVerifier(profile: BrokerProfile,
  loadJwks: (exactUri: string) => Promise<unknown>, now: () => number = Date.now): BrokerVerifier {
  try {
    if (Object.keys(profile).sort().join(',') !== 'audience,issuer,jwksUri' ||
        profile.audience !== 'phoenix-canonical-postgresql' || httpsUrl(profile.issuer).origin !== httpsUrl(profile.jwksUri).origin) throw denied()
  } catch { throw denied() }
  const trusted = Object.freeze({ ...profile })
  let keys = new Map<string, KeyObject>(), validUntil = 0, lastRefresh = -Infinity
  let refreshing: Promise<void> | undefined
  async function refresh(): Promise<void> {
    if (refreshing) return refreshing
    if (now() - lastRefresh < 30_000) throw denied()
    lastRefresh = now()
    refreshing = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const value = await Promise.race([Promise.resolve().then(() => loadJwks(trusted.jwksUri)),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(denied()), 1500) })])
        if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(value).length > 32768 ||
            Object.keys(value).join(',') !== 'keys') throw denied()
        const jwks = (value as { keys?: unknown }).keys
        if (!Array.isArray(jwks) || jwks.length < 1 || jwks.length > 8) throw denied()
        const next = new Map<string, KeyObject>()
        for (const item of jwks) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw denied()
          const j = item as Record<string, unknown>
          if (Object.keys(j).some(k => !['alg','crv','kid','kty','use','x','y','key_ops','ext'].includes(k)) ||
              j.kty !== 'EC' || j.crv !== 'P-256' || j.alg !== 'ES256' || j.use !== 'sig' ||
              typeof j.kid !== 'string' || !kidPattern.test(j.kid) || next.has(j.kid) ||
              (j.ext !== undefined && j.ext !== true) ||
              (j.key_ops !== undefined && JSON.stringify(j.key_ops) !== '["verify"]')) throw denied()
          for (const coordinate of [j.x,j.y]) if (typeof coordinate !== 'string' ||
            Buffer.from(coordinate, 'base64url').length !== 32 || Buffer.from(coordinate, 'base64url').toString('base64url') !== coordinate) throw denied()
          next.set(j.kid, createPublicKey({ key: j as JsonWebKey, format: 'jwk' }))
        }
        keys = next; validUntil = now() + 300_000
      } catch { keys.clear(); validUntil = 0; throw denied() }
      finally { if (timer) clearTimeout(timer) }
    })()
    try { await refreshing } finally { refreshing = undefined }
  }
  return {
    async verify(token) {
      try {
        if (typeof token !== 'string' || token.length > 8192) throw denied()
        const parts = token.split('.')
        if (parts.length !== 3 || parts.some(x => !/^[A-Za-z0-9_-]+$/.test(x))) throw denied()
        const bytes = parts.map(x => Buffer.from(x, 'base64url'))
        if (bytes.some((b, i) => b.toString('base64url') !== parts[i]) || bytes[2].length !== 64) throw denied()
        const header = compactObject(bytes[0]), p = compactObject(bytes[1])
        if (Object.keys(header).sort().join(',') !== 'alg,kid,typ' || header.alg !== 'ES256' || header.typ !== 'JWT' ||
            typeof header.kid !== 'string' || !kidPattern.test(header.kid) ||
            Object.keys(p).sort().join(',') !== 'aud,exp,iat,iss,jti,nbf,sub' ||
            p.iss !== trusted.issuer || p.aud !== trusted.audience || typeof p.sub !== 'string' || !/^usr_[A-Za-z0-9_-]{1,128}$/.test(p.sub) ||
            typeof p.jti !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[47][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(p.jti) ||
            ![p.iat,p.nbf,p.exp].every(Number.isSafeInteger)) throw denied()
        const seconds = now() / 1000
        const current = () => Number(p.exp) > now() / 1000 && Number(p.iat) <= now() / 1000 && Number(p.nbf) <= now() / 1000
        // Zero skew is within the approved <=60s maximum. No expired token is accepted.
        if (!current() || Number(p.exp) <= Number(p.iat) || Number(p.exp) - Number(p.iat) > 300 ||
            Number(p.iat) < seconds - 300 || Number(p.nbf) < Number(p.iat) || Number(p.nbf) >= Number(p.exp)) throw denied()
        if (now() >= validUntil || !keys.has(header.kid)) await refresh()
        const key = keys.get(header.kid)
        if (!key || !current() || !verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`),
          { key, dsaEncoding: 'ieee-p1363' }, bytes[2])) throw denied()
        return Object.freeze({ ...p }) as unknown as BrokerIdentity
      } catch { throw denied() }
    }
  }
}
