import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fixtureIds } from './fixtures.mjs'

const root = process.cwd()
const require = createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'))
const { Pool } = require('pg')
const { createAppServer } = require('./dist/http/app.js')
const { createCanonicalWorkspaceAccess } = require('./dist/services/canonical-workspace-access.js')
const { AppError } = require('./dist/domain/errors.js')

export async function startWorkspaceApi(db,passwords) {
  const connection = (user,password) => ({
    host: '127.0.0.1', port: db.port, database: 'phoenix_canonical_dev',
    user, password, max: 3, connectionTimeoutMillis: 2000,
    query_timeout: 5000, idleTimeoutMillis: 3000
  })
  const app = new Pool(connection('workspace_test_app',passwords.app))
  const binder = new Pool(connection('workspace_test_binder',passwords.binder))
  const sessions = new Map()
  const aliases = {
    multi: fixtureIds.principals.multi,
    partnerB: fixtureIds.principals.partnerB,
    auxiliary: fixtureIds.principals.auxiliary
  }
  const issue = (alias) => {
    assert(Object.hasOwn(aliases,alias))
    const token = randomBytes(32).toString('base64url')
    const session = {
      alias, principalId: aliases[alias], active: true,
      sessionRef: `synthetic-session-${randomBytes(32).toString('hex')}`,
      csrfToken: randomBytes(32).toString('base64url'),
      expiresAt: Date.now()+15*60*1000
    }
    sessions.set(token,session)
    return token
  }
  const tokens = Object.fromEntries(Object.keys(aliases).map((alias) => [alias,issue(alias)]))
  const audits = []
  let workspaceAccess
  const workspaceEntry = {
    handle(request,response) { return workspaceAccess.handle(request,response) },
    close() { return workspaceAccess.close() }
  }
  const legacy = new Proxy({}, { get() { throw new Error('LEGACY_SERVICE_MUST_NOT_BE_USED') } })
  const server = createAppServer({
    auth: legacy, profiles: legacy, assessments: legacy, orders: legacy, reports: legacy,
    workspaceAccess: workspaceEntry, logger: { error() {} }
  })
  await new Promise((resolve) => server.listen(0,'127.0.0.1',resolve))
  const address = server.address()
  assert(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
  workspaceAccess = createCanonicalWorkspaceAccess({
    app,binder,mode:'test',allowedOrigins:[origin],
    async resolve(authorization) {
      const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,256})$/)?.[1]
      const session = sessions.get(token)
      if (!session?.active) throw new AppError(401,'SIGN_IN_REQUIRED','Synthetic session required')
      return {
        principalId: session.principalId, sessionRef: session.sessionRef,
        csrfToken: session.csrfToken, expiresAt: session.expiresAt,
        async assertCurrent() {
          if (sessions.get(token)!==session || !session.active || session.expiresAt<=Date.now()) {
            throw new AppError(403,'ACCESS_DENIED','Synthetic session revoked')
          }
        }
      }
    },
    audit(event) { audits.push({...event,at:new Date().toISOString()}) }
  })
  const receipts = []
  async function call(alias,path,{method='GET',body,headers={},cookie,csrf=true}={}) {
    const token = tokens[alias]
    assert(token,`Unknown synthetic alias ${alias}`)
    const session = sessions.get(token)
    const requestHeaders = {
      authorization: `Bearer ${token}`,
      ...headers
    }
    if (cookie) requestHeaders.cookie = cookie
    if (method==='POST' || method==='DELETE') {
      requestHeaders.origin = origin
      if (csrf) requestHeaders['x-csrf-token'] = session.csrfToken
    }
    if (body!==undefined) requestHeaders['content-type'] = 'application/json'
    const response = await fetch(origin+path,{
      method,headers:requestHeaders,
      body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)
    })
    let value = null
    if (response.status!==204) {
      try { value = await response.clone().json() } catch { value = await response.text() }
    }
    const setCookie = response.headers.get('set-cookie')
    const receipt = { alias,path,method,status:response.status,body:value,
      setCookie:setCookie ? setCookie.replace(/=[^;]+/,'=[REDACTED]') : null }
    receipts.push(receipt)
    return { response,value,setCookie,receipt }
  }
  return {
    origin,server,workspaceAccess,app,binder,sessions,tokens,audits,receipts,connection,Pool,
    issue,
    revokeIdentity(alias) { sessions.get(tokens[alias]).active=false },
    setIdentityActive(alias,value) { sessions.get(tokens[alias]).active=Boolean(value) },
    async close() {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      await workspaceAccess.close()
    },
    call
  }
}
