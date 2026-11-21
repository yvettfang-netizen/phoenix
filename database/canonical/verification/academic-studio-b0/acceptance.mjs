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
const candidate='database/canonical/forward-candidates/academic-studio/scheduling-b0.sql';
const work=mkdtempSync(path.join(tmpdir(),'academic-scheduling-b0-'));
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
  id=docker(['run','-d','--name','academic-b0-pg'+version+'-'+nonce,
    '--label','phoenix.academic.b0='+nonce,'-p','127.0.0.1::5432','--env-file',envFile,image]);
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
  const ledger=sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;");
  check(sql("SELECT count(*) FROM canonical_migrations.applied;")==='37','formal ledger=37');
  check(sql("\\i /opt/academic/scheduling-b0.sql\n",true),'no isolated flag refuses B0');
  check(sql("SELECT to_regclass('learning.room') IS NULL")==='t','no schema created by denied candidate');
  sql("SET phoenix.academic_scheduling_candidate='isolated';\n\\i /opt/academic/scheduling-b0.sql\n");
  check(sql("SELECT count(*) FROM canonical_migrations.applied")==='37','B0 remains unnumbered, ledger unchanged');
  check(sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied")===ledger,'formal ledger fingerprint intact');
  check(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='learning.schedule_slot_participant'::regclass")==='true:true','participant forced RLS');
  check(sql("SELECT has_table_privilege('phoenix_canonical_app','learning.room','SELECT')")==='f','no direct app room access');
  check(sql("SELECT has_function_privilege('phoenix_canonical_app','learning.set_slot_delivery(uuid,text,uuid,text,uuid,text)','EXECUTE')")==='t','app may call restricted teacher API');
  check(sql("SELECT has_function_privilege('PUBLIC','learning.set_slot_delivery(uuid,text,uuid,text,uuid,text)','EXECUTE')")==='f','public may not call teacher mode API');
  check(sql("SET phoenix.academic_scheduling_candidate='isolated';\n\\i /opt/academic/scheduling-b0.sql\n",true),'duplicate candidate installation rejected');
  sql("\nINSERT INTO core.families(family_id,display_name) VALUES('01910000-0000-7000-8000-000000000100','Synthetic B0 Family');\nINSERT INTO core.people(person_id,display_name) VALUES\n ('01910000-0000-7000-8000-000000000001','Lead Teacher'),\n ('01910000-0000-7000-8000-000000000002','Student'),\n ('01910000-0000-7000-8000-000000000003','Guardian'),\n ('01910000-0000-7000-8000-000000000004','Teacher B');\nINSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES\n ('01910000-0000-7000-8000-000000000101','01910000-0000-7000-8000-000000000001','TEACHER','ACTIVE'),\n ('01910000-0000-7000-8000-000000000103','01910000-0000-7000-8000-000000000003','FAMILY','ACTIVE'),\n ('01910000-0000-7000-8000-000000000104','01910000-0000-7000-8000-000000000004','TEACHER','ACTIVE');\nINSERT INTO core.student_profiles(person_id) VALUES('01910000-0000-7000-8000-000000000002');\nINSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES\n ('01910000-0000-7000-8000-000000000201','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000002','MEMBER',clock_timestamp()-interval '1 day'),\n ('01910000-0000-7000-8000-000000000202','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000003','PRIMARY',clock_timestamp()-interval '1 day');\nINSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at) VALUES\n ('01910000-0000-7000-8000-000000000301','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000003','01910000-0000-7000-8000-000000000001','01910000-0000-7000-8000-000000000002','LEARNING_RECORD','LEARNING','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '2 days');\nINSERT INTO learning.teacher(teacher_person_id,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000001','01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000004','01910000-0000-7000-8000-000000000104');\nINSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000401','B0-COURSE','Synthetic B0','PUBLISHED','01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,status,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000402','01910000-0000-7000-8000-000000000401',1,clock_timestamp()-interval '1 day','ACTIVE','01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.class(class_id,course_version_id,class_code,capacity,status,starts_on,ends_on,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000403','01910000-0000-7000-8000-000000000402','B0-CLASS',3,'OPEN',current_date-1,current_date+7,'01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.teacher_assignment(assignment_id,class_id,teacher_person_id,role,valid_from,valid_until,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000404','01910000-0000-7000-8000-000000000403','01910000-0000-7000-8000-000000000001','LEAD',clock_timestamp()-interval '1 day',clock_timestamp()+interval '9 days','01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.enrollment(enrollment_id,family_id,student_person_id,course_version_id,status,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000405','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000002','01910000-0000-7000-8000-000000000402','ACTIVE','01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id,course_version_id,status) VALUES\n ('01910000-0000-7000-8000-000000000405','01910000-0000-7000-8000-000000000403','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000002','01910000-0000-7000-8000-000000000402','ACTIVE');\nINSERT INTO learning.schedule_slot(slot_id,class_id,teacher_person_id,starts_at,ends_at,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000406','01910000-0000-7000-8000-000000000403','01910000-0000-7000-8000-000000000001',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours','01910000-0000-7000-8000-000000000101');\nINSERT INTO learning.room(room_id,room_code,location_code,display_name,capacity,timezone_name,created_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000407','B0_ROOM','HONG_KONG','Synthetic HK Room',1,'Asia/Hong_Kong','01910000-0000-7000-8000-000000000101');\n");
  const teacher = "SELECT auth.bind_context('01910000-0000-7000-8000-000000000101','01910000-0000-7000-8000-000000000001','01910000-0000-7000-8000-000000000100','STAFF',clock_timestamp()+interval '10 minutes',gen_random_uuid());\n";
  const session=teacher+
    "SELECT learning.set_slot_delivery('01910000-0000-7000-8000-000000000406','ONSITE','01910000-0000-7000-8000-000000000407','Asia/Hong_Kong','01910000-0000-7000-8000-000000000501','TEACHER_ROOM');\n"+
    "SELECT learning.assign_slot_participant('01910000-0000-7000-8000-000000000502','01910000-0000-7000-8000-000000000406','01910000-0000-7000-8000-000000000405','ONSITE','01910000-0000-7000-8000-000000000503','TEACHER_ONSITE');\n"+
    "SELECT learning.finalize_slot_delivery('01910000-0000-7000-8000-000000000406','01910000-0000-7000-8000-000000000504','TEACHER_FINAL');\n"+
    "SELECT auth.clear_context();";
  const outcome=sql(session);
  check(outcome.split('\n').filter(x=>x==='t').length===3,'lead teacher configures, assigns student and finalizes one slot');
  check(sql("SELECT delivery_mode||':'||delivery_status FROM learning.schedule_slot WHERE slot_id='01910000-0000-7000-8000-000000000406'")==='ONSITE:FINALIZED','single session finalized');
  check(sql("SELECT count(*) FROM learning.schedule_slot_event WHERE slot_id='01910000-0000-7000-8000-000000000406'")==='3','immutable mode/booking/finalization events');
  check(sql("UPDATE learning.schedule_slot_event SET reason_code='FORGED'",true),'event history UPDATE refused');
  sql("INSERT INTO learning.schedule_slot(slot_id,class_id,teacher_person_id,starts_at,ends_at,created_by_principal_id) SELECT '01910000-0000-7000-8000-000000000505',class_id,'01910000-0000-7000-8000-000000000004',starts_at,ends_at,'01910000-0000-7000-8000-000000000104' FROM learning.schedule_slot WHERE slot_id='01910000-0000-7000-8000-000000000406';");
  check(sql("UPDATE learning.schedule_slot SET room_id='01910000-0000-7000-8000-000000000407' WHERE slot_id='01910000-0000-7000-8000-000000000505'",true),'same physical room cannot have overlapping slots');
  check(sql("INSERT INTO learning.schedule_slot_participant(participant_id,slot_id,class_id,enrollment_id,family_id,student_person_id,participation_mode,starts_at,ends_at,set_by_principal_id) SELECT '01910000-0000-7000-8000-000000000506',s.slot_id,s.class_id,'01910000-0000-7000-8000-000000000405','01910000-0000-7000-8000-000000000100','01910000-0000-7000-8000-000000000002','ONLINE',s.starts_at,s.ends_at,'01910000-0000-7000-8000-000000000104' FROM learning.schedule_slot s WHERE s.slot_id='01910000-0000-7000-8000-000000000505'",true),'student collision in overlapping slots rejected');
  sql("UPDATE learning.schedule_slot SET status='CANCELLED' WHERE slot_id='01910000-0000-7000-8000-000000000406'");
  check(sql("SELECT status FROM learning.schedule_slot_participant WHERE slot_id='01910000-0000-7000-8000-000000000406'")==='CANCELLED','cancellation releases student reservation');
  console.log(JSON.stringify({status:'PASS',postgres:version,candidate_sha256:digest,formal_migrations:37,fixtures:'synthetic'}));
}finally{
  if(id){
    check(docker(['inspect','--format','{{index .Config.Labels "phoenix.academic.test"}}',id])===nonce,'owned container verified');
    docker(['rm','-f','-v',id]);
  }
  rmSync(work,{recursive:true,force:true});
  console.log('PASS disposable cluster and synthetic files removed');
}
