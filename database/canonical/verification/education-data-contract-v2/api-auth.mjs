import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'));
const {Client}=require('pg');
const id=n=>'01940000-0000-7000-8000-'+String(n).padStart(12,'0');
const wait=ms=>new Promise(r=>setTimeout(r,ms));

export async function runApiAuthorization({port,sql,version}){
 const appPassword=randomBytes(32).toString('hex');
 const binderPassword=randomBytes(32).toString('hex');
 sql("CREATE ROLE edc_api_app LOGIN NOINHERIT PASSWORD '"+appPassword+"';"+
     "CREATE ROLE edc_api_binder LOGIN NOINHERIT PASSWORD '"+binderPassword+"';"+
     "GRANT CONNECT ON DATABASE phoenix_canonical_dev TO edc_api_app,edc_api_binder;"+
     "GRANT phoenix_canonical_app TO edc_api_app WITH INHERIT FALSE,SET TRUE;"+
     "GRANT phoenix_canonical_context_binder TO edc_api_binder WITH INHERIT FALSE,SET TRUE;");
 const create=async (user,password)=>{
  const c=new Client({host:'127.0.0.1',port,database:'phoenix_canonical_dev',user,password,application_name:'edc-v2-'+user});
  await c.connect();return c;
 };
 let app,binder;
 try{
  app=await create('edc_api_app',appPassword);
  binder=await create('edc_api_binder',binderPassword);
  await app.query('SET ROLE phoenix_canonical_app');
  await binder.query('SET ROLE phoenix_canonical_context_binder');
  const call=async (use,project=300,versionId=702,purpose='EDUCATION_APPLICATION')=>{
   const r=await app.query(
     'SELECT service.edc_request_private_document_use($1::uuid,$2::uuid,$3::uuid,$4::text) AS result',
     [id(use),id(project),id(versionId),purpose]);
   return r.rows[0].result;
  };
  const bind=async (person,principal,family,channel)=>{
   await app.query('SELECT auth.clear_context()');
   const issued=await binder.query(
     'SELECT auth.issue_context_ticket($1::uuid,$2::uuid,$3::uuid,$4::text,$5::timestamptz,$6::uuid,$7::uuid) AS ticket',
     [id(principal),id(person),id(family),channel,new Date(Date.now()+50000),randomUUID(),id(principal)]
   );
   await app.query('SELECT auth.redeem_context_ticket($1::uuid,$2::uuid)',[issued.rows[0].ticket,id(principal)]);
  };
  const pid=(await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  assert.equal((await call(760)).status,'DENY','no trusted context denies');
  await assert.rejects(()=>app.query('SELECT count(*) FROM service.education_document_uses'),/permission denied/i);
  await assert.rejects(()=>app.query(
    "INSERT INTO service.education_document_uses(use_id,service_project_id,version_id,family_id,subject_person_id,purpose_code,requested_by_principal_id) "+
    "VALUES($1,$2,$3,$4,$5,'EDUCATION_APPLICATION',$6)",
    [id(888),id(300),id(702),id(100),id(1),id(201)]
  ),/permission denied/i);
  console.log('PASS PG'+version+' separate app/binder LOGIN; direct new-table read/write denied; no-context request DENY');

  // Student subject uses current formal FAMILY self route, not unmerged STUDENT channel.
  await bind(1,201,100,'FAMILY');
  assert.equal((await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,pid);
  assert.equal((await call(730,303)).status,'DENY','reused request UUID from another project fails closed');
  assert.equal((await call(760,303)).status,'PENDING_REVIEW','self document request creates a pending project link');
  const again=await call(761,303);
  assert.equal(again.status,'PENDING_REVIEW','authorized request replay');
  assert.equal(again.useId,id(760),'replay does not duplicate project use');
  assert.equal((await call(762,300)).useId,id(730),'existing project A link reused');
  assert.equal((await call(763,301)).useId,id(731),'project B independent use');
  assert.equal((await call(764,303,702,'EDUCATION_SUPPORT')).status,'DENY','unsupported purpose closed');
  assert.equal((await call(765,302)).status,'DENY','other family project denied');

  // Parent access is a distinct capability and requires a live family membership + guardian + two consents.
  await bind(3,203,100,'FAMILY');
  assert.equal((await call(766,303)).status,'PENDING_REVIEW','verified guardian with consent');
  sql("UPDATE core.family_memberships SET valid_until=clock_timestamp() WHERE membership_id='"+id(1003)+"';");
  assert.equal((await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,pid);
  assert.equal((await call(767,303)).status,'DENY','post-bind membership end denies next request');
  console.log('PASS PG'+version+' Family self/guardian, two-project isolation and same-backend post-membership revocation');

  // Another family's principal with its own valid consent cannot see Family A.
  await bind(2,202,101,'FAMILY');
  assert.equal((await call(768,300)).status,'DENY','cross family denied');

  // Advisor requires exact case assignment and exact project specialist/manager role.
  await bind(10,210,100,'ADVISOR');
  assert.equal((await call(769,303)).status,'DENY','advisor without project assignment denied');
  assert.equal((await call(770,300)).status,'PENDING_REVIEW','advisor with case + project assignment + two consents');
  sql("UPDATE service.project_assignments SET status='ENDED',valid_until=clock_timestamp(),ended_by_principal_id='"+id(900)+"' WHERE project_assignment_id='"+id(1330)+"';");
  assert.equal((await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,pid);
  assert.equal((await call(771,300)).status,'DENY','project assignment removed next request');
  console.log('PASS PG'+version+' Advisor active case+project scope, no blanket project access, post-revocation denial');

  // Self subject consent withdrawal closes new use on same bound backend.
  await bind(1,201,100,'FAMILY');
  assert.equal((await call(772,303)).status,'PENDING_REVIEW');
  sql("UPDATE consent.grants SET status='WITHDRAWN',withdrawn_at=clock_timestamp() WHERE consent_id='"+id(1401)+"';");
  assert.equal((await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid,pid);
  assert.equal((await call(773,303)).status,'DENY','document consent withdrawn next request');

  // Principal disabled closes even a still-bound context.
  sql("UPDATE auth.principals SET status='DISABLED' WHERE principal_id='"+id(201)+"';");
  assert.equal((await call(774,303)).status,'DENY','disabled principal denied');
  await app.query('SELECT auth.clear_context()');
  assert.equal((await call(775,303)).status,'DENY','cleared context denied');
  assert.equal(sql("SELECT count(*) FROM service.education_document_uses WHERE service_project_id='"+id(303)+"'"),'1','exact one new project link');
  assert(Number(sql("SELECT count(*) FROM audit.access_events WHERE resource_kind='EDC_PROJECT_DOCUMENT_USE' AND decision='DENY'"))>=6);
  console.log('PASS PG'+version+' self consent withdrawal, disabled principal, context-clear, audit and one pending row');
 }finally{
  if(app){try{await app.query('RESET ROLE');}catch{};await app.end();}
  if(binder){try{await binder.query('RESET ROLE');}catch{};await binder.end();}
 }
}
