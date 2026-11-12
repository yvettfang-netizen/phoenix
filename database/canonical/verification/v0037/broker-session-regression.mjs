import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {generateKeyPairSync,randomBytes,randomUUID,sign} from 'node:crypto';
import path from 'node:path';

/** Called only inside projection-e2e's labelled, disposable fresh/restored fixture. */
export async function runBrokerSessionRegression({db,sql,id,familyKey,root,work,save,connection,appPassword,binderPassword,docker,nonce,listenPort=0,probeBrowser}) {
  assert.equal(docker(['inspect','--format','{{index .Config.Labels "canonical.projection.test"}}',db.id]),nonce);
  const require=createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'));
  const {createBrokerVerifier}=require('./dist/auth/broker-identity.js');
  const {loadApplicationSessionProjection}=require('./dist/services/canonical-family-projection.js');
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
  const browserToken=randomBytes(32).toString('base64url');
  await store.transaction(tx=>tx.insert('sessions',{id:'ses_browser_synthetic',userId:'usr_parent_a',tokenHash:tokenDigest(browserToken,secret),expiresAt:new Date(Date.now()+600_000).toISOString(),revokedAt:null,createdAt:now}));
  let mode='valid',brokerCalls=0,jwksReads=0,lateRevocation=false,auditRowsBeforeReturn=0;
  const bridgeAuth={async authenticate(token){
    // Inject revocation only once the controlled DB read/audit has actually committed.
    // This tests the delivery boundary, rather than relying on a particular auth-call count.
    if(mode==='revoke-after-db-read'&&Number(sql(db,'SELECT count(*) FROM audit.access_events'))>auditRowsBeforeReturn){
      assert.equal(lateRevocation,false);lateRevocation=true;await auth.revokeSession(token);
    }
    return auth.authenticate(token);
  }};
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
  const deps={auth:bridgeAuth,store,verifier:createBrokerVerifier(profile,async uri=>{assert.equal(uri,profile.jwksUri);jwksReads++;return {keys:[jwk]};}),
    async tokenForSubject(sub){brokerCalls++;if(mode==='outage')throw Error('synthetic internal detail');return assertion(sub);}};
  const projection=await loadApplicationSessionProjection({NODE_ENV:'test',CANONICAL_BROKER_SESSION_BRIDGE_ENABLED:'true',
    CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'true',
    CANONICAL_FAMILY_APP_CONFIG_FILE:appFile,CANONICAL_FAMILY_BINDER_CONFIG_FILE:binderFile},
    {auth:deps.auth,store,broker:{verifier:deps.verifier,tokenForSubject:deps.tokenForSubject}},event=>events.push(event));
  assert(projection);
  const server=createAppServer({auth,profiles:{},assessments:{},orders:{},reports:{},sessionFamilyProjection:projection,logger:{error(){}}});
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(listenPort,'127.0.0.1',resolve);});
    const apiOrigin=`http://127.0.0.1:${server.address().port}`,origin=apiOrigin+'/v1/canonical/session-projections/';
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
    assert.equal((await fetch(apiOrigin+'/v1/canonical/projections/family',{headers:{Authorization:'Bearer '+tokens.get('usr_parent_a')}})).status,404);
    if(probeBrowser){
      const originalStudent=sql(db,`SELECT display_name FROM core.people WHERE person_id='${id(3)}'`);
      try{await probeBrowser({apiOrigin,tokens:new Map(tokens).set('usr_parent_a',browserToken),revokeBrowserSession:()=>auth.revokeSession(browserToken),
        expectedNames:{usr_parent_a:originalStudent,usr_parent_b:sql(db,`SELECT display_name FROM core.people WHERE person_id='${id(4)}'`)},
        changeStudentName:()=>sql(db,`UPDATE core.people SET display_name='Synthetic session database change' WHERE person_id='${id(3)}'`)});}
      finally{sql(db,`UPDATE core.people SET display_name='${originalStudent.replaceAll("'","''")}' WHERE person_id='${id(3)}'`);}
    }
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
    auditRowsBeforeReturn=Number(sql(db,'SELECT count(*) FROM audit.access_events'));mode='revoke-after-db-read';
    const late=await call();assert.equal(late.status,401);assert.equal(lateRevocation,true);
    const lateBody=JSON.stringify(await late.json());assert(!lateBody.includes('Synthetic Family')&&!lateBody.includes('family-summary.v2'));
    const lateNonce=late.headers.get('x-request-id');
    assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${lateNonce}' AND action='READ' AND decision='ALLOW'`),'1');
    assert(events.some(x=>x.requestId===lateNonce&&x.decision==='DENY'));clean();mode='valid';
    console.log('PASS LATE-1 committed DB READ/ALLOW + session revoked before HTTP return ->401 without DTO, correlated gateway DENY, cleared context/tickets; DB allowance is not delivery proof');
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
