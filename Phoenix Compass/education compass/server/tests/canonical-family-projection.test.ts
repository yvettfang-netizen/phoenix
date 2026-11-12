import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { AddressInfo } from 'node:net'
import { createSyntheticFamilyVerifier } from '../src/auth/synthetic-family-identity'
import { loadFamilyProjection } from '../src/services/canonical-family-projection'
import { AppDependencies, createAppServer } from '../src/http/app'

const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
const jwk={...publicKey.export({format:'jwk'}),kid:'synthetic-key',alg:'ES256',use:'sig'}
const config={issuer:'https://family-projection.synthetic.invalid',audience:'family-projection-synthetic',jwk}
const verifier=createSyntheticFamilyVerifier(config)
const claims=()=>({iss:config.issuer,aud:config.audience,sub:'usr_synthetic_parent',application_family_id:'fam_'+'a'.repeat(32),
  iat:Math.floor(Date.now()/1000),nbf:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+45,jti:randomUUID()})
function token(payload: Record<string,unknown>,header:Record<string,unknown>={alg:'ES256',typ:'JWT',kid:jwk.kid}) {
  const input=[header,payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')
  return input+'.'+sign('sha256',Buffer.from(input),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')
}
test('synthetic identity verifies P-256 proof; real issuer configuration is refused',()=>{
  assert.equal(verifier('Bearer '+token(claims())).sub,'usr_synthetic_parent')
  assert.throws(()=>createSyntheticFamilyVerifier({...config,issuer:'https://actual-provider.example'}))
  assert.throws(()=>createSyntheticFamilyVerifier({...config,jwk:{...jwk,d:'private-key-not-allowed'}}))
})
test('forged, missing, wrong algorithm/kid/issuer/audience/subject/family and invalid time claims fail closed',()=>{
  const p=claims()
  for(const change of [{iss:'https://untrusted.invalid'},{aud:'wrong'},{sub:'not-a-user'},{application_family_id:'not-a-family'},
    {application_family_id:[p.application_family_id]},{exp:p.iat-1},{exp:p.iat+100},{iat:p.iat+10},{nbf:p.iat+10},{jti:5}]) {
    assert.throws(()=>verifier('Bearer '+token({...p,...change})))
  }
  for(const header of [{alg:'none',typ:'JWT',kid:jwk.kid},{alg:'RS256',typ:'JWT',kid:jwk.kid},{alg:'ES256',typ:'JWT',kid:'unknown'}]) {
    assert.throws(()=>verifier('Bearer '+token(p,header)))
  }
  assert.throws(()=>verifier())
  const valid=token(p),parts=valid.split('.'); parts[2]='A'.repeat(86)
  assert.throws(()=>verifier('Bearer '+parts.join('.')))
})
test('projection default and production/non-loopback gates do not read any identity or connection files',async()=>{
  assert.equal(await loadFamilyProjection({}),undefined)
  await assert.rejects(loadFamilyProjection({NODE_ENV:'production',CANONICAL_FAMILY_PROJECTION_ENABLED:'true'}))
  await assert.rejects(loadFamilyProjection({LISTEN_HOST:'0.0.0.0',CANONICAL_FAMILY_PROJECTION_ENABLED:'true'}))
})
test('new HTTP projection routes refuse client identity assertions, queries, writes and unknown paths without legacy auth',async t=>{
  let calls=0
  const server=createAppServer({auth:{authenticate(){throw Error('Legacy auth forbidden')}},familyProjection:{
    async read(){calls++;return {schemaVersion:'family-summary.v1',family:{familyRef:'synthetic',displayName:'Synthetic'}}},async close(){}
  }} as unknown as AppDependencies)
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())))
  const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/canonical/projections/`
  const response=await fetch(origin+'family')
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store')
  assert.match(response.headers.get('x-request-id')??'',/^[a-f0-9-]{36}$/)
  assert.equal((await fetch(origin+'family?principal=forged')).status,400)
  assert.equal((await fetch(origin+'family',{headers:{'x-family-id':'forged'}})).status,403)
  assert.equal((await fetch(origin+'family',{method:'POST'})).status,405)
  assert.equal((await fetch(origin+'unknown')).status,404)
  assert.equal(calls,1)
})

test('session HTTP entry is independently default off and never delegates to the legacy JWT projection', async t => {
  let sessionCalls = 0, legacyCalls = 0
  const server = createAppServer({ familyProjection: { async read() { legacyCalls++; return {} }, async close() {} },
    sessionFamilyProjection: { async read(authorization: string) { assert.equal(authorization, 'Bearer opaque_synthetic_session'); sessionCalls++; return {} }, async close() {} }
  } as unknown as AppDependencies)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  assert.equal((await fetch(origin + '/v1/canonical/session-projections/family', { headers: { authorization: 'Bearer opaque_synthetic_session' } })).status, 200)
  assert.equal((await fetch(origin + '/v1/canonical/projections/family')).status, 200)
  assert.equal(sessionCalls, 1); assert.equal(legacyCalls, 1)
  const disabled = createAppServer({ familyProjection: { async read() { legacyCalls++; return {} }, async close() {} } } as unknown as AppDependencies)
  await new Promise<void>(resolve => disabled.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>(resolve => disabled.close(() => resolve())))
  assert.equal((await fetch(`http://127.0.0.1:${(disabled.address() as AddressInfo).port}/v1/canonical/session-projections/family`)).status, 404)
  assert.equal(legacyCalls, 1)
})
