import assert from 'node:assert/strict';
import {drillRecorder,integritySnapshot} from './failure-drill-recorder.mjs';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
export async function databaseFailureDrills({db,sql,call,docker,nonce,version,directory,Pool,connection,appPassword,binderPassword,issuer,familyKey,jwt}) {
  assert.equal(docker(['inspect','--format','{{index .Config.Labels "canonical.projection.test"}}',db.id]),nonce);
  const record=drillRecorder({directory,pg:version,phase:'database-'+db.port});const baseline=integritySnapshot(db,sql);
  const auditCount=()=>Number(sql(db,'SELECT count(*) FROM audit.access_events'));
  try {
  let r=record.start('R02','Cross-family read refusal','Family A token requests registered Family B student through existing controlled API');
  let response=await call('students/stu_01910000000070008000000000000004');assert.equal(response.status,404);assert(!JSON.stringify(await response.json()).includes('Student B'));record.mark(r,'detected_at');
  const requestId=response.headers.get('x-request-id');assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${requestId}' AND decision='DENY'`),'1');record.mark(r,'contained_at');record.mark(r,'recovery_started_at');assert.equal((await call()).status,200);record.mark(r,'recovered_at');
  assert.deepEqual(integritySnapshot(db,sql),baseline);
  record.finish(r,{actual_result:{foreignReadStatus:404,recoveryStatus:200,studentProjectionSubprobe:'PASS',serviceSummaryEndpoint:'NOT RUN: not implemented'},security_assertions:['zero foreign fields','DB DENY linked to request ID'],audit_reference:requestId,data_integrity_result:'business fingerprints unchanged',final_status:'HOLD',scope:'Authorized student projection refusal PASS; full service-summary scenario requires an implemented approved endpoint'});
  r=record.start('R04','Invalid identity and one-use ticket refusal','Expired/wrong-signature HTTP proofs, forged family header, expired/wrong-principal/replayed ticket on separate LOGIN connections');
  const statuses=[];
  for(const token of [jwt('usr_parent_a',familyKey('a'),{exp:1}),jwt('usr_parent_a',familyKey('a'),{aud:'invalid'}),jwt('usr_parent_a',familyKey('a'),{},generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey)]){const response=await call('family','usr_parent_a',familyKey('a'),{headers:{authorization:'Bearer '+token}});assert.equal(response.status,401);statuses.push({status:response.status,requestId:response.headers.get('x-request-id')});}
  assert.equal((await call('family','usr_parent_a',familyKey('a'),{headers:{'x-family-id':'forged'}})).status,403);
  const app=new Pool(connection(db,'projection_app',appPassword)),binder=new Pool(connection(db,'projection_binder',binderPassword));const a=await app.connect();let refused=0;
  try{await a.query('SET ROLE phoenix_canonical_projection_reader');
    const issue=async()=>{const result=await binder.query('SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)',[issuer,'usr_parent_a',familyKey('a'),new Date(Date.now()+10000),randomUUID()]);assert.equal(result.rows.length,1);return result.rows[0];};
    const first=await issue();await assert.rejects(a.query('SELECT auth.redeem_context_ticket($1,$2)',[first.ticket_id,'01910000-0000-7000-8000-000000000202']));refused++;
    await a.query('SELECT auth.redeem_context_ticket($1,$2)',[first.ticket_id,first.principal_id]);await assert.rejects(a.query('SELECT auth.redeem_context_ticket($1,$2)',[first.ticket_id,first.principal_id]));refused++;
    await a.query('SELECT auth.clear_context()');const expired=await issue();sql(db,`UPDATE auth.context_exchange_tickets SET expires_at=clock_timestamp()-interval '1 second' WHERE ticket_id='${expired.ticket_id}'`);
    await assert.rejects(a.query('SELECT auth.redeem_context_ticket($1,$2)',[expired.ticket_id,expired.principal_id]));refused++;sql(db,`DELETE FROM auth.context_exchange_tickets WHERE ticket_id='${expired.ticket_id}'`);
    assert.equal((await a.query('SELECT auth.current_family_id() IS NULL AS clear')).rows[0].clear,true);record.mark(r,'detected_at');record.mark(r,'contained_at');record.mark(r,'recovery_started_at');
  }finally{await a.query('SELECT auth.clear_context()');a.release();await app.end();await binder.end();}
  assert.equal((await call()).status,200);record.mark(r,'recovered_at');assert.deepEqual(integritySnapshot(db,sql),baseline);record.finish(r,{actual_result:{httpRefusals:statuses,ticketRefusals:refused,recoveryStatus:200},security_assertions:['expired proof denied','wrong audience denied','client family assertion denied','three ticket misuse cases denied','context cleared'],audit_reference:'HTTP gateway outcome/request ID and this controlled operator transcript; direct SQL ticket-refusal durable audit contract not asserted',data_integrity_result:'business fingerprints unchanged',final_status:'HOLD',scope:'Invalid identity/ticket mechanism subprobe PASS; complete Session lifecycle and durable refusal audit acceptance needs scoped reviewer/contract evidence'});
  const original=sql(db,"SELECT pg_get_functiondef('core.read_family_summary()'::regprocedure)");
  r=record.start('R06','Incompatible response contract','Replace function body only in owned test cluster with v1 response; immutable Migration files/ledger untouched');
  try{
    sql(db,`CREATE OR REPLACE FUNCTION core.read_family_summary() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT '{"status":"ALLOW","data":{"schemaVersion":"family-summary.v1","family":{"familyRef":"incompatible","displayName":"Synthetic incompatible"}}}'::jsonb $$`);
    response=await call();assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('Synthetic'));record.mark(r,'detected_at');record.mark(r,'contained_at');
  }finally{record.mark(r,'recovery_started_at');sql(db,original);}
  assert.equal(sql(db,"SELECT pg_get_functiondef('core.read_family_summary()'::regprocedure)"),original);assert.equal((await call()).status,200);record.mark(r,'recovered_at');
  assert.deepEqual(integritySnapshot(db,sql),baseline);
  record.finish(r,{actual_result:{incompatibleStatus:503,recoveryStatus:200,runtimeContractSubprobe:'PASS',deploymentPreflight:'NOT RUN'},security_assertions:['no incompatible DTO delivered','function definition restored byte-for-byte','ledger unchanged'],data_integrity_result:'business/ledger fingerprints unchanged',audit_reference:'Existing gateway UNAVAILABLE outcome; incompatible synthetic function intentionally lacks READ audit',final_status:'HOLD',scope:'local response-contract compatibility PASS; deployment preflight/Staging remains HOLD'});
  r=record.start('R07','Database transport interruption','Pause only owned labelled test container; call existing API once, then unpause and reacquire trusted context');
  const started=Date.now();
  try{docker(['pause',db.id]);response=await call('family',undefined,undefined,{signal:AbortSignal.timeout(12000)});assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('Synthetic'));record.mark(r,'detected_at');record.mark(r,'contained_at');}
  finally{record.mark(r,'recovery_started_at');docker(['unpause',db.id]);}
  assert.equal((await call()).status,200);assert.equal((await call()).status,200);record.mark(r,'recovered_at');assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(sql(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  assert.deepEqual(integritySnapshot(db,sql),baseline);
  record.finish(r,{actual_result:{outageStatus:503,recoveryStatus:200,elapsedMilliseconds:Date.now()-started},security_assertions:['bounded existing pool timeouts','no unbounded retry loop','new request reauthenticates','zero context/tickets after recovery'],data_integrity_result:'business/ledger fingerprints unchanged',audit_reference:'Gateway UNAVAILABLE while DB unavailable; new DB READ audit after recovery',final_status:'PASS'});
  r=record.start('R12','Protected audit persistence unavailable','Trigger rejects audit INSERT inside owned test cluster; finally remove only the injected trigger/function');
  const before=auditCount();
  try{sql(db,`CREATE FUNCTION audit.synthetic_drill_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DRILL_AUDIT_FAILURE'; END $$; CREATE TRIGGER synthetic_drill_fault BEFORE INSERT ON audit.access_events FOR EACH ROW EXECUTE FUNCTION audit.synthetic_drill_fault();`);
    response=await call();assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('Synthetic Family'));assert.equal(auditCount(),before);record.mark(r,'detected_at');record.mark(r,'contained_at');
  }finally{record.mark(r,'recovery_started_at');sql(db,'DROP TRIGGER IF EXISTS synthetic_drill_fault ON audit.access_events; DROP FUNCTION IF EXISTS audit.synthetic_drill_fault()');}
  response=await call();assert.equal(response.status,200);assert.equal(auditCount(),before+1);record.mark(r,'recovered_at');assert.deepEqual(integritySnapshot(db,sql),baseline);record.finish(r,{actual_result:{failedAuditHttpStatus:503,recoveryStatus:200,newAuditRows:1,fabricatedFaultPeriodRows:0},security_assertions:['no DTO without required audit','no fabricated fault-period audit','post-recovery audit persisted'],audit_reference:response.headers.get('x-request-id'),data_integrity_result:'business/ledger fingerprints unchanged',final_status:'PASS'});
  assert.deepEqual(integritySnapshot(db,sql),baseline);record.save();console.log('PASS local DB fault mechanics and unchanged business/ledger fingerprints; full R02/R04/R06 remain HOLD; R07/R12 PASS');
  } catch(error) {const current=record.records.at(-1);if(current)record.finish(current,{final_status:'FAIL',actual_result:String(error.message),release:'HOLD',security_pause:'REVIEW_REQUIRED; do not automatically resume'});record.save();throw error;}
}
