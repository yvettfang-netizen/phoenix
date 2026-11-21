import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const version=process.argv[2];assert(['16','17'].includes(version),'PG16_17_REQUIRED');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const candidate=path.join(root,'database/canonical/forward-candidates/academic-studio/b1_teacher_scheduling.sql');
const migrations=path.join(root,'database/canonical/migrations');
const sqlText=readFileSync(candidate,'utf8');
assert.equal(readdirSync(migrations).filter(x=>/^\d{4}_.*\.sql$/.test(x)).length,37);
assert(!/CREATE TABLE (auth.principals|core.people|core.student_profiles)/.test(sqlText));
const sha=createHash('sha256').update(sqlText).digest('hex');
const dir=mkdtempSync(path.join(tmpdir(),'phoenix-academic-b1-')),nonce=randomBytes(6).toString('hex');
const image=version==='16'?'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d':'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
let cid;
function run(args,input,expectFail=false){
 const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:8*1024*1024,timeout:300000});
 if(expectFail)return r.status!==0;
 if(r.status!==0)throw Error('B1_TEST_DOCKER_'+args[0]+' '+(r.stderr+r.stdout).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]').slice(-2000));
 return (r.stdout||'').trim();
}
function query(s,fail=false){return run(['exec','-i','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',cid,'psql','-X','-q','-At','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev'],s,fail);}
try{
 const env=path.join(dir,'postgres.env');
 writeFileSync(env,'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+randomBytes(32).toString('hex')+'\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',{mode:0o600});
 cid=run(['run','-d','--name','academic-b1-pg'+version+'-'+nonce,'--label','phoenix.academic.b1='+nonce,'-p','127.0.0.1::5432','--env-file',env,image]);
 assert.match(cid,/^[a-f0-9]{64}$/);
 run(['exec',cid,'bash','-c','umask 077; printf "127.0.0.1:5432:*:phoenix_bootstrap:%s\\n" "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass']);
 let ready=false;
 for(let i=0;i<80;i++){const r=spawnSync('docker',['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',cid,'psql','-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-c','SELECT 1'],{stdio:'ignore'});if(r.status===0){ready=true;break;}spawnSync('sleep',['0.5'],{stdio:'ignore'});}
 assert(ready,'B1_PG_READY_TIMEOUT');
 run(['exec',cid,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
 run(['cp',migrations+'/.',cid+':/opt/canonical-migrations']);
 run(['cp',path.join(root,'database/canonical/verification/migrate.sh'),cid+':/opt/verification/migrate.sh']);
 assert.match(run(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',cid,'bash','/opt/verification/migrate.sh']),/PASS ledger=37 files=37 expected=37/);
 const ledger=query("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;");
 assert(query(sqlText,true),'B1_UNGUARDED_INSTALL_MUST_FAIL');
 assert.equal(query("SELECT to_regclass('learning.room') IS NULL;"),'t');
 query("SET phoenix.academic_studio_candidate='isolated';\n"+sqlText);
 assert.equal(query("SELECT count(*) FROM canonical_migrations.applied;"),'37');
 assert.equal(query("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;"),ledger);
 for(const tbl of ['room','schedule_slot_participant','schedule_slot_event']){
   assert.equal(query("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='learning."+tbl+"'::regclass;"),'true:true');
   assert.equal(query("SELECT has_table_privilege('phoenix_canonical_app','learning."+tbl+"','SELECT');"),'f');
 }
 assert.equal(query("SELECT count(*) FROM pg_constraint WHERE conname IN ('learning_slot_room_no_overlap') AND contype='x';"),'1');
 assert.equal(query("SELECT count(*) FROM pg_constraint WHERE conrelid='learning.schedule_slot_participant'::regclass AND contype='x';"),'1');
 assert.equal(query("SELECT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='learning.set_slot_delivery(uuid,uuid,text,uuid,text,text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE');"),'f');
 assert.equal(query("SELECT count(*) FROM pg_trigger WHERE tgrelid='learning.schedule_slot'::regclass AND tgname='learning_slot_release_reservations' AND NOT tgisinternal;"),'1');
 assert(query("SET phoenix.academic_studio_candidate='isolated';\n"+sqlText,true),'B1_REPEAT_MUST_REFUSE');
 assert.equal(query("SELECT count(*) FROM canonical_migrations.applied;"),'37');
 console.log('PASS PG'+version+' B1 isolated SQL; ledger=37; room/student GiST collisions; FORCE RLS; no PUBLIC execute; cancellation guard; repeat/refusal; SHA256='+sha);
}finally{
 if(cid){
  assert.equal(run(['inspect','--format','{{index .Config.Labels "phoenix.academic.b1"}}',cid]),nonce,'FOREIGN_CONTAINER_REFUSED');
  run(['rm','-f','-v',cid]);
 }
 rmSync(dir,{recursive:true,force:true});
 console.log('PASS PG'+version+' B1 temporary container, volume and credentials cleaned');
}