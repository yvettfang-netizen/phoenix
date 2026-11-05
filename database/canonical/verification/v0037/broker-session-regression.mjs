import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateKeyPairSync,randomBytes,randomUUID,sign} from 'node:crypto';
import path from 'node:path';

/** Called only inside projection-e2e's labelled, disposable fresh/restored fixture. */
export async function runBrokerSessionRegression({db,sql,id,familyKey,root,work,save,connection,appPassword,binderPassword,docker,nonce}) {
  assert.equal(docker(['inspect','--format','{{index .Config.Labels "canonical.projection.test"}}',db.id]),nonce);
  const require=createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'));
  const {createBrokerVerifier}=require('./dist/auth/broker-identity.js');
  const {loadSessionBoundFamilyProjection}=require('./dist/services/canonical-family-projection.js');
  const {AuthService}=require('./dist/services/auth-service.js');
  const {InMemoryStore}=require('./dist/store/memory-store.js');
  const {MockWechatAuthProvider}=require('./dist/auth/wechat-auth-provider.js');
  const {tokenDigest}=require('./dist/utils/runtime.js');
  const {createAppServer}=require('./dist/http/app.js');
  const profile={issuer:'https://broker.synthetic.invalid/canonical-identity',audience:'phoenix-canonical-postgresql',jwksUri:'https://broker.synthetic.invalid/jwks'};
  for(const [n,sub,status] of [[1,'usr_parent_a','ACTIVE'],[2,'usr_parent_b','ACTIVE'],[14,'usr_disabled_identity','DISABLED']]) {
    sql(db,`INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status,disabled_at)
      SELECT '${id(6100+n)}','${profile.issuer}','${sub}','${id(200+n)}','${status}',${status==='DISABLED'?'now()':'NULL'}
      WHERE NOT EXISTS(SELECT FROM auth.external_identities WHERE issuer='${profile.issuer}' AND subject='${sub}');`);
  }
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk={...pair.publicKey.export({format:'jwk'}),kid:'local-broker-key',alg:'ES256',use:'sig'};
  const secret=randomBytes(32).toString('hex'), store=new InMemoryStore();
  const tokens=new Map(), familyRows=new Map(), now=new Date().toISOString();
  for(const [sub,letter] of [['usr_parent_a','a'],['usr_parent_b','b'],['usr_disabled_identity','c']]) {
    const token=randomBytes(32).toString('base64url');tokens.set(sub,token);familyRows.set(sub,familyKey(letter==='c'?'a':letter));
    await store.transaction(async tx=>{
      await tx.insert('users',{id:sub,role:'family_user',createdAt:now});
      // Disabled subject intentionally uses its own unmatched legacy family, preserving Store uniqueness.
      await tx.insert('families',{id:familyKey(letter),userId:sub,familyName:null,parentName:null,phone:null,location:null,goal:null,createdAt:now,updatedAt:now});
      await tx.insert('sessions',{id:'ses_'+sub,userId:sub,tokenHash:tokenDigest(token,secret),expiresAt:new Date(Date.now()+600_000).toISOString(),revokedAt:null,createdAt:now});
    });
  }
  const auth=new AuthService(store,new MockWechatAuthProvider(),secret),events=[];
  let mode='valid',brokerCalls=0,jwksReads=0;
  function assertion(sub){
    const time=Math.floor(Date.now()/1000);
    const claims={iss:profile.issuer,aud:profile.audience,sub:mode==='wrong-subject'?'usr_parent_b':sub,iat:time,nbf:time,exp:time+300,jti:randomUUID()};
    if(mode==='family-claim')claims.application_family_id=familyKey('b');
    const input=[{alg:'ES256',typ:'JWT',kid:'local-broker-key'},claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
    return input+'.'+sign('sha256',Buffer.from(input),{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
  }
  const appFile=path.join(work,`broker-${db.port}-app.json`),binderFile=path.join(work,`broker-${db.port}-binder.json`);
  save(appFile,JSON.stringify(connection(db,'projection_app',appPassword)));
  save(binderFile,JSON.stringify(connection(db,'projection_binder',binderPassword)));
  const deps={auth,store,verifier:createBrokerVerifier(profile,async uri=>{assert.equal(uri,profile.jwksUri);jwksReads++;return {keys:[jwk]};}),
    async tokenForSubject(sub){brokerCalls++;if(mode==='outage')throw Error('synthetic internal detail');return assertion(sub);}};
  const projection=await loadSessionBoundFamilyProjection({NODE_ENV:'test',CANONICAL_BROKER_SESSION_BRIDGE_ENABLED:'true',
    CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'true',
    CANONICAL_FAMILY_APP_CONFIG_FILE:appFile,CANONICAL_FAMILY_BINDER_CONFIG_FILE:binderFile},deps,event=>events.push(event));
  assert(projection);
  const server=createAppServer({auth,profiles:{},assessments:{},orders:{},reports:{},familyProjection:projection,logger:{error(){}}});
  try {
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const origin=`http://127.0.0.1:${server.address().port}/v1/canonical/projections/`;
    const call=(resource='family',subject='usr_parent_a',extra={})=>fetch(origin+resource,{...extra,headers:{Authorization:'Bearer '+tokens.get(subject),...extra.headers}});
    const clean=()=>{assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(sql(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');};
    for(const sub of ['usr_parent_a','usr_parent_b','usr_parent_a']) {
      const response=await call('family',sub);assert.equal(response.status,200);
      assert.equal((await response.json()).family.displayName,sub==='usr_parent_b'?'Synthetic Family B':'Synthetic Family A');
      const request=response.headers.get('x-request-id');
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${request}' AND action='READ' AND decision='ALLOW'`),'1');
      assert.equal(response.headers.get('cache-control'),'private, no-store');clean();
    }
    let result=await call('students');assert.equal(result.status,200);
    assert.deepEqual((await result.json()).items.map(x=>x.studentRef),['stu_'+id(3).replaceAll('-','')]);
    result=await call('students','usr_parent_b');assert.equal(result.status,200);
    assert.deepEqual((await result.json()).items.map(x=>x.studentRef),['stu_'+id(4).replaceAll('-','')]);
    const callsBefore=brokerCalls;
    assert.equal((await call('family?application_family_id='+familyKey('b'))).status,400);
    assert.equal((await call('family','usr_parent_a',{headers:{'x-family-id':familyKey('b')}})).status,403);
    assert.equal((await call('family','usr_parent_a',{method:'POST',body:'{}'})).status,405);
    assert.equal((await call('students/stu_'+id(4).replaceAll('-',''))).status,403);
    assert.equal(brokerCalls,callsBefore);
    const before=sql(db,'SELECT count(*) FROM audit.access_events');
    for(const bad of ['wrong-subject','family-claim','outage']) {
      mode=bad;result=await call();assert.equal(result.status,bad==='outage'?503:bad==='family-claim'?401:403);
      const body=JSON.stringify(await result.json());assert(!body.includes('Synthetic Family')&&!body.includes('internal detail'));
    }
    assert.equal(sql(db,'SELECT count(*) FROM audit.access_events'),before);mode='valid';
    // Auth/ownership are consulted every request and again before returning the DTO.
    await auth.revokeSession(tokens.get('usr_parent_a'));
    assert.equal((await call()).status,401);
    assert.equal((await call('family','usr_parent_b')).status,200);
    await store.transaction(tx=>tx.update('families',familyKey('b'),{userId:'usr_different_owner'}));
    assert.equal((await call('family','usr_parent_b')).status,403);
    assert.equal((await call('family','usr_disabled_identity')).status,403);
    assert(jwksReads===1&&events.some(x=>x.decision==='ALLOW')&&events.some(x=>x.decision==='DENY')&&events.some(x=>x.decision==='UNAVAILABLE'));
    assert(events.every(x=>Object.keys(x).sort().join(',')==='decision,operation,requestId'));clean();
    console.log('PASS broker-session HTTP -> existing opaque AuthService -> internal subject-only ES256/JWKS verification -> Store ownership -> binder0023 -> separate LOGIN ticket -> audited v2 family/students; A/B/A and revocation isolated; direct student denied; zero context/tickets');
  } finally { await new Promise(r=>server.close(r));await projection.close(); }
}
