import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {id} from './cluster.mjs';
export async function runWorkbenchSuite(db,rt,primary=310,offset=0,checks=[]){
 const baselineMessages=Number(db.sql('SELECT count(*) FROM service.workbench_messages'));
 const check=name=>{checks.push({name,status:'PASS',at:new Date().toISOString()});console.log('PASS '+name);};
 const expect=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.body));return response.body;};
 const read=async(alias='client-a',project=primary)=>expect(await rt.call(alias,'projects/'+id(project)));
 const revision=async project=>Number(db.sql("SELECT revision FROM service.workbench_settings WHERE service_project_id='"+id(project)+"'"));
 const command=async(alias,kind,payload,project=primary,key=undefined)=>rt.call(alias,'projects/'+id(project)+'/commands',{kind,payload:{revision:await revision(project),...payload}},key);
 const listed=expect(await rt.call('client-a','projects')).items;assert(listed.some(x=>x.id===id(primary))&&listed.some(x=>x.id===id(311)));assert(!listed.some(x=>[id(312),id(313),id(315)].includes(x.id)));check('signed/opened authorized projects; multiple projects; unopened hidden');
 let snapshot=await read();assert.equal(snapshot.project.viewerPrincipalId,id(201));assert.equal(snapshot.tasks.length,1);assert.equal(snapshot.project.write,false);assert(snapshot.subjects.every(s=>s.id===id(1)));
 expect(await rt.call('client-a','projects/'+id(312)),403);expect(await rt.call('outsider','projects/'+id(primary)),403);expect(await rt.call('advisor-a','projects/'+id(312)),403);check('same-family subject isolation, cross-family and unassigned-adviser denial');
 expect(await command('client-a','STAGE',{stage:'SUBMISSION'}),403);expect(await command('advisor-a','STAGE',{stage:'SCHOOL_SELECTION'}));snapshot=await read();assert.equal(snapshot.project.stage,'SCHOOL_SELECTION');check('actual adviser update reflected in client PostgreSQL projection');
 const fixed='fixed-idempotency-message-key-'+primary,messagePayload={kind:'MESSAGE',payload:{revision:await revision(primary),subjectId:id(1),body:'Synthetic client communication',audience:'CLIENT'}};
 expect(await rt.call('client-a','projects/'+id(primary)+'/commands',messagePayload,fixed));const replay=expect(await rt.call('client-a','projects/'+id(primary)+'/commands',messagePayload,fixed));assert.equal(replay.replayed,true);
 expect(await rt.call('client-a','projects/'+id(primary)+'/commands',{...messagePayload,payload:{...messagePayload.payload,body:'changed'}},fixed),409);assert.equal(db.sql("SELECT count(*) FROM service.workbench_messages"),String(baselineMessages+1));check('idempotency persists; same key changed payload refused');
 expect(await command('advisor-a','MESSAGE',{subjectId:id(1),body:'Synthetic private staff note',audience:'STAFF'}));assert(!(await read()).messages.some(m=>m.body.includes('private staff')));check('internal messages excluded from client DTO');
 const upload={revision:await revision(primary),subjectId:id(1),kind:'TRANSCRIPT',contentBase64:Buffer.from('Synthetic transcript v1').toString('base64'),mime:'text/plain'};
 const first=expect(await rt.call('client-a','projects/'+id(primary)+'/materials',upload)).result;
 expect(await command('advisor-a','MATERIAL_REVIEW',{id:first.versionId,status:'CHANGES_REQUESTED',note:'Synthetic missing page'}));
 const second=expect(await rt.call('client-a','projects/'+id(primary)+'/materials',{...upload,revision:await revision(primary),documentId:first.documentId,contentBase64:Buffer.from('Synthetic transcript v2 complete').toString('base64')})).result;
 expect(await command('advisor-b','MATERIAL_REVIEW',{id:second.versionId,status:'APPROVED',note:'Synthetic review approved'}));
 snapshot=await read();assert.equal(snapshot.materials.length,2);assert.equal(snapshot.materials.find(x=>x.versionId===first.versionId).status,'CHANGES_REQUESTED');assert.equal(snapshot.materials.find(x=>x.versionId===second.versionId).version,2);
 const downloaded=expect(await rt.call('client-a','projects/'+id(primary)+'/materials/'+second.versionId+'/download'));assert.equal(downloaded.toString(),'Synthetic transcript v2 complete');check('real private upload -> return -> new immutable version -> review -> authorized download');
 expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9001+offset),subjectId:id(1),institutionId:id(5001),programId:id(5101),year:2027,round:'R1',deadlineAt:new Date(Date.now()+86400000).toISOString()}));
 expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9002+offset),subjectId:id(1),institutionId:id(5002),programId:id(5201),year:2027,round:'R1',deadlineAt:null}));
 expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9003+offset),subjectId:id(1),institutionId:id(5001),programId:id(5102),year:2027,round:'R1',deadlineAt:null}));
 expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9004+offset),subjectId:id(1),institutionId:id(5002),programId:id(5101),year:2027,round:'R2',deadlineAt:null}),422);
 for(const programme of [5301,5302])expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9500+programme+offset),subjectId:id(1),institutionId:id(5001),programId:id(programme),year:2027,round:'REFUSED',deadlineAt:null}),422);
 const catalogue=expect(await rt.call('advisor-a','catalogue'));assert.equal(catalogue.items.length,3);assert(catalogue.items.every(p=>![id(5301),id(5302)].includes(p.programId)));
 snapshot=await read();assert.equal(snapshot.applications.length,3);assert.equal(snapshot.applications[0].outcome,'PENDING');check('multiple schools/programmes use canonical catalogue IDs; mismatched institution/program refused');
 expect(await rt.call('client-a','projects/'+id(314)),403);const health=expect(await rt.call('client-b','projects/'+id(314)));assert.deepEqual(health.materials,[]);expect(await command('client-b','MESSAGE',{subjectId:id(2),body:'Must not enter clinical context',audience:'CLIENT'},314),403);check('Health metadata patient scope and closed clinical write path');
 // Keep the document contract independent of project authorization.
 db.sql("UPDATE consent.grants SET status='WITHDRAWN',withdrawn_at=clock_timestamp() WHERE family_id='"+id(100)+"' AND subject_person_id='"+id(1)+"' AND grantee_person_id='"+id(1)+"' AND purpose='DOCUMENT_READ' AND status='ACTIVE'");
 expect(await rt.call('client-a','projects/'+id(primary)+'/materials/'+second.versionId+'/download'),403);
 const revokedDocs=await read();assert.equal(revokedDocs.materials.length,0);assert.equal(revokedDocs.subjects[0].documentsAllowed,false);
 const versionsBefore=db.sql("SELECT count(*) FROM docs.document_versions WHERE document_id='"+first.documentId+"'");
 expect(await rt.call('client-a','projects/'+id(primary)+'/materials',{...upload,revision:await revision(primary),documentId:first.documentId}),403);
 assert.equal(db.sql("SELECT count(*) FROM docs.document_versions WHERE document_id='"+first.documentId+"'"),versionsBefore);
 db.sql("INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at) VALUES('"+id(9800+offset)+"','"+id(100)+"','"+id(1)+"','"+id(1)+"','"+id(1)+"','DOCUMENT_READ','EDUCATION','ACTIVE',now(),now()+interval '3 days')");
 assert.equal((await read()).materials.length,2);check('DOCUMENT_READ withdrawal hides metadata and refuses download/new version; new grant preserves withdrawal history');

 // State transitions remain explicit; no page-derived application outcomes.
 const allApplications=[9001,9002,9003].map(n=>id(n+offset));
 for(const application of allApplications){
  expect(await command('advisor-a','APPLICATION_UPDATE',{id:application,action:'READY'}));
  expect(await command('advisor-a','APPLICATION_UPDATE',{id:application,action:'SUBMIT',source:'Synthetic admissions receipt',reference:'SYN_RECEIPT_'+application,submittedAt:new Date(Date.now()-1000).toISOString()}));
 }
 const offer=expect(await rt.call('advisor-a','projects/'+id(primary)+'/materials',{revision:await revision(primary),subjectId:id(1),kind:'OFFER',contentBase64:Buffer.from('Synthetic offer evidence only').toString('base64'),mime:'text/plain'})).result;
 expect(await command('advisor-a','MATERIAL_REVIEW',{id:offer.versionId,status:'APPROVED',note:'self review must fail'}),409);
 expect(await command('advisor-b','MATERIAL_REVIEW',{id:offer.versionId,status:'APPROVED',note:'Synthetic independent offer review'}));
 expect(await command('client-a','APPLICATION_UPDATE',{id:allApplications[0],action:'OUTCOME',outcome:'OFFER',source:'forged client',reference:'forged',offerVersionId:offer.versionId}),403);
 for(const [i,outcome]of ['OFFER','REJECTED','WAITLISTED'].entries()){
  expect(await command('advisor-a','APPLICATION_UPDATE',{id:allApplications[i],action:'OUTCOME',outcome,source:'Synthetic decision source',reference:'SYN_'+outcome+'_'+allApplications[i],offerVersionId:i===0?offer.versionId:null}));
 }
 expect(await command('advisor-a','APPLICATION_CREATE',{id:id(9005+offset),subjectId:id(1),institutionId:id(5001),programId:id(5101),year:2027,round:'R2',deadlineAt:null}));
 expect(await command('advisor-a','APPLICATION_UPDATE',{id:id(9005+offset),action:'WITHDRAW'}));
 expect(await command('advisor-a','APPLICATION_UPDATE',{id:allApplications[0],action:'REQUIREMENTS',interviewRequired:true,requirements:'Synthetic supplementary certificate',depositDueAt:new Date(Date.now()+86400000).toISOString(),depositReference:'SYN_DEPOSIT_REQUIREMENT_NOT_PAYMENT'}));
 snapshot=await read();assert.deepEqual(snapshot.applications.map(x=>x.outcome).sort(),['OFFER','REJECTED','WAITLISTED','WITHDRAWN'].sort());
 assert(snapshot.applications.find(x=>x.id===allApplications[0]).interviewRequired);
 assert(snapshot.events.some(e=>e.outcome==='WAITLISTED'));check('Offer/rejection/waitlist/withdrawal distinct; adviser-only official receipts, interview, deposit requirements and pinned offer');
 // Two real app connections contend on one project revision.
 const sameRevision=await revision(primary),makeRace=stage=>({kind:'STAGE',payload:{revision:sameRevision,stage}});
 const race=await Promise.all([rt.call('advisor-a','projects/'+id(primary)+'/commands',makeRace('MATERIALS')),rt.call('advisor-b','projects/'+id(primary)+'/commands',makeRace('INTERVIEW'))]);
 assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);check('concurrent stale project update refused; no silent overwrite');
 // Least-privilege evidence uses the actual LOGIN, never a bootstrap SET ROLE substitute.
 const direct=await rt.app.connect();
 try{
  assert.equal((await direct.query('SELECT session_user AS name')).rows[0].name,'workbench_app');
  await direct.query('SET ROLE phoenix_canonical_service_workbench');
  await assert.rejects(direct.query('SELECT * FROM core.people'));
  await assert.rejects(direct.query('SELECT * FROM service.workbench_events'));
  await assert.rejects(direct.query("SELECT audit.record_access_event('READ','FAKE',NULL,'ALLOW','FAKE')"));
  await assert.rejects(direct.query('SET ROLE phoenix_canonical_context_binder'));
  await assert.rejects(direct.query("SELECT service.record_workbench_commercial_event($1,$2,'FORGED','PAYMENT_CONFIRMED','FORGED',$3,9,clock_timestamp())",[id(9901+offset),id(primary),'a'.repeat(64)]));
 }finally{await direct.query('DISCARD ALL');direct.release();}
 expect(await command('client-a','PAYMENT_CONFIRMED',{reference:'FORGED'}),422);
 expect(await rt.call('client-a','projects/'+id(primary),undefined,undefined,{headers:{'x-principal-id':id(212)}}),403);
 check('separate real LOGIN roles; no raw tables, forged audit, binder role or financial writes');
 // A temporary real LOGIN with narrowly granted SELECT proves the RLS predicates too.
 const probeName='workbench_rls_'+primary,probePassword=randomBytes(32).toString('hex'); // independent synthetic credential, never logged
 db.sql("CREATE ROLE "+probeName+" LOGIN NOINHERIT PASSWORD '"+probePassword+"';GRANT CONNECT ON DATABASE phoenix_canonical_dev TO "+probeName+";GRANT USAGE ON SCHEMA service,auth TO "+probeName+";"+
 "GRANT SELECT ON service.workbench_settings,service.workbench_messages,service.workbench_materials TO "+probeName+";"+
 "GRANT EXECUTE ON FUNCTION service.workbench_can_read(uuid),service.workbench_subject(uuid,uuid),service.workbench_staff(uuid,boolean),service.workbench_material_visible(uuid,uuid),auth.redeem_context_ticket(uuid,uuid),auth.clear_context() TO "+probeName+";");
 const probePool=new rt.Pool(rt.connection(probeName,probePassword)),probe=await probePool.connect();
 try{
  const bind=async n=>{await probe.query('SELECT auth.clear_context()');const ticket=await rt.binder.query("SELECT auth.issue_context_ticket($1,$2,$3,'FAMILY',clock_timestamp()+interval '30 seconds',$4,$1) AS ticket",[id(200+n),id(n),id(100),id(99000+n+offset)]);await probe.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.rows[0].ticket,id(200+n)]);};
  await bind(2);assert.equal((await probe.query('SELECT count(*)::int AS n FROM service.workbench_settings WHERE service_project_id=$1',[id(primary)])).rows[0].n,0);
  assert.equal((await probe.query('SELECT count(*)::int AS n FROM service.workbench_messages WHERE service_project_id=$1',[id(primary)])).rows[0].n,0);
  await bind(1);assert.equal((await probe.query('SELECT count(*)::int AS n FROM service.workbench_messages WHERE service_project_id=$1',[id(primary)])).rows[0].n,1);
  assert.equal((await probe.query('SELECT count(*)::int AS n FROM service.workbench_materials WHERE service_project_id=$1',[id(primary)])).rows[0].n,3);
  await probe.query('SELECT auth.clear_context()');
 }finally{probe.release();await probePool.end();db.sql("REVOKE ALL ON service.workbench_settings,service.workbench_messages,service.workbench_materials FROM "+probeName+";ALTER ROLE "+probeName+" NOLOGIN;");}
 check('actual read-probe LOGIN RLS: same-family B zero rows, A only client messages and authorized document versions');

 const commercial=(await read()).commercial;assert.equal(commercial.events.length,3);
 // Audit persistence failure must roll back the entire business command.
 const auditEvents=db.sql("SELECT count(*) FROM service.workbench_events WHERE service_project_id='"+id(primary)+"'");
 const stageBefore=(await read()).project.stage;
 db.sql("CREATE FUNCTION audit.workbench_synthetic_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END $$;CREATE TRIGGER workbench_synthetic_failure BEFORE INSERT ON audit.access_events FOR EACH ROW EXECUTE FUNCTION audit.workbench_synthetic_failure();");
 try{expect(await command('advisor-a','STAGE',{stage:'DECISION'}),503);}finally{db.sql('DROP TRIGGER workbench_synthetic_failure ON audit.access_events;DROP FUNCTION audit.workbench_synthetic_failure();');}
 assert.equal(db.sql("SELECT count(*) FROM service.workbench_events WHERE service_project_id='"+id(primary)+"'"),auditEvents);
 assert.equal((await read()).project.stage,stageBefore);check('audit failure refuses response and atomically rolls back business command');
 // Revocation is checked again for each request and no context survives pool release.
 const clientToken=rt.tokens['client-a'],clientSession=rt.sessions.get(clientToken);rt.sessions.delete(clientToken);
 expect(await rt.call('client-a','projects/'+id(primary)),401);rt.sessions.set(clientToken,clientSession);
 assert.equal(db.sql('SELECT count(*) FROM auth.session_contexts'),'0');assert.equal(db.sql('SELECT count(*) FROM auth.context_exchange_tickets'),'0');
 check('revoked session refused and separate pools leave zero context/tickets');
 expect(await command('manager','PROJECT_STATUS',{status:'ON_HOLD',reason:'SYNTHETIC_EXCEPTION_PAUSE'}));
 assert.equal((await read()).project.status,'ON_HOLD');expect(await command('client-a','MESSAGE',{subjectId:id(1),body:'paused write',audience:'CLIENT'}),403);
 expect(await command('advisor-a','PROJECT_STATUS',{status:'ACTIVE',reason:'NOT_MANAGER'}),403);
 expect(await command('manager','PROJECT_STATUS',{status:'ACTIVE',reason:'SYNTHETIC_EXCEPTION_RESOLVED'}));
 assert.equal((await read()).project.status,'ACTIVE');check('manager-only pause/resume; paused projects refuse operational writes');
 const originalStageEvent=(await read()).events.find(e=>e.kind==='STAGE');assert(originalStageEvent);
 expect(await command('advisor-a','STAGE',{stage:'MATERIALS',compensatesEventId:originalStageEvent.id,compensationReason:'UNAUTHORIZED_CORRECTION'}),403);
 expect(await command('manager','STAGE',{stage:'MATERIALS',compensatesEventId:originalStageEvent.id,compensationReason:'SYNTHETIC_MANUAL_CORRECTION'}));
 assert((await read()).events.some(e=>e.compensatesEventId===originalStageEvent.id));check('manager correction appends a linked compensating event without deleting history');

 // Deliverable governance preserves submit/review/accept separation.
 const deliveryId=id(9200+offset);
 expect(await command('advisor-a','DELIVERABLE_CREATE',{id:deliveryId,versionId:second.versionId,kind:'APPLICATION_PLAN',dueAt:null}));
 expect(await command('advisor-a','DELIVERABLE_SUBMIT',{id:deliveryId}));
 expect(await command('advisor-a','DELIVERABLE_REVIEW',{id:deliveryId,decision:'APPROVE',reason:'SELF_REVIEW'}),403);
 expect(await command('advisor-b','DELIVERABLE_REVIEW',{id:deliveryId,decision:'APPROVE',reason:'SYNTHETIC_REVIEW'}));
 expect(await command('advisor-b','DELIVERABLE_ACCEPT',{id:deliveryId}),403);
 expect(await command('client-a','DELIVERABLE_ACCEPT',{id:deliveryId}),403);
 expect(await command('manager','DELIVERABLE_ACCEPT',{id:deliveryId}));assert.equal((await read()).deliverables[0].status,'ACCEPTED');
 check('versioned deliverable uses existing master; independent submit/review/accept');
 expect(await command('manager','PROJECT_STATUS',{status:'COMPLETED',reason:'EARLY_CLOSE'}),409);
 // Complete/cancel remaining work through controlled commands, not DELETE.
 snapshot=await read('manager');
 for(const task of snapshot.tasks){if(task.status==='PENDING')expect(await command('advisor-a','TASK_STATUS',{id:task.id,status:'IN_PROGRESS',reason:'SYNTHETIC_STARTED'}));if(['PENDING','IN_PROGRESS','BLOCKED'].includes(task.status)){if(task.status==='BLOCKED')expect(await command('advisor-a','TASK_STATUS',{id:task.id,status:'IN_PROGRESS',reason:'SYNTHETIC_UNBLOCKED'}));expect(await command(task.assignee===id(201)?'client-a':'advisor-a','TASK_STATUS',{id:task.id,status:'COMPLETED',reason:'SYNTHETIC_COMPLETED'}));}}
 for(const milestone of snapshot.milestones)if(milestone.status==='PENDING')expect(await command('advisor-a','MILESTONE_STATUS',{id:milestone.id,status:'ACHIEVED'}));
 expect(await command('advisor-a','APPLICATION_UPDATE',{id:allApplications[2],action:'OUTCOME',outcome:'WITHDRAWN',source:'Synthetic withdrawal confirmation',reference:'SYN_FINAL_WITHDRAW_'+primary,offerVersionId:null}));
 const peopleBefore=db.sql('SELECT count(*) FROM core.people'),familiesBefore=db.sql('SELECT count(*) FROM core.families'),studentsBefore=db.sql('SELECT count(*) FROM core.student_profiles');
 expect(await command('manager','PROJECT_STATUS',{status:'COMPLETED',reason:'SYNTHETIC_ACCEPTANCE_CLOSED'}));
 snapshot=await read();assert.equal(snapshot.project.status,'COMPLETED');assert.equal(snapshot.project.stage,'CLOSED');
 expect(await command('client-a','MESSAGE',{subjectId:id(1),body:'closed write',audience:'CLIENT'}),409);
 assert.equal(db.sql('SELECT count(*) FROM core.people'),peopleBefore);assert.equal(db.sql('SELECT count(*) FROM core.families'),familiesBefore);assert.equal(db.sql('SELECT count(*) FROM core.student_profiles'),studentsBefore);
 check('closure prerequisites, immutable events and archived authorized view; no master-data duplication');

 return checks;
}
