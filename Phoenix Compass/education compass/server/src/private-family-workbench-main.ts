import { createServer } from 'node:http'
import { Pool } from 'pg'
import { createPrivateFamilyWorkbench } from './services/private-family-workbench'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error('Missing private workbench configuration')
  return value
}

function databaseUrl(name: string): URL {
  const url = new URL(required(name))
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  const parameters = [...url.searchParams.keys()]
  const ssl = url.searchParams.get('sslmode')
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username ||
      !/^\/[^/]+$/.test(url.pathname) || url.hash || parameters.length > 1 ||
      parameters.some(key => key !== 'sslmode') || (ssl !== 'verify-full' && !(local && (ssl === null || ssl === 'disable')))) {
    throw new Error('Invalid private workbench database configuration')
  }
  return url
}

async function main(): Promise<void> {
  if (process.env.PRIVATE_WORKBENCH_MODE !== 'private-family') throw new Error('Private workbench is disabled')
  const port = Number(required('PRIVATE_WORKBENCH_PORT'))
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid private workbench port')
  const app = databaseUrl('PRIVATE_WORKBENCH_APP_URL')
  const binder = databaseUrl('PRIVATE_WORKBENCH_BINDER_URL')
  if (app.hostname !== binder.hostname || (app.port || '5432') !== (binder.port || '5432') ||
      decodeURIComponent(app.pathname) !== decodeURIComponent(binder.pathname) ||
      decodeURIComponent(app.username) === decodeURIComponent(binder.username)) {
    throw new Error('Private workbench requires separate roles on the same database')
  }
  const gateway = createPrivateFamilyWorkbench({
    app: new Pool({ connectionString: app.href, max: 4, connectionTimeoutMillis: 3000, application_name: 'private_family_workbench_app' }),
    binder: new Pool({ connectionString: binder.href, max: 4, connectionTimeoutMillis: 3000, application_name: 'private_family_workbench_binder' }),
    authorityOrigin: required('PRIVATE_WORKBENCH_AUTHORITY_ORIGIN'),
    authorityKey: required('PRIVATE_WORKBENCH_AUTHORITY_KEY')
  })
  const server = createServer({ headersTimeout: 5000, requestTimeout: 10000 }, (request, response) => {
    void gateway.handle(request, response)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  process.stdout.write('Private FAMILY workbench listening on loopback\n')
  const stop = () => server.close(() => {
    void gateway.close().catch(() => { process.exitCode = 1 })
  })
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

void main().catch(() => {
  process.stderr.write('Private FAMILY workbench startup failed\n')
  process.exitCode = 1
})
