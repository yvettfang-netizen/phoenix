import assert from 'node:assert/strict';
import {id} from './cluster.mjs';
export async function commercialRegression(db,rt,credentials){
 const pool=new rt.Pool(rt.connection('workbench_operations',credentials.opsPassword)),client=await pool.connect();
 try{
  const ticket=await rt.binder.query("SELECT auth.issue_context_ticket($1,NULL,$2,'INTERNAL',clock_timestamp()+interval '30 seconds',$3,$1) AS ticket",[id(901),id(100),id(77001)]);
  await client.query('SET ROLE phoenix_canonical_app');await client.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.rows[0].ticket,id(901)]);
  const at=new Date(Date.now()-1000).toISOString();
  const record=async(n,kind,version,project=313)=>{const args=[id(77010+n),id(project),'SYN_OPENING_'+n,kind,'SYN_SOURCE_REFERENCE_'+n,'c'.repeat(64),version,at];return(await client.query('SELECT service.record_workbench_commercial_event($1,$2,$3,$4,$5,$6,$7,$8) AS ok',args)).rows[0].ok;};
  assert.equal(await record(0,'OPENING_APPROVED',1),false);
  assert.equal(await record(1,'CONTRACT_SIGNED',1),true);assert.equal(db.sql("SELECT service.workbench_opened('"+id(313)+"')"),'f');
  assert.equal(await record(2,'PAYMENT_CONFIRMED',2),true);assert.equal(db.sql("SELECT service.workbench_opened('"+id(313)+"')"),'f');
  assert.equal(await record(3,'OPENING_APPROVED',3),true);assert.equal(await record(3,'OPENING_APPROVED',3),true);
  assert.equal(db.sql("SELECT project_status FROM service.projects WHERE service_project_id='"+id(313)+"'"),'PLANNED');
  assert.equal(await record(4,'PAYMENT_REVERSED',4),true);assert.equal(db.sql("SELECT service.workbench_opened('"+id(313)+"')"),'f');
  assert.equal(await record(5,'OPENING_APPROVED',5),false);assert.equal(await record(6,'PAYMENT_CONFIRMED',6),true);
  assert.equal(db.sql("SELECT service.workbench_opened('"+id(313)+"')"),'f');
  assert.equal(await record(7,'OPENING_APPROVED',7),true);
  // Restore fail-closed synthetic fixture: the unopened project stays hidden.
  assert.equal(await record(8,'OPENING_REVOKED',8),true);
  console.log('PASS separate Operations LOGIN: signing, payment and explicit opening are distinct; reversal invalidates opening; no auto activation; replay idempotent');
  return {name:'Separate Operations LOGIN source events and opening/reversal gates',status:'PASS'};
 }finally{await client.query('SELECT auth.clear_context()');await client.query('DISCARD ALL');client.release();await pool.end();}
}
