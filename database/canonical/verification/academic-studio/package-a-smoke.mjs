import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const version=process.argv[2];
assert(['16','17'].includes(version),'PG16_OR_PG17_REQUIRED');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const candidate='database/canonical/forward-candidates/academic-studio/001_identity_context.sql';
const work=mkdtempSync(path.join(tmpdir(),'academic-package-a-'));
const nonce=randomBytes(6).toString('hex');
const image=version==='16'
  ? 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
  : 'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
const digest=createHash('sha256').update(readFileSync(path.join(root,candidate))).digest('hex');
function docker(args,input,expectFailure=false) {
  const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:12*1024*1024});
  if(expectFailure)return r.status!==0;
  if(r.status!==0)throw Error('OWNED_DOCKER_STEP_FAILED '+(r.stderr+r.stdout).replace(/[A-Za-z0-9_=-]{35,}/g,'[REDACTED]').slice(-1300));
  return r.stdout.trim();
}
let id=null;
function sql(query,expectFailure=false){
  return docker(['exec','-i','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,'psql','-X','-q','-At','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev'],query,expectFailure);
}
function check(value,message){assert(value,message);console.log('PASS '+message);}
const envFile=path.join(work,'postgres.env');
writeFileSync(envFile,'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+randomBytes(32).toString('hex')+'\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',{mode:0o600});
try{
  id=docker(['run','-d','--name','academic-pga-pg'+version+'-'+nonce,
    '--label','phoenix.academic.test='+nonce,'-p','127.0.0.1::5432','--env-file',envFile,image]);
  assert.match(id,/^[a-f0-9]{64}$/);
  docker(['exec',id,'bash','-c','umask 077; printf "127.0.0.1:5432:*:phoenix_bootstrap:%s\\n" "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass']);
  let ready=false;
  for(let i=0;i<60;i++){
    const result=spawnSync('docker',['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,'psql','-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-At','-c','SELECT 1'],{stdio:'ignore'});
    if(result.status===0){ready=true;break;}
    spawnSync('sleep',['0.5'],{stdio:'ignore'});
  }
  assert(ready,'PG_READY_TIMEOUT');
  docker(['exec',id,'mkdir','-p','/opt/canonical-migrations','/opt/verification','/opt/academic']);
  docker(['cp',path.join(root,'database/canonical/migrations')+'/.',id+':/opt/canonical-migrations']);
  docker(['cp',path.join(root,'database/canonical/verification/migrate.sh'),id+':/opt/verification/migrate.sh']);
  docker(['cp',path.join(root,candidate),id+':/opt/academic/001_identity_context.sql']);
  check(docker(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',id,'bash','/opt/verification/migrate.sh']).includes('PASS ledger=37 files=37 expected=37'),'formal 0001-0037 install on PG'+version);
  const ledger=sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;\n");
  check(sql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37','37-row formal ledger');
  check(sql("SELECT md5(pg_get_functiondef('learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure));\n")==='4b65b734551738529b6cbc3935217bab',
    'formal S1 function matches exclusive pre-0045/A0 baseline');
  // A2 overlap regression: PR #93 A1 independently creates the same grant table.
  // If A1 was installed first, Package A must refuse BEFORE any context/ACL/ledger changes.
  sql("CREATE TABLE learning.academy_staff_grants (grant_id uuid PRIMARY KEY);\n");
  check(sql("SET phoenix.academic_studio_candidate='isolated';\n\\i /opt/academic/001_identity_context.sql\n",true),
    'pre-existing A1 academy grants block Package A installation');
  check(sql("SELECT to_regclass('learning.academy_staff_grants') IS NOT NULL;\n")==='t',
    'A1 collision refusal retains existing grant table');
  check(sql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37',
    'A1 collision refusal preserves canonical migration ledger');
  check(sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;\n")===ledger,
    'A1 collision refusal preserves historical ledger checksums');
  check(sql("SELECT md5(pg_get_functiondef('learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure));\n")==='4b65b734551738529b6cbc3935217bab',
    'A1 collision refusal leaves S1 baseline function untouched');
  sql("DROP TABLE learning.academy_staff_grants;\n");
  check(sql("\\i /opt/academic/001_identity_context.sql\n",true),'candidate refuses missing isolated flag');
  check(sql("SELECT to_regclass('learning.academy_staff_grants') IS NULL;\n")==='t','refusal has no schema changes');
  sql("SET phoenix.academic_studio_candidate='isolated';\n\\i /opt/academic/001_identity_context.sql\n");
  check(sql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37','unnumbered candidate did not enter formal ledger');
  check(sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;\n")===ledger,'historical ledger checksums unchanged');
  check(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='learning.academy_staff_grants'::regclass;\n")==='true:true','new grant table FORCE RLS');
  check(sql("SELECT count(*) FROM pg_indexes WHERE schemaname='learning' AND indexname='academy_single_active_founder';\n")==='1','DB unique index enforces single active Founder');
  check(sql("SELECT has_table_privilege('phoenix_canonical_app','learning.academy_staff_grants','SELECT');\n")==='f','direct app table SELECT denied');
  check(sql("SELECT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE');\n")==='f','public cannot invoke academy grants');
  check(sql("SELECT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='core.read_student_self_summary()'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE');\n")==='f','public cannot invoke student projection');
  check(sql("SELECT pg_get_function_result('core.read_student_self_summary()'::regprocedure);\n")==='jsonb','student self result is opaque JSON, not raw UUID table');
  check(sql("SELECT attnotnull FROM pg_attribute WHERE attrelid='learning.attendance_correction'::regclass AND attname='corrected_by_teacher_person_id';\n")==='f','admin correction no longer requires teacher FK');
  check(sql("SELECT count(*) FROM pg_attribute WHERE attrelid='learning.attendance_correction'::regclass AND attname='corrected_by_principal_id';\n")==='1','admin correction retains Principal attribution');
  check(sql("SELECT position('current_staff_kind()' in pg_get_functiondef('learning.teacher_has_class_access(uuid,uuid)'::regprocedure));\n")==='0','teacher access is independent of admin role priority');
  check(sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' AND p.proname='can_open_parent_view';\n")==='1','explicit guardian view guard exists');
  check(sql("SELECT has_function_privilege('phoenix_canonical_app','auth.can_open_parent_view(uuid)','EXECUTE');\n")==='t','app may invoke Parent-view guard');
  check(sql("SELECT has_function_privilege('phoenix_canonical_reader','auth.can_open_parent_view(uuid)','EXECUTE');\n")==='f','reader may not invoke Parent-view guard');
  check(sql("SELECT has_function_privilege('phoenix_canonical_context_binder','auth.can_open_parent_view(uuid)','EXECUTE');\n")==='f','binder may not invoke Parent-view guard');
  check(sql("SET phoenix.academic_studio_candidate='isolated';\n\\i /opt/academic/001_identity_context.sql\n",true),'repeat candidate refused without duplicate install');
  check(sql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37','ledger intact after repeat denial');
  // Backup/restore drill stays entirely within the owned disposable cluster.
  // Restore into an independent empty database; never overwrite Canonical dev.
  const restoreDb='phoenix_canonical_a2_restore';
  docker(['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,
    'pg_dump','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev',
    '-Fc','--exclude-table-data=auth.session_contexts',
    '--exclude-table-data=auth.context_exchange_tickets',
    '-f','/tmp/academic-a2.dump']);
  docker(['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,
    'createdb','-h','127.0.0.1','-U','phoenix_bootstrap',restoreDb]);
  docker(['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',id,
    'pg_restore','--exit-on-error','-h','127.0.0.1','-U','phoenix_bootstrap',
    '-d',restoreDb,'/tmp/academic-a2.dump']);
  const restoredSql=query=>docker(['exec','-i','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',
    id,'psql','-X','-q','-At','-v','ON_ERROR_STOP=1','-h','127.0.0.1',
    '-U','phoenix_bootstrap','-d',restoreDb],query);
  check(restoredSql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37',
    'A2 restore preserves formal 37-row Canonical ledger');
  check(restoredSql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;\n")===ledger,
    'A2 restore preserves Canonical ledger checksums');
  check(restoredSql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='learning.academy_staff_grants'::regclass;\n")==='true:true',
    'A2 restored academy grants preserve FORCE RLS');
  check(restoredSql("SELECT has_table_privilege('phoenix_canonical_app','learning.academy_staff_grants','SELECT');\n")==='f',
    'A2 restored grants deny direct app reads');
  check(restoredSql("SELECT md5(pg_get_functiondef('learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure));\n")===
    sql("SELECT md5(pg_get_functiondef('learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure));\n"),
    'A2 restored sensitive-read function matches source');
  check(restoredSql("SELECT count(*) FROM pg_indexes WHERE schemaname='learning' AND indexname='academy_single_active_founder';\n")==='1',
    'A2 restored Founder uniqueness index present');
  // Restored security ownership, explicit private-function ACLs and
  // application-denied behavior are part of the recovery gate.
  const ownerSql="SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='learning.academy_staff_grants'::regclass;\n";
  check(restoredSql(ownerSql)===sql(ownerSql),'A2 restored academy grant table owner matches source');
  const auditSql="SELECT count(*) FROM audit.access_events;\n";
  check(restoredSql(auditSql)===sql(auditSql),'A2 restored audit event count matches source');
  check(restoredSql("SELECT count(*) FROM auth.session_contexts;\n")==='0',
    'A2 restore excludes stale backend-bound session contexts');
  check(restoredSql("SELECT count(*) FROM auth.context_exchange_tickets;\n")==='0',
    'A2 restore excludes single-use authentication tickets');
  check(restoredSql("SELECT has_function_privilege('phoenix_canonical_reader','learning.grant_academy_staff_capability(uuid,uuid,text,timestamptz,text)','EXECUTE');\n")==='f',
    'A2 restored reader cannot issue Academy Admin/Founder grants');
  check(restoredSql("SELECT has_function_privilege('phoenix_canonical_app','learning.has_academy_capability(text)','EXECUTE');\n")==='f',
    'A2 restored app cannot invoke private capability helper');
  check(restoredSql("SET ROLE phoenix_canonical_app;\nSELECT auth.current_principal_id() IS NULL;\nRESET ROLE;\n")==='t',
    'A2 restored unbound application Principal remains null');
  check(sql("SELECT count(*) FROM canonical_migrations.applied;\n")==='37',
    'A2 source database ledger intact after restore');
  console.log('PASS PG'+version+' A2 isolated backup/restore with RLS, ACL, ledger and function parity');
  console.log(JSON.stringify({status:'PASS',postgres:version,candidate_sha256:digest,formal_ledger:37,fixtures:'synthetic only'}));
}finally{
  if(id){
    check(docker(['inspect','--format','{{index .Config.Labels "phoenix.academic.test"}}',id])===nonce,'owned container verified');
    docker(['rm','-f','-v',id]);
  }
  rmSync(work,{recursive:true,force:true});
  console.log('PASS disposable cluster and synthetic files removed');
}
