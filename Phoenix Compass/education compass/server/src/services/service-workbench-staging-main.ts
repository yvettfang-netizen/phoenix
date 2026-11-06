import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { createPrivateStagingWorkbench, readPrivateStagingConfig } from './service-workbench-staging'

function loopback(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' || isIP(address ?? '') === 6 && address === '::1'
}

function json(response: import('node:http').ServerResponse, status: number, body: unknown): void {
  const raw = Buffer.from(JSON.stringify(body), 'utf8')
  response.statusCode = status
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Content-Length', raw.length)
  response.end(raw)
}

const config = readPrivateStagingConfig()
const workbench = createPrivateStagingWorkbench(config)
const server = createServer(async (request, response) => {
  if (!loopback(request.socket.remoteAddress)) {
    json(response, 403, { error: { code: 'LOOPBACK_REQUIRED' } })
    return
  }
  const requestPath = request.url ?? '/'
  if (!requestPath.startsWith('/') || requestPath.startsWith('//')) {
    json(response, 400, { error: { code: 'INVALID_TARGET' } })
    return
  }
  const url = new URL(requestPath, 'http://127.0.0.1')
  if (url.pathname === '/health/ready') {
    if (request.method !== 'GET' || url.search) {
      json(response, 405, { error: { code: 'METHOD_NOT_ALLOWED' } })
      return
    }
    const readiness = await workbench.checkReadiness()
    json(response, readiness.status === 'ready' ? 200 : 503, {
      status: readiness.status,
      runtime: 'private-staging',
      objectStorage: readiness.objectStorage,
    })
    return
  }
  if (!url.pathname.startsWith('/v1/service-workbench/')) {
    json(response, 404, { error: { code: 'NOT_FOUND' } })
    return
  }
  await workbench.handle(request, response)
})

server.on('error', () => process.exitCode = 1)
server.listen(config.listenPort, config.listenHost, () => {
  process.stdout.write(`Phoenix private staging workbench listening on ${config.listenHost}:${config.listenPort}\n`)
})

async function shutdown(): Promise<void> {
  server.close()
  server.closeAllConnections()
  try { await workbench.close() } catch { process.exitCode = 1 }
}
process.once('SIGTERM', () => { void shutdown() })
process.once('SIGINT', () => { void shutdown() })
