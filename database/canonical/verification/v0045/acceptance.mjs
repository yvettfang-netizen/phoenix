import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const version=process.argv[2];assert(['16','17'].includes(version),'PG16_OR_17_REQUIRED');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const serverRoot=path.join(root,'Phoenix Compass/education compass/server');
const require=createRequire(path.join(serverRoot,'package.json'));
const {Client}=require('pg');
const work=mkdtempSync(path.join(tmpdir(),'phoenix-s1-0045-'));
const nonce=randomBytes(5).toString('hex');
const image={'16':'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',
 '17':'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'}[version];
const appPassword=randomBytes(32).toString('hex'),binderPassword=randomBytes(32).toString('hex');
const id=n=>'01910000-0000-7000-8000-'+String(n).padStart(12,'0');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const redact=s=>String(s).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]');
const containers=[];
function docker(args,input){
 const r=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
 if(r.status!==0)throw new Error('DOCKER_'+args[0]+'_FAILED '+redact(r.stderr+r.stdout).slice(-1400));
 return r.stdout.trim();
}
function sql(db,statement){
 return docker(['exec','-i','-e','PGPASSFILE=/tmp/s1-0045.pgpass',db.id,'psql','-X','-q','-At','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],statement);
}
async function cluster(){
 const env=path.join(work,'postgres.env');
 writeFileSync(env,'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+randomBytes(32).toString('hex')+'\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',{mode:0o600,flag:'wx'});
 const cid=docker(['run','-d','--name','s1-0045-pg'+version+'-'+nonce,'--label','phoenix.s1.0045='+nonce,'-p','127.0.0.1::5432','--env-file',env,image]);
 assert.match(cid,/^[a-f0-9]{64}$/);
 const db={id:cid,port:Number(docker(['port',cid,'5432/tcp']).split(':').at(-1))};containers.push(cid);
 docker(['exec',cid,'bash','-c','umask 077; printf "127.0.0.1:5432:*:phoenix_bootstrap:%s\\n" "$POSTGRES_PASSWORD" > /tmp/s1-0045.pgpass']);
 let ready=false;
 for(let i=0;i<60;i++){
  const r=spawnSync('docker',['exec','-e','PGPASSFILE=/tmp/s1-0045.pgpass',cid,'psql','-X','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-c','SELECT 1'],{stdio:'ignore',windowsHide:true});
  if(r.status===0){ready=true;break;}await sleep(500);
 }
 assert(ready,'POSTGRES_READINESS_TIMEOUT');return db;
}
function sourceHash(db){
 return sql(db,"SELECT md5(pg_get_functiondef('learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure))");
}
function functionMeta(db){
 return sql(db,"SELECT concat_ws('|',pg_get_userbyid(proowner),coalesce(proacl::text,''),provolatile,prosecdef::text,coalesce(array_to_string(proconfig,','),'')) FROM pg_proc WHERE oid='learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure");
}
async function connect(user,password,db){
 const c=new Client({host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',user,password,application_name:'phoenix-s1-0045-'+user});
 await c.connect();return c;
}
async function issue(binder,principal,actor,family,channel){
 const r=await binder.query('SELECT auth.issue_context_ticket($1::uuid,$2::uuid,$3::uuid,$4::text,$5::timestamptz,$6::uuid,$7::uuid) AS ticket_id',
  [principal,actor,family,channel,new Date(Date.now()+50000),randomUUID(),principal]);
 return r.rows[0].ticket_id;
}
async function bind(app,binder,principal,actor,family,channel){
 await app.query('SELECT auth.clear_context()');
 const ticket=await issue(binder,principal,actor,family,channel);
 await app.query('SELECT auth.redeem_context_ticket($1::uuid,$2::uuid)',[ticket,principal]);
}
async function readCounts(app,cardId,reportId){
 await app.query('BEGIN ISOLATION LEVEL READ COMMITTED');
 try{
  const pid=(await app.query('SELECT pg_backend_pid()::text AS pid')).rows[0].pid;
  const card=(await app.query('SELECT count(*)::text AS n FROM learning.read_published_card($1::uuid)',[cardId])).rows[0].n;
  const report=(await app.query('SELECT count(*)::text AS n FROM learning.read_published_stage_report($1::uuid)',[reportId])).rows[0].n;
  await app.query('COMMIT');return {pid,card,report};
 }catch(e){await app.query('ROLLBACK');throw e;}
}
function seed(db){
 sql(db,
  "CREATE ROLE s1_0045_app LOGIN NOINHERIT PASSWORD '"+appPassword+"';"+
  "CREATE ROLE s1_0045_binder LOGIN NOINHERIT PASSWORD '"+binderPassword+"';"+
  "GRANT CONNECT ON DATABASE phoenix_canonical_dev TO s1_0045_app,s1_0045_binder;"+
  "GRANT phoenix_canonical_app TO s1_0045_app WITH INHERIT FALSE,SET TRUE;"+
  "GRANT phoenix_canonical_context_binder TO s1_0045_binder WITH INHERIT FALSE,SET TRUE;"+
  "INSERT INTO core.families(family_id,display_name) VALUES('"+id(100)+"','Synthetic S1 Family');"+
  "INSERT INTO core.people(person_id,display_name) VALUES"+
   "('"+id(1)+"','Synthetic Parent A'),('"+id(2)+"','Synthetic Student'),('"+id(3)+"','Synthetic Teacher'),('"+id(4)+"','Synthetic Parent B');"+
  "INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES"+
   "('"+id(201)+"','"+id(1)+"','FAMILY','ACTIVE'),('"+id(202)+"','"+id(2)+"','FAMILY','ACTIVE'),"+
   "('"+id(203)+"','"+id(3)+"','TEACHER','ACTIVE'),('"+id(204)+"','"+id(4)+"','FAMILY','ACTIVE');"+
  "INSERT INTO core.student_profiles(person_id) VALUES('"+id(2)+"');"+
  "INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from,valid_until) VALUES"+
   "('"+id(301)+"','"+id(100)+"','"+id(1)+"','PRIMARY',clock_timestamp()-interval '1 day',NULL),"+
   "('"+id(302)+"','"+id(100)+"','"+id(2)+"','MEMBER',clock_timestamp()-interval '1 day',NULL),"+
   "('"+id(303)+"','"+id(100)+"','"+id(4)+"','MEMBER',clock_timestamp()-interval '1 day',clock_timestamp()+interval '12 seconds');"+
  "INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,valid_from,valid_until) VALUES"+
   "('"+id(701)+"','"+id(100)+"','"+id(1)+"','"+id(2)+"','VERIFIED','LEARNING',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day'),"+
   "('"+id(702)+"','"+id(100)+"','"+id(4)+"','"+id(2)+"','VERIFIED','LEARNING',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day');"+
  "INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at) VALUES"+
   "('"+id(801)+"','"+id(100)+"','"+id(1)+"','"+id(1)+"','"+id(2)+"','LEARNING_RECORD','LEARNING','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day'),"+
   "('"+id(802)+"','"+id(100)+"','"+id(1)+"','"+id(4)+"','"+id(2)+"','LEARNING_RECORD','LEARNING','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day'),"+
   "('"+id(803)+"','"+id(100)+"','"+id(1)+"','"+id(3)+"','"+id(2)+"','LEARNING_RECORD','LEARNING','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day');"+
  "INSERT INTO learning.teacher(teacher_person_id,status,created_by_principal_id) VALUES('"+id(3)+"','ACTIVE','"+id(203)+"');"+
  "INSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id) VALUES('"+id(1001)+"','S1-COURSE','Synthetic S1 course','PUBLISHED','"+id(201)+"');"+
  "INSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,effective_until,status,created_by_principal_id) VALUES('"+id(1002)+"','"+id(1001)+"',1,clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','ACTIVE','"+id(201)+"');"+
  "INSERT INTO learning.class(class_id,course_version_id,class_code,capacity,status,starts_on,ends_on,created_by_principal_id) VALUES('"+id(1003)+"','"+id(1002)+"','S1-CLASS',10,'OPEN',current_date-1,current_date+30,'"+id(201)+"');"+
  "INSERT INTO learning.teacher_assignment(assignment_id,class_id,teacher_person_id,role,valid_from,valid_until,status,created_by_principal_id) VALUES('"+id(1004)+"','"+id(1003)+"','"+id(3)+"','LEAD',clock_timestamp()-interval '1 day',clock_timestamp()+interval '30 days','ACTIVE','"+id(203)+"');"+
  "INSERT INTO learning.enrollment(enrollment_id,family_id,student_person_id,course_version_id,status,created_by_principal_id) VALUES('"+id(1005)+"','"+id(100)+"','"+id(2)+"','"+id(1002)+"','ACTIVE','"+id(201)+"');"+
  "INSERT INTO learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id,course_version_id,status) VALUES('"+id(1005)+"','"+id(1003)+"','"+id(100)+"','"+id(2)+"','"+id(1002)+"','ACTIVE');"+
  "INSERT INTO learning.schedule_slot(slot_id,class_id,teacher_person_id,starts_at,ends_at,room_label,created_by_principal_id) VALUES('"+id(1006)+"','"+id(1003)+"','"+id(3)+"',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours','Synthetic Room','"+id(203)+"');"+
  "INSERT INTO learning.after_class_card(card_id,slot_id,class_id,enrollment_id,family_id,student_person_id,author_teacher_person_id,summary_text,status) VALUES('"+id(1007)+"','"+id(1006)+"','"+id(1003)+"','"+id(1005)+"','"+id(100)+"','"+id(2)+"','"+id(3)+"','Synthetic S1 learning card','PUBLISHED');"+
  "INSERT INTO learning.publication(publication_id,card_id,family_id,event_kind,acted_by_principal_id) VALUES('"+id(1008)+"','"+id(1007)+"','"+id(100)+"','PUBLISHED','"+id(201)+"');"+
  "INSERT INTO learning.stage_report(report_id,enrollment_id,family_id,student_person_id,author_teacher_person_id,period_label,summary_text,status) VALUES('"+id(1009)+"','"+id(1005)+"','"+id(100)+"','"+id(2)+"','"+id(3)+"','S1-PERIOD','Synthetic S1 stage report','PUBLISHED');"
 );
}
let app,binder;
try{
 const db=await cluster();
 docker(['exec',db.id,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
 docker(['cp',path.join(root,'database/canonical/migrations')+'/.',db.id+':/opt/canonical-migrations']);
 docker(['cp',path.join(root,'database/canonical/verification/migrate.sh'),db.id+':/opt/verification/migrate.sh']);
 const migrationFiles=readdirSync(path.join(root,'database/canonical/migrations')).filter(n=>/^[0-9]{4}_.+\.sql$/.test(n));
 assert.equal(migrationFiles.length,37,'FORMAL_BASE_MUST_BE_0001_0037');
 const baseline=docker(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',db.id,'bash','/opt/verification/migrate.sh']);
 assert.match(baseline,/PASS ledger=37 files=37 expected=37/);
 assert.match(baseline,/APPLIED 0037/);
 console.log('PASS PG'+version+' formal Canonical 0001-0037 fresh install; ledger=37');

 const candidate=readFileSync(path.join(root,'database/canonical/forward-candidates/family-membership-revocation/0045_family_membership_live_revocation.sql'),'utf8');
 const rollback=readFileSync(path.join(root,'database/canonical/forward-candidates/family-membership-revocation/rollback_0045_family_membership_live_revocation.sql'),'utf8');
 const oldHash='4b65b734551738529b6cbc3935217bab';
 const newHash='8c9c51f1e022af796318c90abddffca2';
 const beforeMeta=functionMeta(db);
 assert.equal(sourceHash(db),oldHash,'UNEXPECTED_0037_FUNCTION_DEFINITION');
 sql(db,candidate);
 assert.equal(sourceHash(db),newHash,'S1_FORWARD_FUNCTION_DEFINITION_MISMATCH');
 assert.equal(functionMeta(db),beforeMeta,'S1_FORWARD_MUST_PRESERVE_OWNER_ACL_AND_ATTRIBUTES');
 sql(db,candidate);
 assert.equal(sourceHash(db),newHash,'S1_REPEAT_MUST_BE_IDEMPOTENT');
 assert.equal(functionMeta(db),beforeMeta,'S1_REPEAT_CHANGED_OWNER_ACL_OR_ATTRIBUTES');
 sql(db,rollback);
 assert.equal(sourceHash(db),oldHash,'S1_ROLLBACK_DID_NOT_RESTORE_BASE_FUNCTION');
 assert.equal(functionMeta(db),beforeMeta,'S1_ROLLBACK_CHANGED_OWNER_ACL_OR_ATTRIBUTES');
 sql(db,candidate);
 assert.equal(sourceHash(db),newHash,'S1_REAPPLY_AFTER_ROLLBACK_FAILED');
 assert.equal(functionMeta(db),beforeMeta,'S1_REAPPLY_CHANGED_OWNER_ACL_OR_ATTRIBUTES');
 assert.equal(sql(db,'SELECT count(*) FROM canonical_migrations.applied'),'37','CANDIDATE_MUST_NOT_CHANGE_FORMAL_LEDGER');
 console.log('PASS PG'+version+' 0045 forward, repeat, rollback and reapply; owner/ACL/attributes unchanged; formal ledger remains 37');

 seed(db);
 app=await connect('s1_0045_app',appPassword,db);
 binder=await connect('s1_0045_binder',binderPassword,db);
 await app.query('SET ROLE phoenix_canonical_app');
 await binder.query('SET ROLE phoenix_canonical_context_binder');

 await bind(app,binder,id(201),id(1),id(100),'FAMILY');
 const parentBefore=await readCounts(app,id(1007),id(1009));
 assert.equal(parentBefore.card,'1','ACTIVE_PARENT_CARD_READ');
 assert.equal(parentBefore.report,'1','ACTIVE_PARENT_STAGE_REPORT_READ');
 const appPid=parentBefore.pid;
 sql(db,"UPDATE core.family_memberships SET valid_until=clock_timestamp()-interval '1 second' WHERE membership_id='"+id(301)+"'");
 const parentAfter=await readCounts(app,id(1007),id(1009));
 assert.equal(parentAfter.pid,appPid,'SAME_APP_BACKEND_REQUIRED');
 assert.equal(parentAfter.card,'0','REVOKED_PARENT_CARD_MUST_DENY');
 assert.equal(parentAfter.report,'0','REVOKED_PARENT_STAGE_REPORT_MUST_DENY');
 assert.equal((await app.query('SELECT auth.current_family_id()::text AS family_id')).rows[0].family_id,id(100),
  'CONTEXT_MUST_REMAIN_BOUND_TO_PROVE_LIVE_MEMBERSHIP_CHECK');
 console.log('PASS PG'+version+' same bound FAMILY backend: card/report ALLOW before membership end; DENY next READ COMMITTED request after committed end');

 await bind(app,binder,id(204),id(4),id(100),'FAMILY');
 const naturalBefore=await readCounts(app,id(1007),id(1009));
 assert.equal(naturalBefore.card,'1','NOT_YET_EXPIRED_MEMBER_CARD_READ');
 assert.equal(naturalBefore.report,'1','NOT_YET_EXPIRED_MEMBER_REPORT_READ');
 await sleep(13000);
 const naturalAfter=await readCounts(app,id(1007),id(1009));
 assert.equal(naturalAfter.pid,appPid,'SAME_APP_BACKEND_REQUIRED_FOR_NATURAL_EXPIRY');
 assert.equal(naturalAfter.card,'0','NATURALLY_EXPIRED_MEMBER_CARD_MUST_DENY');
 assert.equal(naturalAfter.report,'0','NATURALLY_EXPIRED_MEMBER_REPORT_MUST_DENY');
 console.log('PASS PG'+version+' same bound FAMILY backend: wall-clock membership expiry denies next card/report read');
 // Guardian authority revocation is independent of family membership.
 sql(db,"UPDATE core.family_memberships SET valid_until=NULL WHERE membership_id='"+id(303)+"'");
 await bind(app,binder,id(204),id(4),id(100),'FAMILY');
 const guardianBefore=await readCounts(app,id(1007),id(1009));
 assert.equal(guardianBefore.card,'1');assert.equal(guardianBefore.report,'1');
 sql(db,"UPDATE core.guardian_authorities SET revoked_at=clock_timestamp(),lifecycle_status='REVOKED' WHERE authority_id='"+id(702)+"'");
 const guardianAfter=await readCounts(app,id(1007),id(1009));
 assert.equal(guardianAfter.pid,appPid);
 assert.equal(guardianAfter.card,'0','REVOKED_GUARDIAN_CARD_DENIED');
 assert.equal(guardianAfter.report,'0','REVOKED_GUARDIAN_REPORT_DENIED');
 console.log('PASS PG'+version+' revoked guardian authority denies both published Learning records');

 // Consent withdrawal must deny without removing valid family membership.
 sql(db,"UPDATE core.family_memberships SET valid_until=NULL WHERE membership_id='"+id(301)+"'");
 await bind(app,binder,id(201),id(1),id(100),'FAMILY');
 const consentBefore=await readCounts(app,id(1007),id(1009));
 assert.equal(consentBefore.card,'1');assert.equal(consentBefore.report,'1');
 sql(db,"UPDATE consent.grants SET status='WITHDRAWN',withdrawn_at=clock_timestamp() WHERE consent_id='"+id(801)+"'");
 const consentAfter=await readCounts(app,id(1007),id(1009));
 assert.equal(consentAfter.pid,appPid);
 assert.equal(consentAfter.card,'0','WITHDRAWN_CONSENT_CARD_DENIED');
 assert.equal(consentAfter.report,'0','WITHDRAWN_CONSENT_REPORT_DENIED');
 console.log('PASS PG'+version+' withdrawn Learning Consent denies both published records');

 // A valid membership of Family B must not unlock Family A's publications.
 sql(db,"INSERT INTO core.families(family_id,display_name) VALUES('"+id(101)+"','Synthetic S1 Family B')");
 sql(db,"INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES('"+id(304)+"','"+id(101)+"','"+id(4)+"','MEMBER',clock_timestamp()-interval '1 day')");
 await bind(app,binder,id(204),id(4),id(101),'FAMILY');
 const crossFamily=await readCounts(app,id(1007),id(1009));
 assert.equal(crossFamily.pid,appPid);
 assert.equal(crossFamily.card,'0','CROSS_FAMILY_CARD_DENIED');
 assert.equal(crossFamily.report,'0','CROSS_FAMILY_REPORT_DENIED');
 console.log('PASS PG'+version+' cross-family Learning records remain inaccessible');


 await bind(app,binder,id(202),id(2),id(100),'FAMILY');
 const selfRead=await readCounts(app,id(1007),id(1009));
 assert.equal(selfRead.pid,appPid);
 assert.equal(selfRead.card,'1','STUDENT_SELF_CARD_READ_MUST_REMAIN');
 assert.equal(selfRead.report,'1','STUDENT_SELF_REPORT_READ_MUST_REMAIN');
 console.log('PASS PG'+version+' Student self-read remains allowed after guardian membership expiry');

 await bind(app,binder,id(203),id(3),id(100),'STAFF');
 const teacherRead=await readCounts(app,id(1007),id(1009));
 assert.equal(teacherRead.pid,appPid);
 assert.equal(teacherRead.card,'1','ACTIVE_TEACHER_ASSIGNMENT_CARD_READ_MUST_REMAIN');
 assert.equal(teacherRead.report,'1','ACTIVE_TEACHER_ASSIGNMENT_REPORT_READ_MUST_REMAIN');
 const decisions=sql(db,"SELECT count(*) FROM audit.access_events WHERE decision='DENY' AND resource_kind IN ('LEARNING_AFTER_CLASS_CARD','LEARNING_STAGE_REPORT')");
 assert(Number(decisions)>=4,'DENIED_LEARNING_READS_MUST_BE_AUDITED');
 assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'1','ONE_BOUND_APP_CONTEXT_EXPECTED');
 console.log('PASS PG'+version+' Teacher assignment path unchanged; denied card/report reads audited; one app context remains');
 await assert.rejects(app.query('SELECT * FROM learning.after_class_card'),e=>e.code==='42501');
 await assert.rejects(app.query('SELECT * FROM learning.stage_report'),e=>e.code==='42501');
 console.log('PASS PG'+version+' existing ACL denies direct Learning table reads');

 sql(db,"UPDATE learning.teacher_assignment SET status='REVOKED',revoked_at=clock_timestamp() WHERE assignment_id='"+id(1004)+"'");
 const teacherAfter=await readCounts(app,id(1007),id(1009));
 assert.equal(teacherAfter.pid,appPid);
 assert.equal(teacherAfter.card,'0','REVOKED_TEACHER_CARD_DENIED');
 assert.equal(teacherAfter.report,'0','REVOKED_TEACHER_REPORT_DENIED');
 console.log('PASS PG'+version+' Teacher assignment revocation denies both published records');


 await app.query('SELECT auth.clear_context()');
 await app.query('RESET ROLE');
 await binder.query('RESET ROLE');
 console.log('PASS PG'+version+' clear_context and role reset after S1 probes');
}catch(error){
 console.error(redact(error.stack||error));
 throw error;
}finally{
 if(app){try{await app.end();}catch{}}
 if(binder){try{await binder.end();}catch{}}
 for(const cid of containers.reverse()){
  const label=spawnSync('docker',['inspect','--format','{{index .Config.Labels "phoenix.s1.0045"}}',cid],{encoding:'utf8',windowsHide:true});
  assert.equal(label.status,0);assert.equal(label.stdout.trim(),nonce,'REFUSE_FOREIGN_CONTAINER_CLEANUP');
  docker(['rm','-f','-v',cid]);
 }
 rmSync(work,{recursive:true,force:true});
 console.log('PASS PG'+version+' owned disposable cluster, credentials and fixture directory cleaned');
}
