import { createPublicKey, JsonWebKey, verify } from 'node:crypto'
import { AppError } from '../domain/errors'

export interface SyntheticFamilyIdentity {
  iss: string; aud: string; sub: string; application_family_id: string
  iat: number; nbf: number; exp: number; jti: string
}
const denied = () => new AppError(401, 'FAMILY_IDENTITY_REQUIRED', '家庭资料访问未授权')
export function createSyntheticFamilyVerifier(config: Record<string, unknown>): (authorization?: string) => SyntheticFamilyIdentity {
  if (Object.keys(config).sort().join(',') !== 'audience,issuer,jwk' ||
      config.issuer !== 'https://family-projection.synthetic.invalid' || config.audience !== 'family-projection-synthetic') throw denied()
  const jwk = config.jwk as Record<string, unknown>
  if (!jwk || Object.keys(jwk).sort().join(',') !== 'alg,crv,kid,kty,use,x,y' ||
      jwk.kty !== 'EC' || jwk.crv !== 'P-256' || jwk.alg !== 'ES256' || jwk.use !== 'sig' ||
      typeof jwk.kid !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(jwk.kid)) throw denied()
  const key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' })
  return (authorization) => {
    try {
      const raw = authorization?.match(/^Bearer ([A-Za-z0-9_.-]{1,8192})$/)?.[1]
      if (!raw) throw denied()
      const parts = raw.split('.')
      if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw denied()
      const buffers = parts.map(p => Buffer.from(p, 'base64url'))
      if (buffers.some((b, i) => b.toString('base64url') !== parts[i])) throw denied()
      const h = JSON.parse(buffers[0].toString('utf8'))
      const p = JSON.parse(buffers[1].toString('utf8'))
      // Synthetic tokens use canonical compact JSON; duplicate claim keys are refused.
      if (JSON.stringify(h) !== buffers[0].toString('utf8') || JSON.stringify(p) !== buffers[1].toString('utf8') ||
          Object.keys(h).sort().join(',') !== 'alg,kid,typ' || h.alg !== 'ES256' || h.typ !== 'JWT' || h.kid !== jwk.kid ||
          Object.keys(p).sort().join(',') !== 'application_family_id,aud,exp,iat,iss,jti,nbf,sub' ||
          p.iss !== config.issuer || p.aud !== config.audience || typeof p.sub !== 'string' ||
          !/^usr_[A-Za-z0-9_-]{1,128}$/.test(p.sub) || typeof p.application_family_id !== 'string' ||
          !/^fam_[a-f0-9]{32}$/.test(p.application_family_id) || typeof p.jti !== 'string' ||
          !/^[a-f0-9-]{36}$/.test(p.jti) || ![p.exp,p.iat,p.nbf].every(Number.isInteger)) throw denied()
      const now = Date.now() / 1000
      if (p.exp <= now || p.exp - p.iat > 60 || p.iat > now || p.nbf > now || p.iat < now - 60 || p.nbf > p.exp ||
          buffers[2].length !== 64 || !verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`),
            { key, dsaEncoding: 'ieee-p1363' }, buffers[2])) throw denied()
      return p as SyntheticFamilyIdentity
    } catch { throw denied() }
  }
}
