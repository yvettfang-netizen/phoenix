'use strict'
const http = require('node:http')
const crypto = require('node:crypto')

// Canonical PostgreSQL is the only business store. This adapter has no local DB,
// demo principal, CREATE TABLE, or fallback. A trusted, server-owned Canonical
// provider must perform session verification, RLS/context checks and writes.
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8787
const MAX_BODY_BYTES = 64 * 1024
const isLoopback = (host) => ['127.0.0.1', 'localhost', '::1'].includes(host)

function send(response, code, payload) {
  response.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  })
  response.end(JSON.stringify(payload))
}
async function readJson(request) {
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
    throw Object.assign(new Error('JSON_REQUIRED'), { status: 415 })
  }
  let size = 0
  const chunks = []
  for await (const part of request) {
    size += part.length
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('TOO_LARGE'), { status: 413 })
    chunks.push(part)
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error()
    return result
  } catch {
    throw Object.assign(new Error('INVALID_JSON'), { status: 400 })
  }
}

function createBackend(options = {}) {
  const host = options.host || process.env.PFS_BACKEND_HOST || DEFAULT_HOST
  const port = options.port === undefined ? Number(process.env.PFS_BACKEND_PORT || DEFAULT_PORT) : options.port
  if (!isLoopback(host) || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('CANONICAL_GATEWAY_LOOPBACK_ONLY')
  }
  const canonicalProvider = options.canonicalProvider
  if (!canonicalProvider ||
      typeof canonicalProvider.verifySession !== 'function' ||
      typeof canonicalProvider.saveEducationSubmission !== 'function' ||
      typeof canonicalProvider.healthCheck !== 'function') {
    throw new Error('CANONICAL_POSTGRES_PROVIDER_REQUIRED: legacy SQLite and demo sessions have been removed')
  }
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        await canonicalProvider.healthCheck()
        return send(response, 200, { status: 'ok', source: 'canonical-postgresql' })
      }
      if (request.method === 'POST' && request.url === '/v1/questionnaire-submissions') {
        const bearer = String(request.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{32,512})$/)
        if (!bearer) return send(response, 401, { error: { code: 'SIGN_IN_REQUIRED' } })
        const principal = await canonicalProvider.verifySession(bearer[1])
        if (!principal) return send(response, 401, { error: { code: 'SIGN_IN_REQUIRED' } })
        const body = await readJson(request)
        // The provider MUST resolve canonical family and subject from trusted context,
        // rejecting any mismatch with client-supplied IDs; never auto-create them.
        const receipt = await canonicalProvider.saveEducationSubmission({ principal, submission: body, requestId: crypto.randomUUID() })
        if (!receipt || receipt.status !== 'synced' ||
            typeof receipt.submissionId !== 'string' ||
            Number.isNaN(Date.parse(receipt.receivedAt))) {
          throw new Error('INVALID_CANONICAL_RECEIPT')
        }
        return send(response, receipt.duplicate ? 200 : 201, receipt)
      }
      return send(response, 404, { error: { code: 'NOT_FOUND' } })
    } catch (err) {
      const code = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 503
      return send(response, code, { error: { code: code === 503 ? 'CANONICAL_UNAVAILABLE' : String(err.message || 'INVALID_REQUEST') } })
    }
  })
  return {
    server,
    config: { host, port },
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => { server.off('error', reject); resolve(server.address()) })
      })
    },
    close() {
      return new Promise((resolve, reject) => {
        if (!server.listening) return resolve()
        server.close((err) => err ? reject(err) : resolve())
      })
    }
  }
}
if (require.main === module) {
  // No implicit local SQLite, demo or unauthenticated production fallback.
  console.error('CANONICAL_POSTGRES_PROVIDER_REQUIRED: start this adapter through the trusted Canonical service composition root')
  process.exitCode = 1
}
module.exports = { createBackend, DEFAULT_HOST, DEFAULT_PORT, MAX_BODY_BYTES }
