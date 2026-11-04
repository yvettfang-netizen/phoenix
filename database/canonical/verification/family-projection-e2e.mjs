// Only new, labelled synthetic clusters. No existing database locator is accepted.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,realpathSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const version=process.argv[2]; assert(['16','17'].includes(version));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const serverRoot=path.join(root,'Phoenix Compass/education compass/server');
const website=path.join(root,'website/phoenix-nova-website-v5');
const require=createRequire(path.join(serverRoot,'package.json'));
const {Pool}=require('pg');
const {loadFamilyProjection}=require('./dist/services/canonical-family-projection.js');
const {createAppServer}=require('./dist/http/app.js');
const {chromium}=createRequire(path.join(website,'package.json'))(process.env.PLAYWRIGHT_MODULE||'playwright');
const nonce=randomBytes(6).toString('hex'), work=mkdtempSync(path.join(tmpdir(),'canonical-projection-'));
const devVars=path.join(website,'.dev.vars'), containers=[], events=[];
let ownsVars=false, vite, browser, api, projection, webLog='';
const images={16:'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',
  17:'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'};
const redact=x=>String(x).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]');
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(r.status!==0)throw Error(`Docker ${args[0]}: ${redact(r.stderr+r.stdout).slice(-1000)}`);return r.stdout.trim();}
function protect(file){if(process.platform==='win32'){
  const sid=spawnSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true}).stdout.match(/S-1-5-[0-9-]+/)?.[0];assert(sid);
  const rights=lstatSync(file).isDirectory()?'(OI)(CI)F':'F';
  assert.equal(spawnSync('icacls.exe',[file,'/inheritance:r','/grant:r',`*${sid}:${rights}`],{stdio:'ignore',windowsHide:true}).status,0);
}}
function save(file,value){writeFileSync(file,value,{mode:0o600,flag:'wx'});protect(file);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const id=n=>`01910000-0000-7000-8000-${n.toString(16).padStart(12,'0')}`;
const issuer='https://family-projection.synthetic.invalid', audience='family-projection-synthetic';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk={...publicKey.export({format:'jwk'}),kid:'synthetic-p256',alg:'ES256',use:'sig'};
const familyKey=i=>'fam_'+String(i).repeat(32);
function jwt(subject='usr_parent_a',family=familyKey('a'),changes={},key=privateKey){
  const now=Math.floor(Date.now()/1000);
  const payload={iss:issuer,aud:audience,sub:subject,application_family_id:family,iat:now,nbf:now,exp:now+45,jti:randomUUID(),...changes};
  const input=[{alg:'ES256',typ:'JWT',kid:jwk.kid},payload].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return input+'.'+sign('sha256',Buffer.from(input),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
const appPassword=randomBytes(32).toString('hex'), binderPassword=randomBytes(32).toString('hex');
async function cluster(suffix){
  const env=path.join(work,suffix+'.env');
  save(env,`POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n`);
  const c=docker(['run','-d','--name',`projection-pg${version}-${nonce}-${suffix}`,'--label',`canonical.projection.test=${nonce}`,'-p','127.0.0.1::5432','--env-file',env,images[version]]);
  assert.match(c,/^[a-f0-9]{64}$/);containers.push(c);
  docker(['exec',c,'bash','-c',`umask 077; printf '127.0.0.1:5432:*:phoenix_bootstrap:%s\n' "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass`]);
  for(let n=0;n<60;n++){
    const ready=spawnSync('docker',['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',c,'psql','-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-c','SELECT 1'],{stdio:'ignore',windowsHide:true});
    if(ready.status===0)break;if(n===59)throw Error('Readiness timeout');await sleep(500);
  }
  return {id:c,port:Number(docker(['port',c,'5432/tcp']).split(':').at(-1))};
}
function sql(db,text){return docker(['exec','-i','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',db.id,'psql','-X','-q','-At','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],text);}
function connection(db,user,password){return {host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',user,password};}
async function adapter(db,suffix){
  const a=path.join(work,suffix+'-app.json'),b=path.join(work,suffix+'-binder.json'),identity=path.join(work,suffix+'-identity.json');
  save(a,JSON.stringify(connection(db,'projection_app',appPassword)));save(b,JSON.stringify(connection(db,'projection_binder',binderPassword)));
  save(identity,JSON.stringify({issuer,audience,jwk}));
  return loadFamilyProjection({NODE_ENV:'test',CANONICAL_FAMILY_PROJECTION_ENABLED:'true',
    CANONICAL_FAMILY_APP_CONFIG_FILE:a,CANONICAL_FAMILY_BINDER_CONFIG_FILE:b,CANONICAL_FAMILY_IDENTITY_CONFIG_FILE:identity},event=>events.push(event));
}
async function serve(value,port=0){const legacy=new Proxy({},{get(){throw Error('Legacy auth/store must not be read')}});
  const s=createAppServer({auth:legacy,profiles:legacy,assessments:legacy,orders:legacy,reports:legacy,familyProjection:value,logger:{error(){}}});
  await new Promise(r=>s.listen(port,'127.0.0.1',r));return s;}
async function close(s){if(s)await new Promise(r=>s.close(r));}
const digest=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
function integrity(f,sha){assert.equal(digest(f),sha,'BACKUP_INTEGRITY_REFUSED');}
function seed(db){
  sql(db,`CREATE ROLE projection_app LOGIN NOINHERIT PASSWORD '${appPassword}';
    CREATE ROLE projection_binder LOGIN NOINHERIT PASSWORD '${binderPassword}';
    GRANT CONNECT ON DATABASE phoenix_canonical_dev TO projection_app,projection_binder;
    GRANT phoenix_canonical_reader TO projection_app WITH INHERIT FALSE, SET TRUE;
    GRANT USAGE ON SCHEMA auth TO projection_app,projection_binder;
    GRANT EXECUTE ON FUNCTION auth.clear_context(),auth.current_request_nonce(),auth.redeem_context_ticket(uuid,uuid) TO projection_app;
    GRANT EXECUTE ON FUNCTION auth.issue_application_family_context_ticket(text,text,text,timestamptz,uuid) TO projection_binder;
    INSERT INTO core.families(family_id,display_name) VALUES('${id(100)}','Synthetic Family A'),('${id(101)}','Synthetic Family B');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label)
      VALUES('${id(900)}',NULL,'SERVICE','ACTIVE','synthetic_mapping_proposer'),('${id(901)}',NULL,'SERVICE','ACTIVE','synthetic_mapping_reviewer');`);
  const persons=[[1,'Parent A','FAMILY','usr_parent_a',100],[2,'Parent B','FAMILY','usr_parent_b',101],
    [3,'Student A','FAMILY','usr_student_a',100],[4,'Student B','FAMILY','usr_student_b',101],
    [5,'Unrelated A','FAMILY','usr_unrelated_a',100],[6,'No guardian student','FAMILY','usr_other_student',100],
    [7,'Expired actor','FAMILY','usr_expired_member',100],[8,'Disabled actor','FAMILY','usr_disabled',100],
    [9,'Advisor actor','ADVISOR','usr_advisor',100],[10,'Channel actor','CHANNEL','usr_channel',100],
    [11,'Self-declared student','FAMILY','usr_self_declared',100],[12,'Expired guardian student','FAMILY','usr_guardian_expired',100],
    [13,'Future guardian student','FAMILY','usr_guardian_future',100],[14,'Disabled identity','FAMILY','usr_disabled_identity',100],
    [15,'Expired student membership','FAMILY','usr_student_expired',100]];
  for(const [n,name,kind,sub,family] of persons){sql(db,`INSERT INTO core.people(person_id,display_name) VALUES('${id(n)}','Synthetic ${name}');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES('${id(200+n)}','${id(n)}','${kind}','${n===8?'DISABLED':'ACTIVE'}');
    INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from,valid_until)
      VALUES('${id(300+n)}','${id(family)}','${id(n)}','MEMBER',now()-interval '2 days',${[7,15].includes(n)?"now()-interval '1 day'":'NULL'});
    INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status,disabled_at)
      VALUES('${id(400+n)}','${issuer}','${sub}','${id(200+n)}','${n===14?'DISABLED':'ACTIVE'}',${n===14?'now()':'NULL'});`);}
  sql(db,`INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status)
    VALUES('${id(950)}','${issuer}','usr_service','${id(900)}','ACTIVE');`);
  for(const [n,letter]of [[100,'a'],[101,'b']])sql(db,`INSERT INTO integration.legacy_id_mappings(mapping_id,source_system,entity_kind,legacy_id,canonical_id,mapping_status,evidence_ref,
    managed_lifecycle_version,proposed_by_principal_id,proposed_at,proposal_request_nonce,application_ownership_evidence_ref,application_ownership_evidence_sha256,
    canonical_membership_evidence_ref,canonical_membership_evidence_sha256,founder_approval_evidence_ref,founder_approval_evidence_sha256,
    decided_by_principal_id,decided_at,verification_request_nonce)
    VALUES('${id(500+n)}','PHOENIX_FAMILY_OS','FAMILY','${familyKey(letter)}','${id(n)}','VERIFIED','evidence://synthetic/family-mapping',
      'FM_V1','${id(900)}',now(),'${randomUUID()}','evidence://synthetic/ownership','${'a'.repeat(64)}',
      'evidence://synthetic/membership','${'b'.repeat(64)}','evidence://synthetic/approval-not-real','${'c'.repeat(64)}','${id(901)}',now(),'${randomUUID()}');`);
  for(const n of [3,4,6,11,12,13,15])sql(db,`INSERT INTO core.student_profiles(person_id) VALUES('${id(n)}');`);
  for(const [n,guardian,student,family,level,from,until]of [[700,1,3,100,'VERIFIED',"now()-interval '1 day'","now()+interval '1 day'"],
    [701,2,4,101,'VERIFIED',"now()-interval '1 day'","now()+interval '1 day'"],
    [702,1,11,100,'SELF_DECLARED_LEGACY',"now()-interval '1 day'","now()+interval '1 day'"],
    [703,1,12,100,'VERIFIED',"now()-interval '2 days'","now()-interval '1 day'"],
    [704,1,13,100,'VERIFIED',"now()+interval '1 day'","now()+interval '2 days'"],
    [705,1,15,100,'VERIFIED',"now()-interval '1 day'","now()+interval '1 day'"]]){
    sql(db,`INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,valid_from,valid_until)
      VALUES('${id(n)}','${id(family)}','${id(guardian)}','${id(student)}','${level}','EDUCATION',${from},${until});`);
  }
}
try{
  protect(work);assert(!existsSync(devVars),'Existing preview configuration must be preserved');
  const db=await cluster('fresh');
  docker(['exec',db.id,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
  docker(['cp',path.join(root,'database/canonical/migrations')+'/.',`${db.id}:/opt/canonical-migrations`]);
  docker(['cp',path.join(root,'database/canonical/verification/migrate.sh'),`${db.id}:/opt/verification/migrate.sh`]);
  assert.match(docker(['exec',db.id,'bash','/opt/verification/migrate.sh']),/PASS ledger=35 files=35 expected=35/);
  seed(db);console.log(`PASS PG${version} 0001-0035; synthetic existing principals, managed family mappings and guardian fixtures`);
  const rawApp=new Pool(connection(db,'projection_app',appPassword)),rawBinder=new Pool(connection(db,'projection_binder',binderPassword));
  try{
    for(const q of ['SET ROLE phoenix_canonical_app','SET ROLE phoenix_canonical_context_binder','SELECT * FROM auth.external_identities',
      "SELECT auth.issue_context_ticket(NULL,NULL,NULL,'FAMILY',now(),NULL,NULL)","INSERT INTO audit.access_events(action) VALUES('forged')"])
      await assert.rejects(rawApp.query(q),e=>e.code==='42501');
    await assert.rejects(rawBinder.query('SELECT * FROM core.people'),e=>e.code==='42501');
    const app=await rawApp.connect();try{
      await app.query('SET ROLE phoenix_canonical_reader');assert.equal((await app.query('SELECT count(*) AS n FROM core.families')).rows[0].n,'0');
      await assert.rejects(app.query("UPDATE core.people SET display_name='forged'"),e=>e.code==='42501');await app.query('RESET ROLE');
      const issued=await rawBinder.query('SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)',[issuer,'usr_parent_a',familyKey('a'),new Date(Date.now()+10000),randomUUID()]);
      const ticket=issued.rows[0];assert(ticket);
      await assert.rejects(app.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.ticket_id,id(202)]));
      await app.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.ticket_id,ticket.principal_id]);
      await assert.rejects(app.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.ticket_id,ticket.principal_id]));
      await app.query('SELECT auth.clear_context()');
    }finally{app.release();}
  }finally{await rawApp.end();await rawBinder.end();}
  console.log('PASS separate real LOGINs; no context/no rows; app issuance, DML/audit forgery/role escalation denied; wrong-principal and replay tickets refused');
  projection=await adapter(db,'fresh');api=await serve(projection);
  const apiPort=api.address().port,origin=`http://127.0.0.1:${apiPort}`;
  const call=(resource='family',subject='usr_parent_a',family=familyKey('a'),extra={})=>fetch(`${origin}/v1/canonical/projections/${resource}`,{
    headers:{authorization:'Bearer '+jwt(subject,family)},...extra});
  const get=async(...args)=>{const r=await call(...args);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');return r.json();};
  assert.deepEqual(await get(),{schemaVersion:'family-summary.v1',family:{familyRef:id(100),displayName:'Synthetic Family A'}});
  assert.deepEqual(await get('students'),{schemaVersion:'student-summary.v1',items:[{studentRef:id(3),displayName:'Synthetic Student A'}]});
  assert.deepEqual((await get('students','usr_student_a')).items,[{studentRef:id(3),displayName:'Synthetic Student A'}]);
  assert.deepEqual((await get('students','usr_unrelated_a')).items,[]);
  assert.equal((await call('students/'+id(4))).status,404);assert.equal((await call('students/'+id(999))).status,404);
  assert.equal((await call('family?principal=forged')).status,400);
  assert.equal((await call('family','usr_parent_a',familyKey('a'),{method:'POST'})).status,405);
  assert.equal((await call('family','usr_parent_a',familyKey('a'),{headers:{authorization:'Bearer '+jwt(),'x-family-id':id(101)}})).status,403);
  for(const [subject,family]of [['usr_parent_a',familyKey('b')],['usr_unknown',familyKey('a')],['usr_expired_member',familyKey('a')],
    ['usr_disabled',familyKey('a')],['usr_disabled_identity',familyKey('a')],['usr_advisor',familyKey('a')],['usr_channel',familyKey('a')],['usr_service',familyKey('a')],['usr_parent_a',familyKey('c')]])
    assert.equal((await call('family',subject,family)).status,403);
  for(const token of [jwt('usr_parent_a',familyKey('a'),{exp:1}),jwt('usr_parent_a',familyKey('a'),{aud:'wrong'}),
    jwt('usr_parent_a',familyKey('a'),{iss:'https://untrusted.invalid'}),jwt('usr_parent_a',familyKey('a'),{},generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey)]){
    assert.equal((await call('family','usr_parent_a',familyKey('a'),{headers:{authorization:'Bearer '+token}})).status,401);
  }
  const mixed=await Promise.all(Array.from({length:8},(_,i)=>get('family',i%2?'usr_parent_b':'usr_parent_a',familyKey(i%2?'b':'a'))));
  mixed.forEach((x,i)=>assert.equal(x.family.familyRef,id(i%2?101:100)));
  assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(sql(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  console.log('PASS exact Canonical DTO; self/verified guardian only; cross-family, unrelated, legacy/future/expired guardian and invalid identity denied; concurrent A/B/A pool reuse leaves no context/tickets');
  sql(db,'GRANT phoenix_canonical_app TO projection_app');assert.equal((await call()).status,503);
  sql(db,'REVOKE phoenix_canonical_app FROM projection_app');assert.equal((await call()).status,200);
  console.log('PASS excessive app membership rejected; structured outcome audit contains no identities or DTO fields');
  save(devVars,`CANONICAL_FAMILY_PROJECTION_ENABLED=true\nCANONICAL_FAMILY_API_ORIGIN=${origin}\n`);ownsVars=true;
  const webEnv={...process.env,NODE_ENV:'development',WRANGLER_SEND_METRICS:'false',NO_PROXY:'127.0.0.1,localhost'};
  for(const k of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete webEnv[k];
  vite=spawn(process.execPath,[path.join(website,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4499','--strictPort'],{cwd:website,env:webEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});
  vite.stdout.on('data',x=>{webLog+=x;});vite.stderr.on('data',x=>{webLog+=x;});
  const web='http://127.0.0.1:4499';let ready=false;
  for(let n=0;n<100;n++){if(vite.exitCode!==null)throw Error('Website exited');try{const r=await fetch(web+'/api/canonical/projections/family',{signal:AbortSignal.timeout(2000)});if(r.status===403){ready=true;break;}}catch{}await sleep(500);}assert(ready);
  browser=await chromium.launch({headless:true,channel:process.env.CATALOG_BROWSER_CHANNEL||(process.platform==='win32'&&!existsSync(chromium.executablePath())?'msedge':'chromium')});
  const context=await browser.newContext();await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();
  async function refresh(subject='usr_parent_a',family=familyKey('a')){
    await context.addCookies([{name:'phoenix_family_preview',value:jwt(subject,family),url:web,httpOnly:true,sameSite:'Strict'}]);
    await page.goto(web+'/zh/canonical-family-preview',{waitUntil:'domcontentloaded',timeout:60000});
  }
  await refresh();await page.locator('[data-family-name]').filter({hasText:'Synthetic Family A'}).waitFor();
  await page.locator('[data-student-summary]').filter({hasText:'Synthetic Student A'}).waitFor();
  sql(db,`UPDATE core.people SET display_name='Synthetic student from Canonical PG${version}' WHERE person_id='${id(3)}';`);
  await refresh();await page.locator('[data-student-summary]').filter({hasText:`Synthetic student from Canonical PG${version}`}).waitFor();
  await refresh('usr_parent_b',familyKey('b'));await page.locator('[data-family-name]').filter({hasText:'Synthetic Family B'}).waitFor();
  assert.deepEqual(await page.locator('[data-student-summary]').allTextContents(),['Synthetic Student B']);
  await refresh();await page.locator('[data-family-name]').filter({hasText:'Synthetic Family A'}).waitFor();
  assert.equal(await page.evaluate(()=>document.cookie.includes('phoenix_family_preview')),false);
  console.log('PASS actual browser -> BFF -> JWT verification -> binder -> one-use ticket -> reader RLS projection; DB change visible and A/B/A isolated');
  const backupPassword=randomBytes(32).toString('hex');
  sql(db,`CREATE ROLE projection_backup LOGIN INHERIT BYPASSRLS PASSWORD '${backupPassword}';GRANT CONNECT ON DATABASE phoenix_canonical_dev TO projection_backup;GRANT pg_read_all_data TO projection_backup;`);
  const pass=path.join(work,'backup.pgpass');save(pass,`127.0.0.1:5432:*:projection_backup:${backupPassword}\n`);
  docker(['cp',pass,`${db.id}:/tmp/projection-backup.pgpass`]);docker(['exec',db.id,'chmod','600','/tmp/projection-backup.pgpass']);
  for(const [program,args]of [['pg_dump',['-d','phoenix_canonical_dev','-Fc','-f','/tmp/projection.dump']],['pg_dumpall',['--roles-only','--no-role-passwords','-f','/tmp/projection-roles.sql']]])
    docker(['exec','-e','PGPASSFILE=/tmp/projection-backup.pgpass',db.id,program,'-h','127.0.0.1','-U','projection_backup',...args]);
  const dump=path.join(work,'projection.dump'),roles=path.join(work,'roles.sql');
  docker(['cp',`${db.id}:/tmp/projection.dump`,dump]);docker(['cp',`${db.id}:/tmp/projection-roles.sql`,roles]);const manifest={dump:digest(dump),roles:digest(roles)};
  const tampered=path.join(work,'tampered.dump'),bytes=readFileSync(dump);bytes[0]^=1;save(tampered,bytes);assert.throws(()=>integrity(tampered,manifest.dump),/BACKUP_INTEGRITY_REFUSED/);
  sql(db,`UPDATE core.guardian_authorities SET revoked_at=now() WHERE authority_id='${id(700)}';`);
  assert.deepEqual((await get('students')).items,[]);assert.equal((await call('students/'+id(3))).status,404);
  await refresh();await page.getByText('暂无可查看的学生资料。',{exact:true}).waitFor();
  sql(db,`UPDATE integration.legacy_id_mappings SET mapping_status='REVOKED',revoked_by_principal_id='${id(900)}',revoked_at=now(),revoke_request_nonce='${randomUUID()}' WHERE mapping_id='${id(601)}';`);
  assert.equal((await call('family','usr_parent_b',familyKey('b'))).status,403);
  sql(db,`UPDATE auth.external_identities SET status='DISABLED',disabled_at=now() WHERE external_identity_id='${id(401)}';`);
  assert.equal((await call()).status,403);await refresh();await page.getByText('家庭资料暂不可用或未获授权。',{exact:true}).waitFor();
  assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(sql(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  assert(events.some(x=>x.decision==='ALLOW')&&events.some(x=>x.decision==='DENY')&&events.some(x=>x.decision==='UNAVAILABLE'));
  assert(events.every(x=>Object.keys(x).sort().join(',')==='decision,operation,requestId'));
  console.log('PASS guardian revocation, mapping revocation and identity disable take effect on next read; denial/error cleanup and audit metadata verified');
  docker(['stop',db.id]);assert.equal((await call()).status,503);
  const restored=await cluster('restore');integrity(dump,manifest.dump);integrity(roles,manifest.roles);
  sql(restored,readFileSync(roles,'utf8').replace(/^CREATE ROLE phoenix_bootstrap;\r?\n/m,''));docker(['cp',dump,`${restored.id}:/tmp/projection.dump`]);
  docker(['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',restored.id,'pg_restore','--exit-on-error','--no-owner','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','/tmp/projection.dump']);
  assert.equal(sql(restored,'SELECT count(*) FROM canonical_migrations.applied'),'35');
  for(const [table,expected]of [['pg_tables','92'],['pg_policies','83']])assert.equal(sql(restored,`SELECT count(*) FROM ${table} WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')`),expected);
  sql(restored,`ALTER ROLE projection_app PASSWORD '${appPassword}';ALTER ROLE projection_binder PASSWORD '${binderPassword}';`);
  await close(api);api=undefined;await projection.close();projection=await adapter(restored,'restored');api=await serve(projection,apiPort);
  assert.equal((await call()).status,200);assert.equal((await call('students/'+id(4))).status,404);
  await refresh();await page.locator('[data-student-summary]').filter({hasText:`Synthetic student from Canonical PG${version}`}).waitFor();
  assert.equal(sql(restored,'SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(sql(restored,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  console.log(`PASS PG${version} backup integrity and fresh-cluster restore ledger=35 tables=92 policies=83; separate LOGINs and actual browser replay; all fixtures synthetic`);
}catch(error){if(webLog)console.error(redact(webLog).slice(-1800));console.error(redact(error.stack??error));throw error;}
finally{
  await browser?.close();if(vite){if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(vite.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else vite.kill();await sleep(500);}
  await close(api);await projection?.close();if(ownsVars)rmSync(devVars);
  for(const c of containers.reverse()){assert.equal(docker(['inspect','--format','{{index .Config.Labels "canonical.projection.test"}}',c]),nonce);docker(['rm','-f','-v',c]);}
  const absolute=realpathSync(work),parent=realpathSync(tmpdir());assert(path.dirname(absolute).toLowerCase()===parent.toLowerCase()&&path.basename(absolute).startsWith('canonical-projection-'));
  rmSync(absolute,{recursive:true});console.log('PASS owned test containers/volumes, synthetic credentials, preview configuration and fixture directory cleaned');
}
