import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Only called by the owning disposable-cluster harness; no runtime URL/secret input CLI.
export async function runReadAuditRegression({db,sql,connection,Pool,appPassword,binderPassword,id,issuer,familyKey,randomUUID,docker}) {
  const appPool=new Pool(connection(db,'projection_app',appPassword));
  const binder=new Pool(connection(db,'projection_binder',binderPassword));
  const pub=n=>'stu_'+id(n).replaceAll('-','');
  const family=n=>'fam_'+id(n).replaceAll('-','');
  const denied=e=>e.code==='42501';
  async function bound(subject,fn,{familyId=familyKey('a'),ttl=10000}={}) {
    const app=await appPool.connect(),nonce=randomUUID();
    try {
      await app.query('SET ROLE phoenix_canonical_projection_reader');await app.query('SELECT auth.clear_context()');
      const ticket=(await binder.query('SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)',[issuer,subject,familyId,new Date(Date.now()+ttl),nonce])).rows[0];assert(ticket);
      await app.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.ticket_id,ticket.principal_id]);
      await fn(app,nonce,ticket);
    } finally {
      await app.query('ROLLBACK');await app.query('SELECT auth.clear_context()');await app.query('RESET ROLE');await app.query('DISCARD ALL');app.release();
    }
  }
  const call=async(app,q,args=[]) => (await app.query(q,args)).rows[0].result;
  const q='SELECT core.read_family_summary() AS result', list='SELECT core.list_student_summaries() AS result', single='SELECT core.read_student_summary($1) AS result';
  try {
    const a=await appPool.connect();try {
      await a.query('SET ROLE phoenix_canonical_projection_reader');
      assert.equal((await call(a,q)).status,'DENY');
      for(const statement of ['SELECT * FROM core.people','SELECT * FROM core.families','SELECT * FROM core.student_profiles',
        'SELECT * FROM integration.public_ids','SELECT * FROM integration.legacy_id_mappings','SELECT * FROM audit.access_events',
        "UPDATE core.people SET display_name='forged'",'DELETE FROM core.people',"INSERT INTO audit.access_events(action) VALUES('forged')",
        "SELECT nextval('audit.access_events_event_id_seq')",'CREATE TABLE core.forged(id int)',
        "SELECT audit.record_access_event('READ','FAMILY_SUMMARY',NULL,'ALLOW','AUTHORIZED')",
        "SELECT audit.record_write_decision('READ','FAMILY_SUMMARY',NULL,true,'AUTHORIZED')",
        "SELECT integration.lookup_projection_public_id('FAMILY',NULL)","SELECT core.read_projection_summary('family',NULL)",
        'SELECT core.create_student_profile(NULL)','SET ROLE phoenix_canonical_reader','SET ROLE phoenix_canonical_app',
        'SET ROLE phoenix_canonical_context_binder','SET ROLE phoenix_canonical_migrator',
        'CREATE OR REPLACE FUNCTION core.read_family_summary() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$']) {
        await assert.rejects(a.query(statement),denied,statement);
      }
      await a.query('RESET ROLE');
    }finally{a.release();}
    await assert.rejects(binder.query(q),denied);
    console.log('PASS F-07 dedicated real LOGIN: all direct reads/DML/sequence/DDL/audit forgery/private helpers/management/role escalation refused; binder cannot read');

    await bound('usr_parent_a',async(app,nonce)=>{
      await app.query("CREATE TEMP TABLE families(family_id uuid,display_name text)");
      await app.query("INSERT INTO pg_temp.families VALUES($1,'Synthetic forged temp name')",[id(100)]);
      await app.query("SET search_path=pg_temp,core,auth");
      const f=await call(app,q);assert.deepEqual(f,{status:'ALLOW',data:{schemaVersion:'family-summary.v2',family:{familyRef:family(100),displayName:'Synthetic Family A'}}});
      const items=await call(app,list);assert.deepEqual(items.data.items,[{studentRef:pub(3),displayName:sql(db,`SELECT display_name FROM core.people WHERE person_id='${id(3)}'`)}]);
      assert.equal((await call(app,single,[pub(3)])).status,'ALLOW');
      assert.deepEqual(await call(app,single,[pub(4)]),{status:'NOT_FOUND',data:null});
      assert.deepEqual(await call(app,single,[pub(999)]),{status:'NOT_FOUND',data:null});
      for(const bad of [null,'stu_2026_001','per_'+id(3).replaceAll('-',''),id(3),familyKey('a'),'usr_parent_a'])assert.equal((await call(app,single,[bad])).status,'DENY');
      const events=JSON.parse(sql(db,`SELECT coalesce(json_agg(row_to_json(e)),'[]') FROM (SELECT action,resource_kind,resource_id,decision,reason_code,principal_id,actor_person_id,family_id,request_nonce,attempt_id FROM audit.access_events WHERE request_nonce='${nonce}') e`));
      assert(events.length>=6);assert(events.every(e=>e.action==='READ'&&e.principal_id===id(201)&&e.actor_person_id===id(1)&&e.family_id===id(100)&&e.request_nonce===nonce&&e.attempt_id));
      assert.equal(new Set(events.map(e=>e.attempt_id)).size,events.length);
      assert(events.filter(e=>e.decision==='DENY').every(e=>e.resource_id===null));
      assert(events.some(e=>e.resource_kind==='STUDENT_SUMMARY_LIST'&&e.decision==='ALLOW'));
      assert(events.some(e=>e.resource_kind==='STUDENT_SUMMARY'&&e.resource_id===id(3)&&e.decision==='ALLOW'));
      assert(events.every(e=>e.resource_id!==id(4)));
    });
    console.log('PASS F-02/04/09 typed registered IDs and v2 exact DTOs; legacy/application IDs not treated as public IDs; same 404 for unknown/foreign; nonce/attempt/principal audit verified');

    for(const [subject,expected]of [['usr_student_a',[pub(3)]],['usr_unrelated_a',[]]])await bound(subject,async app=>{
      assert.deepEqual((await call(app,list)).data.items.map(x=>x.studentRef),expected);
    });
    await bound('usr_parent_a',async app=>{
      for(const mutation of [
        `DELETE FROM integration.public_ids WHERE entity_kind='FAMILY' AND canonical_id='${id(100)}'`,
        `UPDATE integration.public_ids SET public_id='per_'||replace(canonical_id::text,'-','') WHERE entity_kind='FAMILY' AND canonical_id='${id(100)}'`,
        `UPDATE integration.public_ids SET public_id='fam_'||repeat('f',32) WHERE entity_kind='FAMILY' AND canonical_id='${id(100)}'`
      ]){
        sql(db,mutation);assert.deepEqual(await call(app,q),{status:'UNAVAILABLE',data:null});
        sql(db,`DELETE FROM integration.public_ids WHERE entity_kind='FAMILY' AND canonical_id='${id(100)}'; INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id) VALUES('FAMILY','${family(100)}','${id(100)}')`);
      }
      sql(db,`UPDATE integration.public_ids SET canonical_id='${id(999)}' WHERE entity_kind='STUDENT_PROFILE' AND canonical_id='${id(3)}'`);
      assert.equal((await call(app,list)).status,'UNAVAILABLE');
      sql(db,`UPDATE integration.public_ids SET canonical_id='${id(3)}' WHERE entity_kind='STUDENT_PROFILE' AND canonical_id='${id(999)}'`);
      sql(db,`UPDATE integration.public_ids SET public_id='per_'||replace(canonical_id::text,'-','') WHERE entity_kind='STUDENT_PROFILE' AND canonical_id='${id(3)}'`);
      assert.equal((await call(app,list)).status,'UNAVAILABLE');
      sql(db,`UPDATE integration.public_ids SET public_id='${pub(3)}' WHERE entity_kind='STUDENT_PROFILE' AND canonical_id='${id(3)}'`);
      assert.equal((await call(app,list)).status,'ALLOW');
    });
    console.log('PASS F-03 missing, wrong-prefix, mismatched and dangling mapping fails closed without ID fallback/auto-repair; restored fixture only by test owner');

    await bound('usr_parent_a',async(app,nonce)=>{
      await app.query('BEGIN READ ONLY');await assert.rejects(app.query(q),e=>e.code==='25006');await app.query('ROLLBACK');
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${nonce}'`),'0');
      await app.query('BEGIN');assert.equal((await call(app,q)).status,'ALLOW');await app.query('ROLLBACK');
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${nonce}'`),'0');
      const logs=spawnSync('docker',['logs',db.id],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});assert.equal(logs.status,0);
      assert((logs.stdout+logs.stderr).split('\n').some(x=>x.includes('PHOENIX_AUDIT')&&x.includes(nonce)&&x.includes('action=READ')));
      await app.query('BEGIN');assert.equal((await call(app,q)).status,'ALLOW');await app.query('COMMIT');
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${nonce}'`),'1');
      const after=spawnSync('docker',['logs',db.id],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});assert.equal(after.status,0);
      const attempts=[...new Set((after.stdout+after.stderr).split('\n').filter(x=>x.includes(nonce)&&x.includes('action=READ')).map(x=>x.match(/attempt_id=([a-f0-9-]{36})/)?.[1]).filter(Boolean))];
      const committed=sql(db,`SELECT attempt_id FROM audit.access_events WHERE request_nonce='${nonce}'`);
      assert(attempts.includes(committed));assert(attempts.filter(x=>x!==committed).length>=2);
    });
    console.log('PASS F-10/11 READ ONLY refused; rollback erases DB row but log attempt remains; ordinary restricted transaction commits audit');

    await bound('usr_parent_a',async(app)=>{
      const pid=(await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      sql(db,`UPDATE auth.session_contexts SET backend_start=backend_start-interval '1 second' WHERE backend_pid=${Number(pid)}`);
      assert.equal((await app.query('SELECT auth.current_family_id() AS id')).rows[0].id,null);
      assert.equal((await call(app,q)).status,'DENY');sql(db,'SELECT auth.cleanup_stale_contexts()');
    });
    await bound('usr_parent_a',async app=>{
      const pid=(await app.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      sql(db,`UPDATE auth.session_contexts SET channel='ADVISOR' WHERE backend_pid=${Number(pid)}`);
      assert.equal((await call(app,q)).status,'DENY');
    });
    await bound('usr_parent_a',async app=>{
      await app.query('BEGIN');await app.query('SELECT pg_sleep(0.4)');assert.equal((await call(app,q)).status,'DENY');await app.query('COMMIT');
    },{ttl:250});
    console.log('PASS F-05 real backend_start mismatch and expiry inside existing transaction deny context');

    // Fresh tickets with independent connections: forged, expired, intended-principal mismatch and replay.
    const a2=await appPool.connect();try{
      await a2.query('SET ROLE phoenix_canonical_projection_reader');
      await assert.rejects(a2.query('SELECT auth.redeem_context_ticket($1,$2)',[randomUUID(),id(201)]));
      const issue=async()=> (await binder.query('SELECT * FROM auth.issue_application_family_context_ticket($1,$2,$3,$4,$5)',[issuer,'usr_parent_a',familyKey('a'),new Date(Date.now()+10000),randomUUID()])).rows[0];
      const expired=await issue();sql(db,`UPDATE auth.context_exchange_tickets SET expires_at=clock_timestamp()-interval '1 second' WHERE ticket_id='${expired.ticket_id}'`);
      await assert.rejects(a2.query('SELECT auth.redeem_context_ticket($1,$2)',[expired.ticket_id,expired.principal_id]));
      const t=await issue();await assert.rejects(a2.query('SELECT auth.redeem_context_ticket($1,$2)',[t.ticket_id,id(202)]));
      await a2.query('SELECT auth.redeem_context_ticket($1,$2)',[t.ticket_id,t.principal_id]);
      await assert.rejects(a2.query('SELECT auth.redeem_context_ticket($1,$2)',[t.ticket_id,t.principal_id]));
      await a2.query('SELECT auth.clear_context()');assert.equal((await call(a2,q)).status,'DENY');await a2.query('RESET ROLE');
    }finally{a2.release();}
    console.log('PASS F-08 forged/expired/wrong-principal/replayed tickets refused, clear removes usable context');

    const offset=sql(db,`SELECT EXISTS(SELECT 1 FROM core.people WHERE person_id='${id(5000)}')`)==='t'?6000:5000;
    function add(n){return `INSERT INTO core.people(person_id,display_name) VALUES('${id(n)}','Synthetic limit fixture');
      INSERT INTO core.student_profiles(person_id) VALUES('${id(n)}');
      INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id) VALUES('STUDENT_PROFILE','${pub(n)}','${id(n)}');
      INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES('${id(n+10000)}','${id(100)}','${id(n)}','MEMBER',now()-interval '2 days');
      INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,valid_from,valid_until)
      VALUES('${id(n+20000)}','${id(100)}','${id(1)}','${id(n)}','VERIFIED','GENERAL',now()-interval '1 day',now()+interval '1 day');`}
    sql(db,Array.from({length:99},(_,i)=>add(offset+i)).join('\n'));
    await bound('usr_parent_a',async(app,nonce)=>{
      assert.equal((await call(app,list)).data.items.length,100);
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${nonce}' AND decision='ALLOW'`),'101');
    });
    sql(db,add(offset+99)+add(offset+100));
    await bound('usr_parent_a',async(app,nonce)=>{
      assert.deepEqual(await call(app,list),{status:'UNAVAILABLE',data:null});
      assert.equal(sql(db,`SELECT count(*) FROM audit.access_events WHERE request_nonce='${nonce}' AND decision='ALLOW'`),'0');
      assert.equal(sql(db,`SELECT reason_code FROM audit.access_events WHERE request_nonce='${nonce}'`),'RESULT_LIMIT_EXCEEDED');
    });
    sql(db,`UPDATE core.family_memberships SET valid_until=clock_timestamp()-interval '1 second' WHERE person_id BETWEEN '${id(offset)}' AND '${id(offset+100)}'`);
    console.log('PASS F-06/09 GENERAL scope accepted only for eligible basic student; 100 items audit101, overflow fails whole response without ALLOW item events');
  } finally {
    await appPool.end();await binder.end();sql(db,'SELECT auth.cleanup_stale_contexts()');
  }
  assert.equal(sql(db,'SELECT count(*) FROM auth.session_contexts'),'0');
  assert.equal(sql(db,'SELECT count(*) FROM auth.context_exchange_tickets'),'0');
  console.log('PASS new read-audit regressions completed on fresh/restored cluster; no contexts or tickets remain');
}
