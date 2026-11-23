import { randomUUID } from 'node:crypto'
import { constants, readFileSync, closeSync, fstatSync, openSync } from 'node:fs'
import { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:https'
import { join } from 'node:path'
import { Pool, PoolClient } from 'pg'
import { createBrokerVerifier } from './auth/broker-identity'
import { AppError, errorEnvelope } from './domain/errors'

const profile = {
  issuer: 'https://issue97.canonical-nonprod.test/',
  audience: 'phoenix-canonical-postgresql',
  jwksUri: 'https://issue97.canonical-nonprod.test/.well-known/jwks.json'
}
const credentials = '/run/a2-app'
const cardPattern = /^\/v1\/academic-studio\/cards\/(01910000-0000-7000-8000-[0-9]{12})$/
const fixtureId = /^01910000-0000-7000-8000-[0-9]{12}$/
const protectedRequestTimeoutMs = 2500

interface FixtureActor {
  principalId: string
  actorId: string
  familyId: string | null
  channel: 'FAMILY' | 'STAFF' | 'STUDENT'
}

interface RequestAudit {
  requestId: string
  operation: 'readiness' | 'card_read' | 'abort' | 'unknown'
  status: number
  backendPid: number | null
  sqlState: string | null
  rows: number | null
  failure: 'CLIENT_CANCELLED' | 'REQUEST_DEADLINE' | null
}

type ScopedLease = <T>(
  pool: Pool, request: (client: PoolClient) => Promise<T>, options: { signal: AbortSignal }
) => Promise<T>

async function untilAbort<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let abort!: () => void
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason)
  })
  signal.addEventListener('abort', abort, { once: true })
  try {
    return await Promise.race([cancelled, work()])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

function readCredential(name: string): Buffer {
  const descriptor = openSync(join(credentials, name), constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const file = fstatSync(descriptor)
    if (!file.isFile() || file.nlink !== 1 || file.size === 0 || file.size > 32768 ||
        file.uid !== process.getuid?.() || (file.mode & 0o777) !== 0o600) {
      throw new Error('A2_CREDENTIAL_FILE_INVALID')
    }
    return readFileSync(descriptor)
  } finally {
    closeSync(descriptor)
  }
}

function fixtureActors(): Map<string, FixtureActor> {
  const input: unknown = JSON.parse(readCredential('actors.json').toString('utf8'))
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('A2_ACTORS_INVALID')
  const entries = Object.entries(input)
  const actors = new Map<string, FixtureActor>()
  if (entries.length < 3 || entries.length > 10) throw new Error('A2_ACTORS_INVALID')
  for (const [subject, actor] of entries) {
    if (!/^usr_a2_[a-z0-9_]+$/.test(subject) || !actor || typeof actor !== 'object' ||
        Object.keys(actor).sort().join(',') !== 'actorId,channel,familyId,principalId' ||
        typeof actor.principalId !== 'string' || !fixtureId.test(actor.principalId) ||
        typeof actor.actorId !== 'string' || !fixtureId.test(actor.actorId) ||
        !['FAMILY', 'STAFF', 'STUDENT'].includes(actor.channel) ||
        (actor.channel === 'FAMILY'
          ? typeof actor.familyId !== 'string' || !fixtureId.test(actor.familyId)
          : actor.familyId !== null)) {
      throw new Error('A2_ACTORS_INVALID')
    }
    actors.set(subject, Object.freeze(actor))
  }
  if (actors.get('usr_a2_fault')?.channel !== 'STAFF') throw new Error('A2_FAULT_ACTOR_INVALID')
  return actors
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  })
  response.end(JSON.stringify(body))
}

function authorizationToken(request: IncomingMessage): string {
  const header = request.headersDistinct.authorization?.length === 1 ? request.headers.authorization : undefined
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required')
  return header.slice(7)
}

function accessDenied(): AppError {
  return new AppError(403, 'ACCESS_DENIED', 'Access denied')
}

async function main(): Promise<void> {
  const release = process.env.A2_BFF_RELEASE_SHA ?? ''
  if (process.env.NODE_ENV !== 'test' || process.env.PHOENIX_A2_ISOLATED_BFF_ENABLED !== 'true' ||
      process.getuid?.() !== 65534 || !/^[0-9a-f]{40}$/.test(release)) {
    throw new Error('A2_ISOLATED_RUNTIME_REQUIRED')
  }

  // The isolated build packages the adapter next to the compiled entry.
  const { withCanonicalAcademyContext } = require('./safe-context-pool.mjs') as {
    withCanonicalAcademyContext: ScopedLease
  }
  if (typeof withCanonicalAcademyContext !== 'function') throw new Error('A2_ADAPTER_INVALID')
  const actors = fixtureActors()
  const jwks: unknown = JSON.parse(readCredential('jwks.json').toString('utf8'))
  const verifier = createBrokerVerifier(profile, async () => jwks)
  const ca = readCredential('ca.crt')

  function rolePool(role: 'app' | 'binder' | 'reader', group?: string): Pool {
    const password = readCredential(role + '.password').toString('utf8').trim()
    if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('A2_DB_CREDENTIAL_INVALID')
    const pool = new Pool({
      host: 'issue97.canonical-nonprod.test',
      port: 5432,
      database: 'phoenix_canonical_dev',
      user: 'a2_issue97_' + role,
      password,
      ssl: { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      options: group ? '-c role=' + group : undefined,
      application_name: 'a2-isolated-bff-' + role,
      statement_timeout: 3500,
      idle_in_transaction_session_timeout: 5000,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 5000,
      max: 1
    })
    pool.on('error', () => process.stderr.write('A2_IDLE_DB_CONNECTION_DROPPED ' + role + '\n'))
    return pool
  }

  const app = rolePool('app')
  const binder = rolePool('binder', 'phoenix_canonical_context_binder')
  const reader = rolePool('reader', 'phoenix_canonical_reader')

  async function bind(client: PoolClient, actor: FixtureActor, nonce: string, signal: AbortSignal): Promise<void> {
    const ticket = await binder.query<{ id: string }>(
      'SELECT auth.issue_context_ticket($1::uuid,$2::uuid,$3::uuid,$4::text,$5::timestamptz,$6::uuid,$1::uuid) AS id',
      [actor.principalId, actor.actorId, actor.familyId, actor.channel, new Date(Date.now() + 30_000), nonce]
    )
    // Ticket issuance uses a separate pool. A late ticket must not resume a cancelled lease.
    signal.throwIfAborted()
    const id = ticket.rows[0]?.id
    if (ticket.rowCount !== 1 || !id) throw new Error('A2_TICKET_UNAVAILABLE')
    await client.query('SELECT auth.redeem_context_ticket($1::uuid,$2::uuid)', [id, actor.principalId])
    const result = await client.query<{ ok: boolean }>(
      'SELECT auth.current_principal_id()=$1::uuid AND auth.current_actor_person_id()=$2::uuid AND ' +
      'auth.current_family_id() IS NOT DISTINCT FROM $3::uuid AND auth.current_channel()=$4::text AS ok',
      [actor.principalId, actor.actorId, actor.familyId, actor.channel]
    )
    if (result.rows[0]?.ok !== true) throw new Error('A2_CONTEXT_BINDING_FAILED')
  }

  const faultCard = '01910000-0000-7000-8000-000000003206'
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const audit: RequestAudit = {
      requestId: randomUUID(), operation: 'unknown', status: 500, backendPid: null, sqlState: null, rows: null, failure: null
    }
    const client = new AbortController()
    const clientClosed = () => {
      if (!response.writableFinished) client.abort()
    }
    response.once('close', clientClosed)
    let deadline: AbortSignal | undefined
    response.setHeader('X-Request-ID', audit.requestId)
    try {
      const path = request.url ?? ''
      if (request.method === 'GET' && path === '/health') {
        audit.operation = 'readiness'
        const result = await reader.query<{ version: number, count: number, head: string }>(
          "SELECT current_setting('server_version_num')::integer AS version, count(*)::integer AS count, " +
          "max(sha256) FILTER (WHERE migration_name='0037_scoped_public_id_projection_read_audit.sql') AS head " +
          'FROM canonical_migrations.applied'
        )
        const readiness = result.rows[0]
        if (readiness?.count !== 37 || Math.floor(readiness.version / 10000) !== 16 ||
            readiness.head !== '29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2') {
          throw new Error('A2_BASELINE_UNAVAILABLE')
        }
        audit.status = 200
        json(response, 200, { status: 'ok' })
        return
      }

      const cardMatch = request.method === 'GET' ? cardPattern.exec(path) : null
      const isFault = request.method === 'POST' && path === '/__a2/test/abort'
      if (!cardMatch && !isFault) throw new AppError(404, 'NOT_FOUND', 'Not found')
      audit.operation = isFault ? 'abort' : 'card_read'
      deadline = AbortSignal.timeout(protectedRequestTimeoutMs)
      const signal = AbortSignal.any([client.signal, deadline])

      const token = authorizationToken(request)
      const identity = await untilAbort(() => verifier.verify(token), signal)
      const actor = actors.get(identity.sub)
      if (!actor || (isFault && identity.sub !== 'usr_a2_fault')) throw accessDenied()

      const cardId = isFault ? faultCard : cardMatch![1]
      const card = await withCanonicalAcademyContext(app, async (client) => {
        audit.backendPid = (await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid
        await bind(client, actor, audit.requestId, signal)
        const result = await client.query<{ id: string, summary: string }>(
          'SELECT card_id AS id,summary_text AS summary FROM learning.read_published_card($1::uuid)',
          [cardId]
        )
        audit.rows = result.rowCount
        if (isFault && result.rowCount === 1) {
          // The test-only route must dirty a real transaction on the guarded lease.
          await client.query('BEGIN')
          await client.query('SELECT 1/0')
        }
        return result.rows[0]
      }, { signal })
      signal.throwIfAborted()
      if (response.destroyed) throw new Error('A2_CLIENT_CLOSED')
      if (!card) throw accessDenied()
      audit.status = 200
      json(response, 200, { card })
    } catch (error) {
      if (client.signal.aborted || response.destroyed) {
        audit.status = 499
        audit.failure = 'CLIENT_CANCELLED'
        return
      }
      const code = (error as { code?: unknown })?.code
      let failure = error instanceof AppError ? error : new AppError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable')
      if (deadline?.aborted) {
        audit.failure = 'REQUEST_DEADLINE'
        failure = new AppError(504, 'REQUEST_DEADLINE_EXCEEDED', 'Request deadline exceeded')
      } else if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
        audit.sqlState = code
      }
      const body = errorEnvelope(failure)
      audit.status = body.status
      json(response, body.status, body.body)
    } finally {
      response.removeListener('close', clientClosed)
      const decision = audit.status === 200 ? 'ALLOW' : audit.failure || audit.status >= 500 ? 'ERROR' : 'DENY'
      process.stdout.write(JSON.stringify({ event: 'a2_request', utc: new Date().toISOString(), ...audit, decision }) + '\n')
    }
  }

  const server = createServer({
    key: readCredential('server.key'), cert: readCredential('server.crt'),
    minVersion: 'TLSv1.2', headersTimeout: 4000, requestTimeout: 6000, maxHeaderSize: 8192
  }, (request, response) => { void handle(request, response) })
  server.once('error', () => {
    process.stderr.write('A2_BFF_START_FAILED\n')
    process.exit(1)
  })
  server.listen(19497, '127.0.0.1', () => {
    process.stdout.write(JSON.stringify({ event: 'a2_ready', release, utc: new Date().toISOString() }) + '\n')
  })
  const shutdown = () => server.close(() => { void Promise.all([app.end(), binder.end(), reader.end()]) })
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

void main().catch(() => {
  process.stderr.write('A2_BFF_CONFIGURATION_REFUSED\n')
  process.exitCode = 1
})
