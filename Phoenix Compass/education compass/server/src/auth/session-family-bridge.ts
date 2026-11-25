import { AppError } from '../domain/errors'
import { AuthService } from '../services/auth-service'
import { Store } from '../store/store'
import { BrokerVerifier } from './broker-identity'

export interface SessionBridgeDependencies {
  auth: Pick<AuthService, 'authenticate'>
  store: Store
  verifier: BrokerVerifier
  /** Trusted internal issuer adapter, never a browser-supplied token or HTTP handler. */
  tokenForSubject(subject: string): Promise<string>
}
export interface ResolvedFamilyIdentity {
  iss: string; sub: string; application_family_id: string; exp: number
  assertCurrent(): Promise<void>
}
const denied = () => new AppError(403, 'FAMILY_SCOPE_REQUIRED', '家庭资料访问未授权')

export function createSessionFamilyResolver(deps: SessionBridgeDependencies) {
  return async (authorization: string | undefined, operation: string): Promise<ResolvedFamilyIdentity> => {
    // Single-student application->Canonical translation is not approved by family mapping alone.
    if (!['family','students'].includes(operation)) throw denied()
    const sessionToken = authorization?.match(/^Bearer ([A-Za-z0-9_-]{20,512})$/)?.[1]
    if (!sessionToken) throw denied()
    const current = async () => {
      const user = await deps.auth.authenticate(sessionToken)
      if (user.role !== 'family_user' || user.deletedAt || !/^usr_[A-Za-z0-9_-]{1,128}$/.test(user.id)) throw denied()
      const families = await deps.store.read(tx => tx.findMany('families', { userId: user.id }))
      if (families.length !== 1 || families[0].userId !== user.id || !/^fam_[a-f0-9]{32}$/.test(families[0].id)) throw denied()
      return { subject: user.id, family: families[0].id }
    }
    const owner = await current()
    const identity = await deps.verifier.verify(await deps.tokenForSubject(owner.subject))
    if (identity.sub !== owner.subject) throw denied()
    const assertCurrent = async () => {
      const latest = await current()
      if (latest.subject !== owner.subject || latest.family !== owner.family || identity.exp * 1000 <= Date.now()) throw denied()
    }
    await assertCurrent()
    return { iss: identity.iss, sub: identity.sub, exp: identity.exp,
      application_family_id: owner.family, assertCurrent }
  }
}
