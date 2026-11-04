import assert from 'node:assert/strict'
import test from 'node:test'
import { AddressInfo } from 'node:net'
import { createAppServer, AppDependencies } from '../src/http/app'
import { loadLearningCatalog } from '../src/services/canonical-learning-catalog'

test('catalog is absent by default, and production/non-loopback activation is refused before reading secrets', async () => {
  assert.equal(await loadLearningCatalog({}), undefined)
  for (const env of [{NODE_ENV:'production'}, {NODE_ENV:'development',LISTEN_HOST:'0.0.0.0'}]) {
    await assert.rejects(loadLearningCatalog({...env,CANONICAL_LEARNING_CATALOG_ENABLED:'true'}))
  }
})

test('catalog route does not invoke legacy authentication/store and refuses unsupported inputs', async t => {
  let calls = 0
  const server = createAppServer({
    auth: { authenticate() { throw new Error('LEGACY_AUTH_MUST_NOT_BE_USED') } },
    learningCatalog: { authorize(value: string) { assert.equal(value,'Bearer synthetic') },
      async list() { calls++; return {schemaVersion:'learning-catalog.v1',items:[]} }, async close() {} }
  } as unknown as AppDependencies)
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const get = await fetch(`${origin}/v1/learning/catalog`,{headers:{authorization:'Bearer synthetic'}})
  assert.equal(get.status,200)
  assert.equal(get.headers.get('cache-control'),'private, no-store')
  assert.deepEqual(await get.json(),{schemaVersion:'learning-catalog.v1',items:[]})
  assert.equal((await fetch(`${origin}/v1/learning/catalog?principal=forged`)).status,400)
  assert.equal((await fetch(`${origin}/v1/learning/catalog`,{method:'POST'})).status,405)
  assert.equal(calls,1)
})
