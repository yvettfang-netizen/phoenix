// Creates disposable synthetic clusters only. Does not accept an existing database URL.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { readdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const version = process.argv[2];
assert(['16','17'].includes(version), 'Specify 16 or 17');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverRoot = path.join(root, 'Phoenix Compass/education compass/server');
const website = path.join(root, 'website/phoenix-nova-website-v5');
const require = createRequire(path.join(serverRoot,'package.json'));
const { Pool } = require('pg');
const { loadLearningCatalog } = require('./dist/services/canonical-learning-catalog.js');
const { createAppServer } = require('./dist/http/app.js');
const { chromium } = createRequire(path.join(website,'package.json'))(process.env.PLAYWRIGHT_MODULE || 'playwright');
const nonce = randomBytes(6).toString('hex');
const work = mkdtempSync(path.join(tmpdir(),'canonical-catalog-'));
const containers = [];
const devVars = path.join(website,'.dev.vars');
let ownsVars = false, vite, browser, api, catalog;
let webLog='';
const image = version === '16'
  ? 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
  : 'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
function command(args,input) {
  const r = spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(r.status !== 0) throw new Error(`Docker ${args[0]} failed: ${String(r.stderr+r.stdout).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]').slice(-1200)}`);
  return r.stdout.trim();
}
function protect(file) {
  if(process.platform === 'win32') {
    const who=spawnSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true});
    const sid=who.stdout.match(/S-1-5-[0-9-]+/)?.[0]; assert(sid);
    const rights=lstatSync(file).isDirectory()?'(OI)(CI)F':'F';
    const r=spawnSync('icacls.exe',[file,'/inheritance:r','/grant:r',`*${sid}:${rights}`],{windowsHide:true,stdio:'ignore'});
    assert.equal(r.status,0,'Owner-only Windows ACL');
  }
}
function save(file,value) { writeFileSync(file,value,{mode:0o600,flag:'wx'}); }
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function cluster(suffix) {
  const name=`catalog-pg${version}-${nonce}-${suffix}`;
  const env=path.join(work,`${suffix}.env`);
  save(env,`POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n`);
  const id=command(['run','-d','--name',name,'--label',`canonical.catalog.test=${nonce}`,
    '-p','127.0.0.1::5432','--env-file',env,image]);
  assert.match(id,/^[a-f0-9]{64}$/); containers.push(id);
  command(['exec',id,'bash','-c',`umask 077; printf '127.0.0.1:5432:*:phoenix_bootstrap:%s\n' "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass`]);
  for(let n=0;n<60;n++) {
    const r=spawnSync('docker',['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,'psql','-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-c','SELECT 1'],{stdio:'ignore',windowsHide:true});
    if(r.status===0) break;
    if(n===59) throw new Error('Database readiness timeout');
    await sleep(500);
  }
  command(['exec',id,'bash','-c',`umask 077; printf '127.0.0.1:5432:*:phoenix_bootstrap:%s\n' "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass`]);
  return {id,port:Number(command(['port',id,'5432/tcp']).split(':').at(-1))};
}
function sql(db,text,user='phoenix_bootstrap',pass='/tmp/canonical-premerge.pgpass') {
  return command(['exec','-i','-e',`PGPASSFILE=${pass}`,db.id,'psql','-X','-q','-At','-h','127.0.0.1',
    '-U',user,'-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],text);
}
const serviceToken=randomBytes(32).toString('hex'), previewToken=randomBytes(32).toString('hex');
let readerPassword=randomBytes(32).toString('hex');
function config(db,suffix,user='catalog_reader') {
  const file=path.join(work,`${suffix}.json`);
  save(file,JSON.stringify({host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',user,password:readerPassword,serviceToken}));
  return file;
}
async function adapter(file) {
  return loadLearningCatalog({NODE_ENV:'test',CANONICAL_LEARNING_CATALOG_ENABLED:'true',CANONICAL_CATALOG_CONFIG_FILE:file});
}
async function serve(catalogue,port=0) {
  const rejectLegacy=new Proxy({}, {get(){throw new Error('Legacy Store/auth access refused in this test')}});
  const server=createAppServer({auth:rejectLegacy,profiles:rejectLegacy,assessments:rejectLegacy,
    orders:rejectLegacy,reports:rejectLegacy,learningCatalog:catalogue,logger:{error(){}}});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve)); return server;
}
async function close(server) { if(server) await new Promise(resolve=>server.close(()=>resolve())); }
const uuid=n=>`01900000-0000-7000-8000-${n.toString(16).padStart(12,'0')}`;
function manifest(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function checkManifest(file,expected) { assert.equal(manifest(file),expected,'BACKUP_INTEGRITY_REFUSED'); }
async function pageTitle(page,title) {
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('[data-canonical-course-catalog] li').filter({hasText:title}).waitFor();
  assert.deepEqual(await page.locator('[data-canonical-course-catalog] li').allTextContents(),[title]);
}
try {
  protect(work);
  assert(!existsSync(devVars),'Existing .dev.vars preserved: refusing to read/overwrite it');
  const db=await cluster('fresh');
  command(['exec',db.id,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
  for(const file of readdirSync(path.join(root,'database/canonical/migrations')).filter(n=>/^00(?:0[1-9]|[12][0-9]|3[0-5])_.*\.sql$/.test(n))){
    command(['cp',path.join(root,'database/canonical/migrations',file),db.id+':/opt/canonical-migrations/'+file]);
  }
  command(['cp',path.join(root,'database/canonical/verification/migrate.sh'),`${db.id}:/opt/verification/migrate.sh`]);
  const migrated=command(['exec',db.id,'bash','/opt/verification/migrate.sh']);
  assert.match(migrated,/PASS ledger=35 files=35 expected=35/);
  console.log(`PASS PG${version} fresh 0001-0035 ledger=35`);
  sql(db,`CREATE ROLE catalog_reader LOGIN NOINHERIT PASSWORD '${readerPassword}';
    GRANT CONNECT ON DATABASE phoenix_canonical_dev TO catalog_reader;
    GRANT USAGE ON SCHEMA learning TO catalog_reader;
    GRANT EXECUTE ON FUNCTION learning.list_published_courses() TO catalog_reader;
    INSERT INTO core.people(person_id,display_name) VALUES('${uuid(1)}','Synthetic catalog author');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES('${uuid(2)}','${uuid(1)}','FAMILY','ACTIVE');`);
  for(let i=0;i<6;i++) {
    const c=uuid(10+i), v=uuid(30+i), state=i===1?'DRAFT':i===2?'ARCHIVED':'PUBLISHED';
    const vs=i===3?'RETIRED':'ACTIVE', from=i===4?"now()+interval '1 day'":"now()-interval '2 days'";
    const until=i===5?"now()-interval '1 day'":'NULL';
    sql(db,`INSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id)
      VALUES('${c}','SYNTH-${i}','Synthetic PG${version} course ${i}','${state}','${uuid(2)}');
      INSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,effective_until,status,created_by_principal_id)
      VALUES('${v}','${c}',1,${from},${until},'${vs}','${uuid(2)}');`);
  }
  const file=config(db,'reader'); catalog=await adapter(file);
  sql(db,`CREATE ROLE catalog_overprivileged LOGIN NOINHERIT PASSWORD '${readerPassword}';
    GRANT USAGE ON SCHEMA learning TO catalog_overprivileged;
    GRANT EXECUTE ON FUNCTION learning.list_published_courses() TO catalog_overprivileged;
    GRANT SELECT ON core.people TO catalog_overprivileged;`);
  const overprivileged=await adapter(config(db,'overprivileged','catalog_overprivileged'));
  try { await assert.rejects(overprivileged.list(),e=>e.code==='CATALOG_UNAVAILABLE'); }
  finally { await overprivileged.close(); }
  const reader=new Pool(JSON.parse(readFileSync(file,'utf8')));
  try {
    for(const denied of ['SELECT * FROM core.people','SELECT * FROM learning.course',
      "UPDATE learning.course SET title='forged'",'SET ROLE phoenix_canonical_context_binder','SET ROLE phoenix_canonical_app']) {
      await assert.rejects(reader.query(denied),e=>e.code==='42501');
    }
  } finally { await reader.end(); }
  console.log('PASS real minimal LOGIN: direct tables/DML/app and binder role escalation refused');
  console.log('PASS excessive table permissions rejected before catalog query');
  api=await serve(catalog);
  const port=api.address().port, origin=`http://127.0.0.1:${port}`;
  const http=async (suffix='',options={}) => fetch(`${origin}/v1/learning/catalog${suffix}`,{
    headers:{authorization:`Bearer ${serviceToken}`},...options});
  assert.equal((await http('',{headers:{}})).status,401);
  assert.equal((await http('',{headers:{authorization:`Bearer ${randomBytes(32).toString('hex')}`}})).status,401);
  assert.equal((await http('?family=forged')).status,400);
  assert.equal((await http('',{method:'POST'})).status,405);
  let response=await http(); assert.equal(response.status,200);
  const data=await response.json();
  assert.deepEqual(data,{schemaVersion:'learning-catalog.v1',items:[{courseRef:uuid(10),versionRef:uuid(30),
    courseCode:'SYNTH-0',title:`Synthetic PG${version} course 0`,versionNo:1}]});
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  console.log('PASS HTTP exact Canonical DTO; draft/archived/retired/future/expired invisible; no legacy Store');
  save(devVars,`CANONICAL_LEARNING_CATALOG_ENABLED=true\nCANONICAL_CATALOG_API_ORIGIN=${origin}\nCANONICAL_CATALOG_SERVICE_TOKEN=${serviceToken}\nCANONICAL_CATALOG_PREVIEW_TOKEN=${previewToken}\n`);
  ownsVars=true; protect(devVars);
  const webEnv={...process.env,NODE_ENV:'development',WRANGLER_SEND_METRICS:'false',NO_PROXY:'127.0.0.1,localhost'};
  for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy']) delete webEnv[key];
  vite=spawn(process.execPath,[path.join(website,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4498','--strictPort'],{
    cwd:website,env:webEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});
  vite.stdout.on('data',x=>{webLog+=x;}); vite.stderr.on('data',x=>{webLog+=x;});
  const web='http://127.0.0.1:4498'; let ready=false;
  for(let n=0;n<120;n++) {
    if(vite.exitCode!==null) throw new Error(`Website exited before readiness: ${webLog.replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]').slice(-3000)}`);
    try { const r=await fetch(`${web}/api/learning/catalog`,{signal:AbortSignal.timeout(2000)}); if(r.status===403) {ready=true;break;} } catch {}
    await sleep(500);
  }
  assert(ready,'Website BFF readiness');
  const bff=await fetch(`${web}/api/learning/catalog`,{headers:{cookie:`phoenix_catalog_preview=${previewToken}`},signal:AbortSignal.timeout(6000)});
  assert.equal(bff.status,200,'Website BFF -> Node -> Canonical');
  assert.deepEqual(await bff.json(),data);
  console.log('PASS real website BFF exact DTO and protected server-to-server capability');
  const channel=process.env.CATALOG_BROWSER_CHANNEL || (process.platform==='win32' && !existsSync(chromium.executablePath())?'msedge':'chromium');
  browser=await chromium.launch({headless:true,channel});
  const context=await browser.newContext();
  await context.route('**/*',route=>{
    const u=new URL(route.request().url()); return ['127.0.0.1','localhost'].includes(u.hostname) ? route.continue() : route.abort();
  });
  await context.addCookies([{name:'phoenix_catalog_preview',value:previewToken,url:web,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage();
  await page.goto(`${web}/zh/education`,{waitUntil:'domcontentloaded',timeout:60000});
  await pageTitle(page,`Synthetic PG${version} course 0`);
  const changed=`Synthetic PG${version} verified from database`;
  sql(db,`UPDATE learning.course SET title='${changed}' WHERE course_id='${uuid(10)}';`);
  await pageTitle(page,changed);
  assert.equal(await page.evaluate(()=>document.cookie.includes('phoenix_catalog_preview')),false);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/catalog|password|token/i.test(k))),false);
  console.log('PASS real browser Page -> same-origin BFF -> Node -> Canonical; DB title change visible; HttpOnly preview');
  const backupPassword=randomBytes(32).toString('hex');
  sql(db,`CREATE ROLE catalog_backup LOGIN INHERIT BYPASSRLS PASSWORD '${backupPassword}';
    GRANT CONNECT ON DATABASE phoenix_canonical_dev TO catalog_backup; GRANT pg_read_all_data TO catalog_backup;`);
  const pgpass=path.join(work,'backup.pgpass'); save(pgpass,`127.0.0.1:5432:*:catalog_backup:${backupPassword}\n`);
  command(['cp',pgpass,`${db.id}:/tmp/catalog-backup.pgpass`]); command(['exec',db.id,'chmod','600','/tmp/catalog-backup.pgpass']);
  command(['exec','-e','PGPASSFILE=/tmp/catalog-backup.pgpass',db.id,'pg_dump','-h','127.0.0.1','-U','catalog_backup','-d','phoenix_canonical_dev','-Fc','-f','/tmp/catalog.dump']);
  command(['exec','-e','PGPASSFILE=/tmp/catalog-backup.pgpass',db.id,'pg_dumpall','-h','127.0.0.1','-U','catalog_backup','--roles-only','--no-role-passwords','-f','/tmp/catalog-roles.sql']);
  const dump=path.join(work,'catalog.dump'), roles=path.join(work,'roles.sql');
  command(['cp',`${db.id}:/tmp/catalog.dump`,dump]); command(['cp',`${db.id}:/tmp/catalog-roles.sql`,roles]);
  const hashes={dump:manifest(dump),roles:manifest(roles)};
  const tampered=path.join(work,'tampered.dump'); const bytes=readFileSync(dump); bytes[bytes.length-1]^=1; save(tampered,bytes);
  assert.throws(()=>checkManifest(tampered,hashes.dump),/BACKUP_INTEGRITY_REFUSED/);
  console.log('PASS backup account export and manifest tamper refusal (unsigned manifest limitation documented)');
  sql(db,`UPDATE learning.course SET status='ARCHIVED' WHERE course_id='${uuid(10)}';`);
  assert.deepEqual((await (await http()).json()).items,[]);
  await page.reload({waitUntil:'domcontentloaded'}); await page.getByText('暂无已发布课程。',{exact:true}).waitFor();
  command(['stop',db.id]);
  assert.equal((await http()).status,503);
  await page.reload({waitUntil:'domcontentloaded'}); await page.getByText('课程目录暂不可用。',{exact:true}).waitFor();
  console.log('PASS empty directory stays empty; disconnected database returns 503 and no mock fallback');
  const restored=await cluster('restore');
  checkManifest(dump,hashes.dump); checkManifest(roles,hashes.roles);
  sql(restored,readFileSync(roles,'utf8').replace(/^CREATE ROLE phoenix_bootstrap;\r?\n/m,''));
  command(['cp',dump,`${restored.id}:/tmp/catalog.dump`]);
  command(['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',restored.id,'pg_restore','--exit-on-error','--no-owner','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','/tmp/catalog.dump']);
  assert.equal(sql(restored,'SELECT count(*) FROM canonical_migrations.applied'), '35');
  assert.equal(sql(restored,"SELECT count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"),'92');
  assert.equal(sql(restored,"SELECT count(*) FROM pg_policies WHERE schemaname IN ('core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')"),'83');
  readerPassword=randomBytes(32).toString('hex');
  sql(restored,`ALTER ROLE catalog_reader PASSWORD '${readerPassword}';`);
  await close(api); api=undefined; await catalog.close();
  catalog=await adapter(config(restored,'restored-reader')); api=await serve(catalog,port);
  assert.equal((await http()).status,200); await pageTitle(page,changed);
  console.log('PASS fresh-cluster restore ledger=35 tables=92 policies=83; real minimal LOGIN HTTP and browser replay');
  const serialized=await page.content(); assert(!serialized.includes(serviceToken)); assert(!serialized.includes(readerPassword));
  await context.close();
  console.log(`PASS PG${version} catalog end-to-end; all records synthetic; no existing cluster modified`);
} catch(error) {
  if(webLog) console.error(webLog.replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]').slice(-3500));
  console.error(String(error.stack ?? error).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]'));
  throw error;
} finally {
  await browser?.close();
  if(vite) {
    if(process.platform==='win32') spawnSync('taskkill.exe',['/PID',String(vite.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
    else { vite.kill(); }
    await sleep(500);
  }
  await close(api); await catalog?.close();
  if(ownsVars) rmSync(devVars);
  for(const id of containers.reverse()) {
    if(command(['inspect','--format','{{index .Config.Labels "canonical.catalog.test"}}',id])!==nonce) throw new Error('Cleanup identity mismatch');
    command(['rm','-f','-v',id]);
  }
  const absolute=realpathSync(work), parent=realpathSync(tmpdir());
  assert(path.dirname(absolute).toLowerCase()===parent.toLowerCase() && path.basename(absolute).startsWith('canonical-catalog-'));
  rmSync(absolute,{recursive:true});
  console.log('PASS disposable containers/volumes, synthetic credential files and preview configuration cleaned');
}
