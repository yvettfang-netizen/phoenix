import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Pool, PoolClient } from 'pg'
import { AppError } from '../domain/errors'

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const publicRef = /^(org|fam)_[a-f0-9]{32}$/
const contextToken = /^[A-Za-z0-9_-]{43}$/
const contextCookie = 'phoenix_workspace_context'
const workspaceRole = 'phoenix_canonical_workspace_reader'
const forbiddenScopeHeaders = [
  'x-role', 'x-organization-id', 'x-family-id', 'x-principal-id',
  'x-workspace-kind', 'x-channel', 'x-source-system'
]

export interface WorkspaceSessionIdentity {
  principalId: string
  /** Stable only for the already verified login session. Never sourced from request role/org fields. */
  sessionRef: string
  csrfToken: string
  expiresAt: number
  assertCurrent(): Promise<void>
}

export interface WorkspaceAuditEvent {
  requestId: string
  operation: 'LIST' | 'SWITCH' | 'READ_STAFF_PROJECTS' | 'LOGOUT'
  decision: 'ALLOW' | 'DENY' | 'UNAVAILABLE'
}

export interface CanonicalWorkspaceAccess {
  handle(request: IncomingMessage, response: ServerResponse): Promise<void>
  close(): Promise<void>
}

export interface CanonicalWorkspaceAccessDependencies {
  app: Pool
  binder: Pool
  resolve(authorization: string | undefined): Promise<WorkspaceSessionIdentity>
  allowedOrigins: readonly string[]
  mode: 'test' | 'development'
  audit?: (event: WorkspaceAuditEvent) => void
}

const unavailable = () => new AppError(503, 'WORKSPACE_ACCESS_UNAVAILABLE', '工作区暂不可用')
const denied = () => new AppError(403, 'WORKSPACE_ACCESS_DENIED', '工作区访问未授权')
const authorizationFailures = new Set([
  'WORKSPACE_SESSION_INVALID', 'WORKSPACE_AUTHORIZATION_STALE',
  'WORKSPACE_TICKET_INVALID_OR_ALREADY_USED', 'WORKSPACE_TICKET_EXPIRY_INVALID'
])

function databaseFailure(error: unknown): AppError {
  if (error && typeof error === 'object') {
    const failure = error as { code?: unknown; message?: unknown }
    if (failure.code === 'P0001' && typeof failure.message === 'string'
        && authorizationFailures.has(failure.message)) return denied()
  }
  return unavailable()
}

function securityHeaders(response: ServerResponse): void {
  response.setHeader('Cache-Control', 'private, no-store')
  response.setHeader('Pragma', 'no-cache')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
}

function json(response: ServerResponse, status: number, value?: unknown): void {
  securityHeaders(response)
  response.statusCode = status
  if (value === undefined) { response.end(); return }
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Content-Length', body.length)
  response.end(body)
}

function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function authorization(request: IncomingMessage): string | undefined {
  return request.headers.authorization
}

function exactQuery(url: URL): void {
  if ([...url.searchParams.keys()].length > 0) {
    throw new AppError(400, 'QUERY_NOT_ALLOWED', '此接口不接受查询参数')
  }
}

async function objectBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > 8192) throw new AppError(413, 'BODY_TOO_LARGE', '请求内容过大')
    chunks.push(bytes)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, unknown>
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'JSON 请求体无效')
  }
}

function cookieValue(request: IncomingMessage): string {
  const matches = String(request.headers.cookie ?? '').split(';').map((part) => part.trim())
    .filter((part) => part.startsWith(`${contextCookie}=`))
  if (matches.length !== 1) throw denied()
  const value = matches[0].slice(contextCookie.length + 1)
  if (!contextToken.test(value)) throw denied()
  return value
}

function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

function verifyMutation(request: IncomingMessage, identity: WorkspaceSessionIdentity,
  allowedOrigins: ReadonlySet<string>): void {
  const rawOrigin = Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin
  const rawCsrf = Array.isArray(request.headers['x-csrf-token'])
    ? request.headers['x-csrf-token'][0] : request.headers['x-csrf-token']
  if (typeof rawOrigin !== 'string' || !allowedOrigins.has(rawOrigin)
      || typeof rawCsrf !== 'string' || !constantEqual(rawCsrf, identity.csrfToken)) throw denied()
}

function validateIdentity(identity: WorkspaceSessionIdentity): void {
  if (!uuid.test(identity.principalId) || identity.sessionRef.length < 16
      || identity.sessionRef.length > 512 || identity.csrfToken.length < 16
      || identity.csrfToken.length > 512 || !Number.isSafeInteger(identity.expiresAt)
      || identity.expiresAt <= Date.now()) throw denied()
}

async function guardBinder(client: PoolClient): Promise<void> {
  const signatures = [
    'auth.list_available_workspaces(uuid,uuid)',
    'auth.rotate_workspace_session(uuid,uuid,text,text,timestamp with time zone,uuid)',
    'auth.issue_workspace_context_ticket(uuid,text,text,timestamp with time zone,uuid,uuid)',
    'auth.revoke_workspace_sessions(uuid,text,uuid)'
  ]
  const result = await client.query(`
    WITH required(signature) AS (SELECT unnest($1::text[]))
    SELECT NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication
        OR r.rolbypassrls OR r.rolinherit)
      AND current_user=session_user
      AND NOT has_database_privilege(session_user,current_database(),'CREATE')
      AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid)
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_namespace n
        WHERE n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
          AND has_schema_privilege(session_user,n.oid,'CREATE')
      )
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('auth','core','consent','audit','integration','docs',
          'casework','education','identity','operations_ref','learning','crm','service')
          AND c.relkind IN ('r','p','v','m','f')
          AND has_table_privilege(session_user,c.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      )
      AND NOT EXISTS(
        SELECT 1 FROM required f
        WHERE to_regprocedure(f.signature) IS NULL
           OR NOT has_function_privilege(session_user,f.signature,'EXECUTE')
      )
      AND NOT has_function_privilege(session_user,
        'auth.issue_context_ticket(uuid,uuid,uuid,text,timestamp with time zone,uuid,uuid)',
        'EXECUTE') AS allowed
    FROM pg_catalog.pg_roles r WHERE r.rolname=session_user
  `, [signatures])
  if (result.rows[0]?.allowed !== true) throw unavailable()
}

async function guardAppLogin(client: PoolClient): Promise<void> {
  const result = await client.query(`
    SELECT NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication
        OR r.rolbypassrls OR r.rolinherit)
      AND current_user=session_user
      AND NOT has_database_privilege(session_user,current_database(),'CREATE')
      AND pg_has_role(session_user,$1,'SET')
      AND NOT pg_has_role(session_user,'phoenix_canonical_app','MEMBER')
      AND NOT pg_has_role(session_user,'phoenix_canonical_reader','MEMBER')
      AND NOT pg_has_role(session_user,'phoenix_canonical_context_binder','MEMBER')
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_auth_members m
        WHERE m.member=r.oid AND m.roleid<>$1::regrole
      )
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('auth','core','consent','audit','integration','docs',
          'casework','education','identity','operations_ref','learning','crm','service')
          AND c.relkind IN ('r','p','v','m','f')
          AND has_table_privilege(session_user,c.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      ) AS allowed
    FROM pg_catalog.pg_roles r WHERE r.rolname=session_user
  `, [workspaceRole])
  if (result.rows[0]?.allowed !== true) throw unavailable()
}

async function guardWorkspaceRole(client: PoolClient): Promise<void> {
  const signatures = [
    'auth.redeem_workspace_context_ticket(uuid,uuid)',
    'auth.clear_workspace_context()',
    'service.read_staff_workspace_projects()'
  ]
  const result = await client.query(`
    WITH required(signature) AS (SELECT unnest($1::text[]))
    SELECT current_user=$2::name AND NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb
        OR r.rolreplication OR r.rolbypassrls OR r.rolinherit OR r.rolcanlogin)
      AND NOT has_database_privilege(current_user,current_database(),'CREATE')
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid
      )
      AND NOT EXISTS(
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('auth','core','consent','audit','integration','docs',
          'casework','education','identity','operations_ref','learning','crm','service')
          AND c.relkind IN ('r','p','v','m','f')
          AND has_table_privilege(current_user,c.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      )
      AND NOT EXISTS(
        SELECT 1 FROM required f
        WHERE to_regprocedure(f.signature) IS NULL
           OR NOT has_function_privilege(current_user,f.signature,'EXECUTE')
      ) AS allowed
    FROM pg_catalog.pg_roles r WHERE r.rolname=current_user
  `, [signatures, workspaceRole])
  if (result.rows[0]?.allowed !== true) throw unavailable()
}

function envelope(value: unknown): { status: string; data: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable()
  const item = value as Record<string, unknown>
  if (Object.keys(item).sort().join(',') !== 'data,status'
      || !['ALLOW','DENY','UNAVAILABLE'].includes(String(item.status))) throw unavailable()
  if (item.status !== 'ALLOW' && item.data !== null) throw unavailable()
  return { status: String(item.status), data: item.data }
}

function workspaceItem(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable()
  const item = value as Record<string, unknown>
  if (Object.keys(item).sort().join(',') !== 'displayName,organizationCode,role,workspaceBindingId,workspaceKind,workspaceRef'
      || !uuid.test(String(item.workspaceBindingId))
      || !['FOUNDER','STAFF','PARTNER','FAMILY'].includes(String(item.workspaceKind))
      || typeof item.role !== 'string' || item.role.length > 40
      || typeof item.displayName !== 'string' || item.displayName.length < 1 || item.displayName.length > 300
      || !publicRef.test(String(item.workspaceRef))
      || !(item.organizationCode === null || (typeof item.organizationCode === 'string'
        && /^[A-Z0-9][A-Z0-9_-]{3,31}$/.test(item.organizationCode)))) throw unavailable()
  return item
}

function workspaceList(value: unknown): unknown {
  const item = value as Record<string, unknown>
  if (!item || Object.keys(item).sort().join(',') !== 'asOf,contractVersion,workspaces'
      || item.contractVersion !== 'workspace-list.v1' || typeof item.asOf !== 'string'
      || !Array.isArray(item.workspaces) || item.workspaces.length > 50) throw unavailable()
  item.workspaces.map(workspaceItem)
  return item
}

function workspaceContext(value: unknown): unknown {
  const item = value as Record<string, unknown>
  if (!item || Object.keys(item).sort().join(',') !== 'contractVersion,expiresAt,workspace'
      || item.contractVersion !== 'workspace-context.v1' || typeof item.expiresAt !== 'string') throw unavailable()
  workspaceItem(item.workspace)
  return item
}

function staffProjects(value: unknown): unknown {
  const item = value as Record<string, unknown>
  if (!item || Object.keys(item).sort().join(',') !== 'asOf,contractVersion,items'
      || item.contractVersion !== 'staff-projects.v1' || typeof item.asOf !== 'string'
      || !Array.isArray(item.items) || item.items.length > 100) throw unavailable()
  for (const raw of item.items) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw unavailable()
    const project = raw as Record<string, unknown>
    if (Object.keys(project).sort().join(',') !== 'assignmentRole,domain,projectCode,projectName,status,updatedAt'
        || typeof project.projectCode !== 'string' || project.projectCode.length > 40
        || typeof project.projectName !== 'string' || project.projectName.length > 300
        || typeof project.assignmentRole !== 'string' || typeof project.domain !== 'string'
        || typeof project.status !== 'string' || typeof project.updatedAt !== 'string') throw unavailable()
  }
  return item
}

export function createCanonicalWorkspaceAccess(
  deps: CanonicalWorkspaceAccessDependencies
): CanonicalWorkspaceAccess {
  if (!['test','development'].includes(deps.mode) || deps.app === deps.binder) throw unavailable()
  const allowedOrigins = new Set(deps.allowedOrigins)
  if (allowedOrigins.size < 1 || [...allowedOrigins].some((value) => {
    try {
      const url = new URL(value)
      return url.origin !== value || (url.protocol !== 'https:'
        && !(deps.mode !== 'development' && url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname)))
    } catch { return true }
  })) throw unavailable()
  const audit = deps.audit ?? (() => {})
  for (const pool of [deps.app,deps.binder]) {
    pool.on('error', () => {})
    pool.on('connect', (client) => client.on('error', () => {}))
  }

  async function identityFor(request: IncomingMessage): Promise<WorkspaceSessionIdentity> {
    const identity = await deps.resolve(authorization(request))
    validateIdentity(identity)
    await identity.assertCurrent()
    return identity
  }

  async function binderOperation<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient | undefined
    let clean = false
    try {
      client = await deps.binder.connect()
      await guardBinder(client)
      const result = await operation(client)
      await client.query('DISCARD ALL')
      clean = true
      return result
    } finally {
      client?.release(!clean)
    }
  }

  async function readStaffProjects(identity: WorkspaceSessionIdentity,
    token: string, requestId: string): Promise<unknown> {
    let binder: PoolClient | undefined
    let app: PoolClient | undefined
    let binderClean = false
    let appClean = false
    let transaction = false
    let result: unknown
    let caught: unknown
    try {
      binder = await deps.binder.connect()
      await guardBinder(binder)
      const expires = new Date(Math.min(identity.expiresAt, Date.now() + 30_000))
      const issued = await binder.query(
        'SELECT * FROM auth.issue_workspace_context_ticket($1,$2,$3,$4,$5,$6)',
        [identity.principalId,digest(identity.sessionRef),digest(token),expires,requestId,identity.principalId]
      )
      if (issued.rows.length !== 1) throw denied()
      await binder.query('DISCARD ALL'); binderClean = true

      app = await deps.app.connect()
      await guardAppLogin(app)
      await app.query(`SET ROLE ${workspaceRole}`)
      await guardWorkspaceRole(app)
      await app.query('SELECT auth.clear_workspace_context()')
      await app.query('SELECT auth.redeem_workspace_context_ticket($1,$2)',
        [issued.rows[0].ticket_id,identity.principalId])
      await app.query('BEGIN'); transaction = true
      await app.query("SET LOCAL statement_timeout='3s'")
      const response = envelope((await app.query(
        'SELECT service.read_staff_workspace_projects() AS result'
      )).rows[0]?.result)
      await app.query('COMMIT'); transaction = false
      if (response.status === 'DENY') throw denied()
      if (response.status !== 'ALLOW') throw unavailable()
      result = staffProjects(response.data)
      await identity.assertCurrent()
    } catch (error) {
      caught = error instanceof AppError ? error : databaseFailure(error)
      if (app && transaction) {
        try { await app.query('ROLLBACK') } catch {}
      }
    } finally {
      if (app) {
        try {
          await app.query('SELECT auth.clear_workspace_context()')
          await app.query('RESET ROLE')
          await app.query('DISCARD ALL')
          appClean = true
        } catch { caught = unavailable() }
        app.release(!appClean)
      }
      binder?.release(!binderClean)
    }
    if (caught) throw caught
    return result
  }

  return {
    async handle(request, response) {
      const requestId = randomUUID()
      response.setHeader('X-Request-ID', requestId)
      let operation: WorkspaceAuditEvent['operation'] = 'LIST'
      let decision: WorkspaceAuditEvent['decision'] = 'UNAVAILABLE'
      try {
        if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')
            || forbiddenScopeHeaders.some((header) => request.headers[header] !== undefined)) throw denied()
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')
        exactQuery(url)
        const method = request.method ?? 'GET'

        if (method === 'GET' && url.pathname === '/v1/me/workspaces') {
          operation = 'LIST'
          const identity = await identityFor(request)
          const result = envelope(await binderOperation(async (client) =>
            (await client.query('SELECT auth.list_available_workspaces($1,$2) AS result',
              [identity.principalId,requestId])).rows[0]?.result
          ))
          if (result.status !== 'ALLOW') throw denied()
          await identity.assertCurrent()
          decision = 'ALLOW'
          return json(response, 200, workspaceList(result.data))
        }

        if (method === 'POST' && url.pathname === '/v1/workspace-contexts') {
          operation = 'SWITCH'
          const identity = await identityFor(request)
          verifyMutation(request,identity,allowedOrigins)
          const body = await objectBody(request)
          if (Object.keys(body).join(',') !== 'workspaceBindingId'
              || typeof body.workspaceBindingId !== 'string'
              || !uuid.test(body.workspaceBindingId)) {
            throw new AppError(400, 'WORKSPACE_BINDING_REQUIRED', '工作区选择无效')
          }
          const token = randomBytes(32).toString('base64url')
          const expiresAt = Math.min(identity.expiresAt, Date.now() + 8 * 60 * 60 * 1000)
          if (expiresAt <= Date.now()) throw denied()
          const result = envelope(await binderOperation(async (client) =>
            (await client.query(
              'SELECT auth.rotate_workspace_session($1,$2,$3,$4,$5,$6) AS result',
              [identity.principalId,body.workspaceBindingId,digest(identity.sessionRef),
                digest(token),new Date(expiresAt),requestId]
            )).rows[0]?.result
          ))
          if (result.status !== 'ALLOW') throw denied()
          await identity.assertCurrent()
          const maxAge = Math.max(1,Math.floor((expiresAt-Date.now())/1000))
          response.setHeader('Set-Cookie', `${contextCookie}=${token}; Path=/v1; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`)
          decision = 'ALLOW'
          return json(response, 200, workspaceContext(result.data))
        }

        if (method === 'GET' && url.pathname === '/v1/staff/projects') {
          operation = 'READ_STAFF_PROJECTS'
          const identity = await identityFor(request)
          const result = await readStaffProjects(identity,cookieValue(request),requestId)
          decision = 'ALLOW'
          return json(response, 200, result)
        }

        if (method === 'DELETE' && url.pathname === '/v1/workspace-contexts') {
          operation = 'LOGOUT'
          const identity = await identityFor(request)
          verifyMutation(request,identity,allowedOrigins)
          await binderOperation((client) => client.query(
            'SELECT auth.revoke_workspace_sessions($1,$2,$3)',
            [identity.principalId,digest(identity.sessionRef),requestId]
          ))
          await identity.assertCurrent()
          response.setHeader('Set-Cookie', `${contextCookie}=; Path=/v1; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)
          decision = 'ALLOW'
          return json(response, 204)
        }
        throw new AppError(404, 'ROUTE_NOT_FOUND', '接口不存在')
      } catch (error) {
        const failure = error instanceof AppError ? error : unavailable()
        decision = failure.status < 500 ? 'DENY' : 'UNAVAILABLE'
        return json(response,failure.status,{ error: { code: failure.code, message: failure.message } })
      } finally {
        try { audit({ requestId,operation,decision }) } catch {}
      }
    },
    close: async () => { await Promise.all([deps.app.end(),deps.binder.end()]) }
  }
}
