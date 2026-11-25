import assert from 'node:assert/strict'
import test from 'node:test'
import {createSyntheticAuthFixture} from './canonical-auth-fixture.mjs'

const origin='http://127.0.0.1:4315'
const request=cookie=>new Request(origin+'/api/customer-auth/session',{headers:cookie?{cookie}:{}})

test('synthetic identity fixture accepts only a server-created opaque session',async()=>{
 const identity=createSyntheticAuthFixture({origin})
 assert.equal(await identity.config.verifySession(request()),null)
 assert.equal(await identity.config.verifySession(request('phoenix-canonical-test-session=unknown')),null)
 const account=identity.register('client-a','client-a')
 const session=await identity.config.verifySession(request(account.cookie))
 assert.equal(session.id,account.id)
 assert.equal(session.token_hash,account.sessionHash)
 assert.equal(identity.accounts['client-a'],account)
 assert.equal('db' in identity.config,false)
})

test('session revalidation checks current authority expiry and revocation',async()=>{
 const identity=createSyntheticAuthFixture({origin})
 const account=identity.register('client-a','client-a')
 const session=identity.sessions.get(account.sessionHash)
 assert.ok(await identity.config.verifySession(request(account.cookie)))
 session.valid_until=Date.now()-1
 assert.equal(await identity.config.verifySession(request(account.cookie)),null)
 session.valid_until=Date.now()+1000
 identity.sessions.delete(account.sessionHash)
 assert.equal(await identity.config.verifySession(request(account.cookie)),null)
})

test('returned session snapshots cannot mutate the trusted authority record',async()=>{
 const identity=createSyntheticAuthFixture({origin})
 const account=identity.register('client-a','client-a')
 const first=await identity.config.verifySession(request(account.cookie))
 first.id='client-spoof'
 first.valid_until=0
 const current=await identity.config.verifySession(request(account.cookie))
 assert.equal(current.id,account.id)
 assert.ok(current.valid_until>Date.now())
})

test('synthetic audit recorder retains the current AuthConfig correlation contract',async()=>{
 const identity=createSyntheticAuthFixture({origin})
 await identity.config.recordAccess('synthetic-person','CANONICAL_ACCESS_ATTEMPT','request:attempt')
 assert.deepEqual(identity.events,[{actorId:'synthetic-person',action:'CANONICAL_ACCESS_ATTEMPT',requestId:'request:attempt'}])
 assert.throws(()=>createSyntheticAuthFixture({origin:'https://example.com'}))
})
