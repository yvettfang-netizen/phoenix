import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const version=process.argv[2];
assert(['16','17'].includes(version),'PG16_OR_17_REQUIRED');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'));
const {Client}=require('pg');
const candidatePath=path.join(root,'database/canonical/forward-candidates/academic-studio/academy_staff_grants.sql');
const migrationPath=path.join(root,'database/canonical/migrations');
const work=mkdtempSync(path.join(tmpdir(),'phoenix-academy-a1-'));
const nonce=randomBytes(6).toString('hex');
const image={
  '16':'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',
  '17':'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
}[version];
const pass=randomBytes(32).toString('hex');
const appPassword=randomBytes(32).toString('hex');
const binderPassword=randomBytes(32).toString('hex');
const id=n=>'01910000-0000-7000-8000-'+String(n).padStart(12,'0');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const redact=s=>String(s).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]');
const containers=[];
let app,binder;

function run(args,input,allowFailure=false) {
  const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024,windowsHide:true});
  if(!allowFailure && r.status!==0) throw Error('DOCKER_'+args[0]+'_FAILED '+redact(r.stderr+r.stdout).slice(-1400));
  return {status:r.status,stdout:r.stdout||'',stderr:r.stderr||''};
}
function docker(args,input) {return run(args,input).stdout.trim();}
function sql(db,statement,allowFailure=false) {
  return run(['exec','-i','-e','PGPASSFILE=/tmp/academy-a1.pgpass',db.id,'psql',
    '-X','-q','-At','-h','127.0.0.1','-U','phoenix_bootstrap',
    '-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],statement,allowFailure);
}
function one(db,statement) {return sql(db,statement).stdout.trim();}
async function cluster() {
  const env=path.join(work,'postgres.env');
  writeFileSync(env,
    'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+pass+
    '\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',
    {mode:0o600,flag:'wx'});
  const cid=docker(['run','-d','--name','academic-a1-pg'+version+'-'+nonce,
    '--label','phoenix.academic.a1='+nonce,
    '-p','127.0.0.1::5432','--env-file',env,image]);
  assert.match(cid,/^[a-f0-9]{64}$/);
  containers.push(cid);
  const port=Number(docker(['port',cid,'5432/tcp']).split(':').at(-1));
  assert(Number.isInteger(port) && port>1024);
  docker(['exec',cid,'bash','-c',
    'umask 077; printf "127.0.0.1:5432:*:phoenix_bootstrap:%s\\n" "$POSTGRES_PASSWORD" > /tmp/academy-a1.pgpass']);
  let ready=false;
  for(let i=0;i<60;i++){
    const r=run(['exec','-e','PGPASSFILE=/tmp/academy-a1.pgpass',cid,'psql',
      '-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-c','SELECT 1'],undefined,true);
    if(r.status===0){ready=true;break;}
    await sleep(500);
  }
  assert(ready,'POSTGRES_READINESS_TIMEOUT');
  return {id:cid,port};
}
async function connect(db,username,password) {
  const client=new Client({
    host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',
    user:username,password,application_name:'academy-a1-synthetic-'+username
  });
  await client.connect();
  return client;
}
async function bind(principal,actor,family,channel) {
  await app.query('SELECT auth.clear_context()');
  const expires=new Date(Date.now()+45000);
  const ticket=await binder.query(
    'SELECT auth.issue_context_ticket($1::uuid,$2::uuid,$3::uuid,$4::text,$5::timestamptz,$6::uuid,$7::uuid) AS id',
    [principal,actor,family,channel,expires,randomUUID(),principal]);
  await app.query('SELECT auth.redeem_context_ticket($1::uuid,$2::uuid)',[ticket.rows[0].id,principal]);
}
async function grant(grantId,target,capability,until,reason) {
  const result=await app.query(
    'SELECT learning.grant_academy_staff_capability($1::uuid,$2::uuid,$3::text,$4::timestamptz,$5::text) AS ok',
    [grantId,target,capability,until,reason]);
  return result.rows[0].ok;
}
async function revoke(grantId,reason) {
  const result=await app.query(
    'SELECT learning.revoke_academy_staff_capability($1::uuid,$2::text) AS ok',
    [grantId,reason]);
  return result.rows[0].ok;
}
function fixture(db) {
  sql(db,
    "CREATE ROLE academy_a1_app LOGIN NOINHERIT PASSWORD '"+appPassword+"';"+
    "CREATE ROLE academy_a1_binder LOGIN NOINHERIT PASSWORD '"+binderPassword+"';"+
    "GRANT CONNECT ON DATABASE phoenix_canonical_dev TO academy_a1_app,academy_a1_binder;"+
    "GRANT phoenix_canonical_app TO academy_a1_app WITH INHERIT FALSE,SET TRUE;"+
    "GRANT phoenix_canonical_context_binder TO academy_a1_binder WITH INHERIT FALSE,SET TRUE;"+
    "INSERT INTO core.families(family_id,display_name) VALUES('"+id(100)+"','Synthetic Academy');"+
    "INSERT INTO core.people(person_id,display_name) VALUES"+
      "('"+id(1)+"','Synthetic Founder'),"+
      "('"+id(2)+"','Synthetic Administrator'),"+
      "('"+id(3)+"','Synthetic Ordinary Member');"+
    "INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label) VALUES"+
      "('"+id(900)+"',NULL,'SERVICE','ACTIVE','academy_founder_bootstrap_v1'),"+
      "('"+id(901)+"','"+id(1)+"','SUPERVISOR','ACTIVE',NULL),"+
      "('"+id(902)+"','"+id(2)+"','FAMILY','ACTIVE',NULL),"+
      "('"+id(903)+"','"+id(3)+"','FAMILY','ACTIVE',NULL);"+
    "INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES"+
      "('"+id(1101)+"','"+id(100)+"','"+id(1)+"','PRIMARY',clock_timestamp()-interval '1 day'),"+
      "('"+id(1102)+"','"+id(100)+"','"+id(2)+"','MEMBER',clock_timestamp()-interval '1 day'),"+
      "('"+id(1103)+"','"+id(100)+"','"+id(3)+"','MEMBER',clock_timestamp()-interval '1 day');");
}

const base=readFileSync(candidatePath,'utf8');
assert(base.startsWith('BEGIN;') && base.trim().endsWith('COMMIT;'));
assert.equal(readdirSync(migrationPath).filter(x=>/^\d{4}_.*\.sql$/.test(x)).length,37);
assert(!/CREATE TABLE auth[.]principals|CREATE TABLE core[.]people|CREATE TABLE auth[.]session_contexts/i.test(base));
console.log('SOURCE SHA256 '+createHash('sha256').update(base).digest('hex')+' (unnumbered candidate; synthetic only)');

try {
  const db=await cluster();
  docker(['exec',db.id,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
  docker(['cp',migrationPath+'/.',db.id+':/opt/canonical-migrations']);
  docker(['cp',path.join(root,'database/canonical/verification/migrate.sh'),db.id+':/opt/verification/migrate.sh']);
  const installed=docker(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',db.id,
    'bash','/opt/verification/migrate.sh']);
  assert.match(installed,/PASS ledger=37 files=37 expected=37/);
  console.log('PASS PG'+version+' formal 0001-0037 fresh install');

  sql(db,base);
  assert.equal(one(db,"SELECT to_regclass('learning.academy_staff_grants') IS NOT NULL"),'t');
  assert.equal(one(db,"SELECT count(*) FROM canonical_migrations.applied"),'37');
  assert.equal(one(db,"SELECT relrowsecurity::text||'|'||relforcerowsecurity::text FROM pg_class WHERE oid='learning.academy_staff_grants'::regclass"),'true|true');
  const repeat=sql(db,base,true);
  assert.notEqual(repeat.status,0,'REPEATED_FORWARD_SQL_MUST_NOT_SILENTLY_CHANGE_SCHEMA');
  assert.equal(one(db,"SELECT count(*) FROM canonical_migrations.applied"),'37');
  assert.equal(one(db,"SELECT count(*) FROM learning.academy_staff_grants"),'0');
  console.log('PASS PG'+version+' candidate atomic install; repeat rejected; formal ledger unchanged; forced RLS');

  fixture(db);
  app=await connect(db,'academy_a1_app',appPassword);
  binder=await connect(db,'academy_a1_binder',binderPassword);
  await app.query('SET ROLE phoenix_canonical_app');
  await binder.query('SET ROLE phoenix_canonical_context_binder');
  assert.equal((await app.query("SELECT has_table_privilege(current_user,'learning.academy_staff_grants','SELECT') AS allowed")).rows[0].allowed,false);
  await assert.rejects(app.query('SELECT * FROM learning.academy_staff_grants'),e=>e.code==='42501');
  await assert.rejects(app.query('UPDATE learning.academy_staff_grants SET status=$1',['REVOKED']),e=>e.code==='42501');
  await assert.rejects(app.query('SELECT learning.has_academy_staff_grant($1)',['ACADEMY_ADMIN']),e=>e.code==='42501');
  console.log('PASS PG'+version+' separate LOGIN, direct table DML and private helper EXECUTE refused');

  assert.equal(await grant(id(2001),id(901),'ACADEMY_FOUNDER',null,'UNBOUND'),false);
  await bind(id(903),id(3),id(100),'FAMILY');
  assert.equal(await grant(id(2002),id(903),'ACADEMY_FOUNDER',null,'FORGED_FOUNDER'),false);
  assert.equal(await grant(id(2003),id(903),'ACADEMY_ADMIN',null,'FORGED_ADMIN'),false);
  console.log('PASS PG'+version+' unbound and Family-member role escalation denied');

  await bind(id(900),null,null,'INTERNAL');
  assert.equal(await grant(id(2101),id(901),'ACADEMY_FOUNDER',null,'INITIAL_FOUNDER'),true);
  assert.equal(await grant(id(2101),id(901),'ACADEMY_FOUNDER',null,'DUPLICATE_FOUNDER'),false);
  assert.equal(await grant(id(2102),id(902),'ACADEMY_ADMIN',null,'INITIAL_ADMIN'),true);
  assert.equal(await grant(id(2103),id(903),'ACADEMY_FOUNDER',null,''),false);
  assert.equal(one(db,"SELECT count(*) FROM learning.academy_staff_grants WHERE status='ACTIVE'"),'2');
  console.log('PASS PG'+version+' dedicated SERVICE bootstrap, Founder/Admin grant, duplicate and invalid reason refusal');

  await bind(id(901),id(1),id(100),'STAFF');
  assert.equal(await grant(id(2110),id(903),'ACADEMY_FOUNDER',null,'FOUNDER_FORGED'),false);
  assert.equal(await grant(id(2111),id(903),'ACADEMY_ADMIN',null,'FOUNDER_ADMIN'),true);
  assert.equal(await revoke(id(2101),'SELF_REVOKE'),false);
  assert.equal(await revoke(id(2102),'FOUNDER_REMOVES_ADMIN'),true);
  assert.equal(await revoke(id(2111),'FOUNDER_REMOVES_ADMIN'),true);
  assert.equal(one(db,"SELECT authorization_version FROM learning.academy_staff_grants WHERE grant_id='"+id(2102)+"'"),'2');
  assert.equal(one(db,"SELECT count(*) FROM learning.academy_staff_grants WHERE status='ACTIVE'"),'1');
  console.log('PASS PG'+version+' Founder can govern Admin only; cannot self-revoke or mint Founder; revocation version increments');

  await bind(id(900),null,null,'INTERNAL');
  assert.equal(await revoke(id(2101),'BOOTSTRAP_REVOKE_FOUNDER'),true);
  assert.equal(await revoke(id(2101),'SECOND_REVOKE'),false);
  assert.equal(one(db,"SELECT count(*) FROM learning.academy_staff_grants WHERE status='ACTIVE'"),'0');
  const audit=Number(one(db,"SELECT count(*) FROM audit.access_events WHERE resource_kind='ACADEMY_STAFF_CAPABILITY' AND decision IN ('ALLOW','DENY')"));
  assert(audit>=8,'GRANT_AND_DENIAL_AUDIT_MISSING');
  const mutated=sql(db,"UPDATE learning.academy_staff_grants SET principal_id='"+id(903)+"' WHERE grant_id='"+id(2101)+"'",true);
  assert.notEqual(mutated.status,0,'IMMUTABLE_GRANT_IDENTITY_CHANGED');
  console.log('PASS PG'+version+' restricted revoke, immutable grant identity, audit decisions='+audit);

  await app.query('SELECT auth.clear_context()');
  assert.equal(one(db,'SELECT count(*) FROM auth.session_contexts'),'0');
  assert.equal(one(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  console.log('PASS PG'+version+' existing context and ticket cleanup; no duplicate session system');
} catch(error) {
  console.error(redact(error.stack||error));
  throw error;
} finally {
  if(app){try{await app.end()}catch{}}
  if(binder){try{await binder.end()}catch{}}
  for(const cid of containers.reverse()){
    const label=run(['inspect','--format','{{index .Config.Labels "phoenix.academic.a1"}}',cid]);
    assert.equal(label.status,0);
    assert.equal(label.stdout.trim(),nonce,'FOREIGN_CONTAINER_CLEANUP_REFUSED');
    docker(['rm','-f','-v',cid]);
  }
  rmSync(work,{recursive:true,force:true});
  console.log('PASS PG'+version+' disposable container/volume/credentials cleaned');
}
