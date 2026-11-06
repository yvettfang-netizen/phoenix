import { request as httpRequest, IncomingMessage } from 'node:http'
import { isIP } from 'node:net'
import path from 'node:path'
import { Pool } from 'pg'
import { AppError } from '../domain/errors'
import {
  createServiceWorkbench,
  WorkbenchDependencies,
  WorkbenchIdentity,
  WorkbenchObjects,
} from './service-workbench'

/**
 * Private staging is intentionally a separate composition. The normal server
 * bootstrap never reads these variables and remains unchanged.
 *
 * The authority contract is machine authenticated and loopback-only. A
 * backend resolve request is `{action:"resolve-bearer",token}` where token is
 * the opaque bearer received from the customer or staff session. The website
 * adapter uses the same endpoint with `{action:"resolve-customer",
 * customerId,sessionHash}` or `{action:"resolve-staff",staffSession}`.
 * Backend resolution returns the verified Canonical principal, actor and
 * family IDs. Current-state checks use `{action:"assert-current",token,
 * channel}` and accept an empty 204 response only.
 */

const LOOPBACK_NAMES = new Set(['localhost', '127.0.0.1', '::1'])
const TOKEN = /^[A-Za-z0-9_-]{32,256}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DB_NAME = /^phoenix_[a-z0-9_]+_staging$/
const IDENTITY_PATH = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]{1,180}$/
const MACHINE_TOKEN = /^[A-Za-z0-9._~-]{32,512}$/

export type StagingIdentityTransport =
  | { kind: 'http'; url: string }
  | { kind: 'unix'; socketPath: string; path: string }

export interface PrivateStagingConfig {
  mode: 'private-staging'
  listenHost: '127.0.0.1' | '::1'
  listenPort: number
  databaseName: string
  appDsn: string
  binderDsn: string
  machineToken: string
  identity: StagingIdentityTransport
  identityTimeoutMs: number
}

export interface StagingResolvedIdentity {
  principalId: string
  actorPersonId: string
  familyId: string
  channel: 'FAMILY' | 'ADVISOR'
  assertionToken: string
  expiresAt: string
}

export interface StagingIdentityAuthority {
  resolveBearer(token: string): Promise<StagingResolvedIdentity | null>
  assertCurrent(assertionToken: string, channel?: 'FAMILY' | 'ADVISOR'): Promise<void>
  check?(): Promise<void>
  close?(): Promise<void>
}

export interface PrivateStagingDependencies {
  app?: Pool
  binder?: Pool
  objects?: WorkbenchObjects
  authority?: StagingIdentityAuthority
}

export interface PrivateStagingReadiness {
  status: 'ready' | 'blocked'
  mode: 'private-staging'
  listener: { host: 'loopback'; port: number }
  database: { name: string; appRole: string; binderRole: string }
  identity: { transport: 'http-loopback' | 'unix'; machineAuth: 'configured' }
  objectStorage: 'configured' | 'disabled-fail-closed'
  syntheticLogin: false
  checks: { configuration: 'pass'; identityAuthority: 'pass' | 'blocked'; pools: 'provided' | 'created' }
}

function fail(code: string, message: string): AppError {
  return new AppError(503, code, message)
}

function loopbackHost(hostname: string): boolean {
  return LOOPBACK_NAMES.has(hostname) || isIP(hostname) === 6 && hostname === '::1'
}

function parsePort(value: string | undefined): number {
  if (!value || !/^\d{1,5}$/.test(value)) throw fail('STAGING_CONFIG_INVALID', '私有 Staging 监听端口无效')
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw fail('STAGING_CONFIG_INVALID', '私有 Staging 监听端口无效')
  return port
}

function parseDatabaseDsn(value: string | undefined, databaseName: string, label: string): { dsn: string; role: string } {
  if (!value) throw fail('STAGING_CONFIG_MISSING', `缺少 ${label} 数据库连接配置`)
  let url: URL
  try { url = new URL(value) } catch { throw fail('STAGING_CONFIG_INVALID', `${label} 数据库连接配置无效`) }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !loopbackHost(url.hostname) ||
      url.search || url.hash) {
    throw fail('STAGING_CONFIG_INVALID', `${label} 数据库必须使用 loopback PostgreSQL`)
  }
  const pathName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (pathName !== databaseName || !url.username || ['postgres', 'root'].includes(url.username.toLowerCase())) {
    throw fail('STAGING_CONFIG_INVALID', `${label} 数据库必须使用专用 Staging 库和角色`)
  }
  return { dsn: value, role: decodeURIComponent(url.username) }
}

function parseIdentityTransport(env: NodeJS.ProcessEnv): StagingIdentityTransport {
  const endpoint = env.PHOENIX_STAGING_IDENTITY_URL
  const socketPath = env.PHOENIX_STAGING_IDENTITY_SOCKET
  const endpointPath = env.PHOENIX_STAGING_IDENTITY_PATH ?? '/v1/workbench/session'
  if (!IDENTITY_PATH.test(endpointPath) || endpointPath.includes('..')) {
    throw fail('STAGING_CONFIG_INVALID', '身份 authority 路径无效')
  }
  if ((endpoint && socketPath) || (!endpoint && !socketPath)) {
    throw fail('STAGING_CONFIG_MISSING', '必须配置一个 loopback HTTP 或 Unix socket 身份 authority')
  }
  if (endpoint) {
    let url: URL
    try { url = new URL(endpoint) } catch { throw fail('STAGING_CONFIG_INVALID', '身份 authority URL 无效') }
    if (url.protocol !== 'http:' || !loopbackHost(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw fail('STAGING_CONFIG_INVALID', '身份 authority 必须是无凭据的 loopback HTTP 根地址')
    }
    return { kind: 'http', url: `${url.origin}${endpointPath}` }
  }
  if (!path.isAbsolute(socketPath!)) throw fail('STAGING_CONFIG_INVALID', '身份 Unix socket 路径必须是绝对路径')
  return { kind: 'unix', socketPath: socketPath!, path: endpointPath }
}

export function readPrivateStagingConfig(env: NodeJS.ProcessEnv = process.env): PrivateStagingConfig {
  if (env.PHOENIX_SERVICE_WORKBENCH_MODE !== 'private-staging') {
    throw fail('STAGING_MODE_REQUIRED', '私有 Staging 模式未启用')
  }
  const listenHost = env.PHOENIX_SERVICE_WORKBENCH_HOST
  if (listenHost !== '127.0.0.1' && listenHost !== '::1') {
    throw fail('STAGING_CONFIG_INVALID', '私有 Staging 只允许 loopback 监听地址')
  }
  const databaseName = env.PHOENIX_STAGING_DB_NAME
  if (!databaseName || !DB_NAME.test(databaseName) || /(?:prod|production|main)/i.test(databaseName)) {
    throw fail('STAGING_CONFIG_INVALID', '必须指定专用 Phoenix Staging 数据库名')
  }
  const app = parseDatabaseDsn(env.PHOENIX_STAGING_APP_DSN, databaseName, 'app')
  const binder = parseDatabaseDsn(env.PHOENIX_STAGING_BINDER_DSN, databaseName, 'binder')
  if (app.role === binder.role) throw fail('STAGING_CONFIG_INVALID', 'app 与 binder 必须使用不同数据库角色')
  const machineToken = env.WORKBENCH_STAGING_IDENTITY_KEY
  if (!machineToken || !MACHINE_TOKEN.test(machineToken)) throw fail('STAGING_CONFIG_MISSING', '身份 authority machine token 未配置')
  const timeout = Number(env.PHOENIX_STAGING_IDENTITY_TIMEOUT_MS ?? '3000')
  if (!Number.isInteger(timeout) || timeout < 250 || timeout > 10000) throw fail('STAGING_CONFIG_INVALID', '身份 authority 超时配置无效')
  return {
    mode: 'private-staging',
    listenHost,
    listenPort: parsePort(env.PHOENIX_SERVICE_WORKBENCH_PORT),
    databaseName,
    appDsn: app.dsn,
    binderDsn: binder.dsn,
    machineToken,
    identity: parseIdentityTransport(env),
    identityTimeoutMs: timeout,
  }
}

function strictIdentity(value: unknown): StagingResolvedIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('STAGING_IDENTITY_INVALID', '身份 authority 返回无效响应')
  const data = value as Record<string, unknown>
  if (data.status !== 'ALLOW' || !UUID.test(String(data.principalId)) || !UUID.test(String(data.actorPersonId)) ||
    !UUID.test(String(data.familyId)) || !['FAMILY', 'ADVISOR'].includes(String(data.channel)) ||
    !TOKEN.test(String(data.assertionToken)) || typeof data.expiresAt !== 'string') {
    throw fail('STAGING_IDENTITY_INVALID', '身份 authority 返回不完整身份')
  }
  const expires = Date.parse(data.expiresAt)
  if (!Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + 60_000) {
    throw fail('STAGING_IDENTITY_INVALID', '身份 assertion 有效期无效')
  }
  return {
    principalId: String(data.principalId),
    actorPersonId: String(data.actorPersonId),
    familyId: String(data.familyId),
    channel: data.channel as 'FAMILY' | 'ADVISOR',
    assertionToken: String(data.assertionToken),
    expiresAt: data.expiresAt,
  }
}

async function readResponse(response: IncomingMessage, maxBytes = 64 * 1024): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of response) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > maxBytes) throw fail('STAGING_IDENTITY_INVALID', '身份 authority 响应过大')
    chunks.push(bytes)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown } catch { throw fail('STAGING_IDENTITY_INVALID', '身份 authority 响应不是 JSON') }
}

export function createPrivateStagingAuthority(config: PrivateStagingConfig): StagingIdentityAuthority {
  const call = async (payload: Record<string, string>, emptyOk = false): Promise<unknown> => new Promise((resolve, reject) => {
    const headers = {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.machineToken}`,
    }
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    const target = config.identity.kind === 'http'
      ? new URL(config.identity.url)
      : undefined
    const request = httpRequest(target ? {
      hostname: target.hostname,
      port: Number(target.port || 80),
      path: target.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': body.length },
    } : {
      socketPath: config.identity.kind === 'unix' ? config.identity.socketPath : undefined,
      path: config.identity.kind === 'unix' ? config.identity.path : '/',
      method: 'POST',
      headers: { ...headers, 'Content-Length': body.length },
    }, async response => {
      try {
        const parsed = response.statusCode === 204 && emptyOk ? null : await readResponse(response)
        if (response.statusCode !== 200 && !(emptyOk && response.statusCode === 204)) throw fail('STAGING_IDENTITY_UNAVAILABLE', '身份 authority 未授权请求')
        resolve(parsed)
      } catch (error) { reject(error) }
    })
    request.setTimeout(config.identityTimeoutMs, () => request.destroy(fail('STAGING_IDENTITY_UNAVAILABLE', '身份 authority 超时')))
    request.once('error', error => reject(error instanceof AppError ? error : fail('STAGING_IDENTITY_UNAVAILABLE', '身份 authority 不可用')))
    request.end(body)
  })
  return {
    async resolveBearer(token) {
      if (!TOKEN.test(token)) return null
      const parsed = await call({ action: 'resolve-bearer', token })
      if (!parsed || typeof parsed !== 'object' || (parsed as Record<string, unknown>).status === 'DENY') return null
      return strictIdentity(parsed)
    },
    async assertCurrent(assertionToken, channel) {
      if (!TOKEN.test(assertionToken)) throw fail('STAGING_IDENTITY_INVALID', '身份 assertion 无效')
      await call({ action: 'assert-current', token: assertionToken, ...(channel ? { channel } : {}) }, true)
    },
    async check() {
      await call({ action: 'readiness' }, true)
    },
  }
}

function failClosedObjects(): WorkbenchObjects {
  const unavailable = async (): Promise<never> => { throw fail('STAGING_OBJECT_STORAGE_UNAVAILABLE', '私有 Staging 文件存储未配置') }
  return { put: unavailable, get: unavailable }
}

export function createPrivateStagingResolver(authority: StagingIdentityAuthority): WorkbenchDependencies['resolve'] {
  return async authorization => {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!TOKEN.test(token)) throw new AppError(401, 'AUTH_REQUIRED', '请先登录')
    const resolved = await authority.resolveBearer(token)
    if (!resolved) throw new AppError(403, 'ACCESS_DENIED', '身份未获授权')
    const identity: WorkbenchIdentity = {
      principalId: resolved.principalId,
      actorPersonId: resolved.actorPersonId,
      familyId: resolved.familyId,
      channel: resolved.channel,
      async assertCurrent() {
        if (Date.parse(resolved.expiresAt) <= Date.now()) throw new AppError(401, 'AUTH_EXPIRED', '登录已过期')
        await authority.assertCurrent(resolved.assertionToken, resolved.channel)
      },
    }
    return identity
  }
}

export function privateStagingReadiness(
  config: PrivateStagingConfig,
  dependencies: { authority?: StagingIdentityAuthority; app?: Pool; binder?: Pool; objects?: WorkbenchObjects } = {},
): PrivateStagingReadiness {
  const identity = Boolean(dependencies.authority)
  const pools = Boolean(dependencies.app && dependencies.binder)
  return {
    status: identity && pools ? 'ready' : 'blocked',
    mode: 'private-staging',
    listener: { host: 'loopback', port: config.listenPort },
    database: {
      name: config.databaseName,
      appRole: new URL(config.appDsn).username,
      binderRole: new URL(config.binderDsn).username,
    },
    identity: { transport: config.identity.kind === 'http' ? 'http-loopback' : 'unix', machineAuth: 'configured' },
    objectStorage: dependencies.objects ? 'configured' : 'disabled-fail-closed',
    syntheticLogin: false,
    checks: { configuration: 'pass', identityAuthority: identity ? 'pass' : 'blocked', pools: pools ? 'provided' : 'created' },
  }
}

export async function privateStagingProjectSafetyGuard(
  client: { query(sql: string, params?: unknown[]): Promise<{ rows: Array<{ mixed?: boolean }> }> },
  identity: Pick<StagingResolvedIdentity, 'channel'>,
  project?: string,
): Promise<void> {
  // 0039 customer scope rejects secondary HEALTH for FAMILY. Staff requests
  // use the legacy snapshot/command path, so private staging closes that
  // mixed-domain path before any projection or mutation.
  if (identity.channel !== 'ADVISOR') return
  const result = await client.query(
    'SELECT service.workbench_staging_staff_mixed_health($1::uuid) AS mixed', [project ?? null],
  )
  if (result.rows[0]?.mixed !== false) {
    throw new AppError(403, 'MIXED_HEALTH_PROJECT_DENIED', '混合健康项目在私有 Staging 中被关闭')
  }
}

export function createPrivateStagingWorkbench(config: PrivateStagingConfig, dependencies: PrivateStagingDependencies = {}) {
  if (config.mode !== 'private-staging') throw fail('STAGING_MODE_REQUIRED', '私有 Staging 模式未启用')
  const authority = dependencies.authority ?? createPrivateStagingAuthority(config)
  const app = dependencies.app ?? new Pool({ connectionString: config.appDsn, max: 5 })
  const binder = dependencies.binder ?? new Pool({ connectionString: config.binderDsn, max: 2 })
  const service = createServiceWorkbench({
    app,
    binder,
    objects: dependencies.objects ?? failClosedObjects(),
    resolve: createPrivateStagingResolver(authority),
    mode: 'private-staging',
    customerAuthorizationMode: 'verified-channel',
    projectSafetyGuard: privateStagingProjectSafetyGuard,
  })
  return {
    handle: service.handle,
    readiness: () => privateStagingReadiness(config, { authority, app, binder, objects: dependencies.objects }),
    async checkReadiness() {
      const current = privateStagingReadiness(config, { authority, app, binder, objects: dependencies.objects })
      if (current.status !== 'ready') return current
      try {
        const [appProbe, binderProbe] = await Promise.all([
          app.query('SELECT current_database() AS name, current_user AS role'),
          binder.query('SELECT current_database() AS name, current_user AS role'),
          authority.check?.(),
        ]) as unknown as [{ rows: Array<{ name: string; role: string }> }, { rows: Array<{ name: string; role: string }> }]
        const appRole = new URL(config.appDsn).username
        const binderRole = new URL(config.binderDsn).username
        if (appProbe.rows[0]?.name !== config.databaseName || appProbe.rows[0]?.role !== appRole ||
          binderProbe.rows[0]?.name !== config.databaseName || binderProbe.rows[0]?.role !== binderRole) {
          throw new Error('staging database identity mismatch')
        }
        return current
      } catch {
        return { ...current, status: 'blocked' as const }
      }
    },
    async close() {
      await service.close()
      await authority.close?.()
    },
  }
}
