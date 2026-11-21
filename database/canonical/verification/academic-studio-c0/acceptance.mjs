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
const candidate='database/canonical/forward-candidates/academic-studio/assessments-c0.sql';
const work=mkdtempSync(path.join(tmpdir(),'academic-assessment-c0-'));
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
  id=docker(['run','-d','--name','academic-c0-pg'+version+'-'+nonce,
    '--label','phoenix.academic.c0='+nonce,'-p','127.0.0.1::5432','--env-file',envFile,image]);
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
  docker(['cp',path.join(root,candidate),id+':/opt/academic/assessments-c0.sql']);
  check(docker(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',id,'bash','/opt/verification/migrate.sh']).includes('PASS ledger=37 files=37 expected=37'),'formal 0001-0037 install on PG'+version);
  const ledger=sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied;");
  check(sql("SELECT count(*) FROM canonical_migrations.applied")==='37','formal ledger=37');
  check(sql("\\i /opt/academic/assessments-c0.sql\n",true),'C0 refuses install without isolated flag');
  check(sql("SELECT to_regclass('education.assessment_attempt') IS NULL")==='t','no schema created by denied candidate');
  sql("SET phoenix.academic_assessment_candidate='isolated';\n\\i /opt/academic/assessments-c0.sql\n");
  check(sql("SELECT count(*) FROM canonical_migrations.applied")==='37','C0 unnumbered, formal ledger unchanged');
  check(sql("SELECT md5(string_agg(migration_name||sha256,',' ORDER BY migration_name)) FROM canonical_migrations.applied")===ledger,'historical ledger checksums intact');
  check(sql("SELECT to_regclass('education.assessment_attempt') IS NOT NULL")==='t','attempt table exists');
  check(sql("SELECT relrowsecurity::text||':'||relforcerowsecurity::text FROM pg_class WHERE oid='education.assessment_result'::regclass")==='true:true','result forced RLS');
  check(sql("SELECT has_table_privilege('phoenix_canonical_app','education.assessment_result','SELECT')")==='f','no direct runtime result read');
  check(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='education' AND table_name='assessment_attempt' AND column_name='family_id'")==='0','assessment belongs to Student, not one family');
  check(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='education' AND table_name='assessment_result' AND column_name='normalized_score'")==='0','no universal cross-system score');
  check(sql("SET phoenix.academic_assessment_candidate='isolated';\n\\i /opt/academic/assessments-c0.sql\n",true),'duplicate C0 installation refused');
  sql("\nINSERT INTO core.people(person_id,display_name) VALUES\n ('01910000-0000-7000-8000-000000000001','Synthetic Recording Staff'),\n ('01910000-0000-7000-8000-000000000002','Synthetic Student');\nINSERT INTO core.student_profiles(person_id) VALUES('01910000-0000-7000-8000-000000000002');\nINSERT INTO auth.principals(principal_id,person_id,principal_kind,status)\n VALUES('01910000-0000-7000-8000-000000000101','01910000-0000-7000-8000-000000000001','FAMILY','ACTIVE');\nINSERT INTO education.assessment_attempt(attempt_id,student_person_id,instrument_code,instrument_version,source_kind,sitting_date,recorded_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000401','01910000-0000-7000-8000-000000000002','CAT4','CAT4_V1','TEACHER_ASSESSMENT',current_date,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000402','01910000-0000-7000-8000-000000000002','DSE','DSE_2026','OFFICIAL_RESULT',current_date,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000403','01910000-0000-7000-8000-000000000002','A_LEVEL','CAIE_2026','OFFICIAL_RESULT',current_date,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000404','01910000-0000-7000-8000-000000000002','IELTS','ACADEMIC_2026','OFFICIAL_RESULT',current_date,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000405','01910000-0000-7000-8000-000000000002','JLPT','JLPT_2026','SELF_REPORTED',current_date,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000406','01910000-0000-7000-8000-000000000002','CANTONESE','RUBRIC_V1','AI_PROPOSAL',current_date,'01910000-0000-7000-8000-000000000101');\nINSERT INTO education.assessment_result(result_id,attempt_id,dimension_code,score_scale_code,numeric_value,text_value,recorded_by_principal_id) VALUES\n ('01910000-0000-7000-8000-000000000501','01910000-0000-7000-8000-000000000401','OVERALL','CAT4_SAS',100,NULL,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000502','01910000-0000-7000-8000-000000000402','CHINESE','DSE_GRADE',NULL,'5**','01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000503','01910000-0000-7000-8000-000000000403','MATH','A_LEVEL_GRADE',NULL,'A*','01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000504','01910000-0000-7000-8000-000000000404','OVERALL','IELTS_BAND',6.5,NULL,'01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000505','01910000-0000-7000-8000-000000000405','LEVEL','JLPT_LEVEL',NULL,'N3','01910000-0000-7000-8000-000000000101'),\n ('01910000-0000-7000-8000-000000000506','01910000-0000-7000-8000-000000000406','SPEAKING','CANTONESE_RUBRIC_LEVEL',NULL,'B2','01910000-0000-7000-8000-000000000101');\n");
  check(sql("SELECT count(DISTINCT instrument_code) FROM education.assessment_attempt")==='6','six instrument families retained');
  check(sql("SELECT count(DISTINCT score_scale_code) FROM education.assessment_result")==='6','six original score scales retained separately');
  check(sql("INSERT INTO education.assessment_result(result_id,attempt_id,dimension_code,score_scale_code,numeric_value,recorded_by_principal_id) VALUES('01910000-0000-7000-8000-000000000507','01910000-0000-7000-8000-000000000404','LISTENING','CAT4_SAS',102,'01910000-0000-7000-8000-000000000101')",true),'cross-instrument scale substitution refused');
  check(sql("INSERT INTO education.assessment_result(result_id,attempt_id,dimension_code,score_scale_code,numeric_value,recorded_by_principal_id) VALUES('01910000-0000-7000-8000-000000000508','01910000-0000-7000-8000-000000000404','LISTENING','IELTS_BAND',6.3,'01910000-0000-7000-8000-000000000101')",true),'invalid IELTS band precision refused');
  check(sql("INSERT INTO education.assessment_result(result_id,attempt_id,dimension_code,score_scale_code,numeric_value,recorded_by_principal_id) VALUES('01910000-0000-7000-8000-000000000509','01910000-0000-7000-8000-000000000402','ENGLISH','DSE_GRADE',5,'01910000-0000-7000-8000-000000000101')",true),'numeric DSE grade cannot masquerade as text grade');
  check(sql("UPDATE education.assessment_result SET text_value='5' WHERE result_id='01910000-0000-7000-8000-000000000502'",true),'immutable result update refused');
  check(sql("DELETE FROM education.assessment_attempt WHERE attempt_id='01910000-0000-7000-8000-000000000406'",true),'immutable AI proposal attempt cannot be silently deleted');
  check(sql("SELECT count(*) FROM education.assessment_attempt_event")==='0','no publication or review inferred from raw candidate rows');
  console.log(JSON.stringify({status:'PASS',postgres:version,candidate_sha256:digest,formal_migrations:37,synthetic:true}));
}finally{
  if(id){
    check(docker(['inspect','--format','{{index .Config.Labels "phoenix.academic.c0"}}',id])===nonce,'owned container verified');
    docker(['rm','-f','-v',id]);
  }
  rmSync(work,{recursive:true,force:true});
  console.log('PASS disposable cluster and synthetic files removed');
}
