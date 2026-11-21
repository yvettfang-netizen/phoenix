import assert from 'node:assert/strict'
import { AddressInfo } from 'node:net'
import test from 'node:test'
import { AppDependencies, createAppServer } from '../src/http/app'

const dependencies = (workspaceAccess?: AppDependencies['workspaceAccess']): AppDependencies => ({
  auth: { authenticate() { throw new Error('LEGACY_AUTH_MUST_NOT_BE_USED') } },
  profiles: {}, assessments: {}, orders: {}, reports: {}, workspaceAccess
} as unknown as AppDependencies)

test('workspace routes are absent unless the verified workspace component is explicitly composed', async t => {
  const server = createAppServer(dependencies())
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  for (const path of ['/v1/me/workspaces','/v1/workspace-contexts','/v1/staff/projects']) {
    assert.equal((await fetch(origin + path)).status, 404)
  }
})

test('workspace routes are forwarded only to their explicitly injected component', async t => {
  const routes: string[] = []
  const workspaceAccess = {
    async handle(request: Parameters<NonNullable<AppDependencies['workspaceAccess']>['handle']>[0],
      response: Parameters<NonNullable<AppDependencies['workspaceAccess']>['handle']>[1]) {
      routes.push(new URL(request.url ?? '/', 'http://localhost').pathname)
      response.statusCode = 204
      response.end()
    },
    async close() {}
  }
  const server = createAppServer(dependencies(workspaceAccess))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  for (const path of ['/v1/me/workspaces','/v1/workspace-contexts','/v1/staff/projects']) {
    assert.equal((await fetch(origin + path)).status, 204)
  }
  assert.deepEqual(routes, ['/v1/me/workspaces','/v1/workspace-contexts','/v1/staff/projects'])
})
