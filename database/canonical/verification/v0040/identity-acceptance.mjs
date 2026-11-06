import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {createCluster,id} from '../v0038/cluster.mjs'
import {seedWorkbench} from '../v0038/fixtures.mjs'
import {startWorkbench} from '../v0038/runtime.mjs'

// Focused candidate-0040 acceptance. This deliberately does not repeat the
// broader P1 D1/bridge/browser suite; it proves that the candidate can be
// applied to an owned PostgreSQL cluster and that its stage guard is exercised
// through the real workbench command path.
const version=process.argv[2]||'16'
assert(['16','17'].includes(version),'PostgreSQL matrix version must be 16 or 17')
const root=process.cwd()
const output=path.resolve(process.env.P1_IDENTITY_EVIDENCE_DIR||('out/p1-identity-0040/pg'+version))
mkdirSync(output,{recursive:true})
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const gitSha=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const project=n=>id(n)
const record={
 schemaVersion:'phoenix-p1-identity-0040.v1',
 started:new Date().toISOString(),
 sourceSha:gitSha(),
 sourceState:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()?'WORKING_TREE':'COMMITTED',
 postgres:{version,cluster:'owned disposable synthetic PostgreSQL'},
 synthetic:{status:'NOT_RUN',checks:[],requests:[]},
 status:'BLOCKED'
}
let db,rt
const check=(name,details={})=>{record.synthetic.checks.push({name,status:'PASS',at:new Date().toISOString(),...details});console.log('PASS '+name)}
const expectSqlFailure=(sqlText,marker)=>{
 let failed=false,error
 try{db.sql(sqlText)}catch(caught){failed=true;error=caught}
 assert(failed,'Expected PostgreSQL trigger rejection: '+marker)
 assert.match(String(error?.message||error),new RegExp(marker))
}

function seedIdentityProject(){
 const p=project(316),family=id(100),client=id(500),subject=id(1)
 db.sql(
  "INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id) VALUES('"+p+"','"+client+"','"+family+"','SYN_PROJECT_316','Synthetic Hong Kong Identity 316','ACTIVE','IDENTITY','"+id(900)+"','"+id(900)+"');"+
  "INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until,revision) VALUES('"+p+"','HK_IDENTITY','Synthetic identity eligibility and document coordination','IDENTITY_ELIGIBILITY',now()+interval '7 days',1);"+
  "INSERT INTO service.project_subjects(project_subject_id,service_project_id,family_id,subject_person_id,subject_role,data_scope,created_by_principal_id) VALUES('"+id(916)+"','"+p+"','"+family+"','"+subject+"','SERVICE_RECIPIENT','IDENTITY','"+id(900)+"');"+
  "INSERT INTO service.project_parties(project_party_id,service_project_id,party_role,person_id,valid_from,created_by_principal_id) VALUES('"+id(1916)+"','"+p+"','CONTRACTING_PARTY','"+subject+"',now()-interval '1 hour','"+id(900)+"');"+
  "INSERT INTO service.project_assignments(project_assignment_id,service_project_id,principal_id,assignment_role,status,valid_from,assigned_by_principal_id) VALUES('"+id(4312)+"','"+p+"','"+id(212)+"','PROJECT_MANAGER','ACTIVE',now()-interval '1 hour','"+id(900)+"');"
 )
 for(const [index,kind] of ['CONTRACT_SIGNED','PAYMENT_CONFIRMED','OPENING_APPROVED'].entries())
  db.sql("INSERT INTO service.workbench_commercial_events VALUES('"+id(13160+index)+"','"+p+"','phoenix_operations','SYN_316_"+index+"','"+kind+"','SYN_REFERENCE_316_"+index+"','"+'b'.repeat(64)+"',"+(index+1)+",now()-interval '1 hour',clock_timestamp(),'"+id(901)+"')")
}

function seedTriggerProbes(){
 const family=id(100),client=id(500)
 for(const [n,domain,name] of [[317,'IDENTITY','Synthetic identity trigger probe'],[318,'EDUCATION','Synthetic education domain trigger probe'],[319,'EDUCATION','Synthetic non-identity template trigger probe']])
  db.sql("INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id) VALUES('"+project(n)+"','"+client+"','"+family+"','SYN_PROJECT_"+n+"','"+name+"','ACTIVE','"+domain+"','"+id(900)+"','"+id(900)+"')")
 expectSqlFailure("INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until,revision) VALUES('"+project(317)+"','HK_IDENTITY','Synthetic trigger probe','MATERIALS',now()+interval '7 days',1)",'IDENTITY_TEMPLATE_STAGE_MISMATCH')
 expectSqlFailure("INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until,revision) VALUES('"+project(318)+"','HK_IDENTITY','Synthetic trigger probe','IDENTITY_ELIGIBILITY',now()+interval '7 days',1)",'IDENTITY_TEMPLATE_DOMAIN_MISMATCH')
 expectSqlFailure("INSERT INTO service.workbench_settings(service_project_id,template_kind,service_scope,current_stage,document_retention_until,revision) VALUES('"+project(319)+"','HK_MASTERS','Synthetic trigger probe','IDENTITY_DOCUMENTS',now()+interval '7 days',1)",'IDENTITY_STAGE_TEMPLATE_MISMATCH')
 check('0040 trigger rejects an identity template with an education stage',{marker:'IDENTITY_TEMPLATE_STAGE_MISMATCH'})
 check('0040 trigger rejects HK_IDENTITY on a non-identity project',{marker:'IDENTITY_TEMPLATE_DOMAIN_MISMATCH'})
 check('0040 trigger rejects identity stages on non-identity templates',{marker:'IDENTITY_STAGE_TEMPLATE_MISMATCH'})
}

async function run(){
 const workbenchSql=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql')
 const workbenchManifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest.json'),'utf8'))
 const summarySql=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql')
 const summaryManifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0039-summary.json'),'utf8'))
 const identitySql=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0040_hk_identity_workbench.sql')
 const identityManifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0040-identity.json'),'utf8'))
 assert.equal(sha(workbenchSql),workbenchManifest.sha256.toLowerCase(),'0038 candidate changed without its manifest')
 assert.equal(sha(summarySql),summaryManifest.sha256.toLowerCase(),'0039 candidate changed without its manifest')
 assert.equal(sha(identitySql),identityManifest.sha256.toLowerCase(),'0040 candidate changed without its manifest')
 record.dependencies={serviceWorkbench0038Sha:workbenchManifest.sha256,serviceSummary0039Sha:summaryManifest.sha256,identity0040Sha:identityManifest.sha256}
 db=await createCluster(version)
 record.postgres.candidateSha=db.candidateSha
 db.sql(readFileSync(summarySql,'utf8'))
 db.sql(readFileSync(identitySql,'utf8'))
 assert.equal(db.sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='service' AND p.proname='validate_identity_workbench_template'"),'1')
 assert.equal(db.sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='service' AND p.proname='workbench_staging_staff_mixed_health'"),'1')
 assert.equal(db.sql("SELECT has_function_privilege('phoenix_canonical_service_workbench','service.workbench_staging_staff_mixed_health(uuid)','EXECUTE')"),'t')
 check('0040 installs the narrow private-Staging mixed-health guard for the workbench role')
 const credentials=seedWorkbench(db)
 seedIdentityProject()
 seedTriggerProbes()
 rt=await startWorkbench(db,credentials)

 const before=await rt.call('manager','projects/'+project(316))
 assert.equal(before.status,200,JSON.stringify(before.body))
 assert.equal(before.body.project.template,'HK_IDENTITY')
 assert.equal(before.body.project.stage,'IDENTITY_ELIGIBILITY')
 check('real workbench API reads the authorized synthetic HK identity project',{actor:'manager',project:project(316),stage:'IDENTITY_ELIGIBILITY'})

 const stageUpdate=await rt.call('manager','projects/'+project(316)+'/commands',{kind:'STAGE',payload:{revision:before.body.project.revision,stage:'IDENTITY_DOCUMENTS'}},'identity-0040-stage-valid')
 assert.equal(stageUpdate.status,200,JSON.stringify(stageUpdate.body))
 assert.equal(stageUpdate.body.status,'ALLOW')
 assert.equal(stageUpdate.body.result.toStatus,'IDENTITY_DOCUMENTS')
 check('valid Identity stage command is accepted through the real BFF and PostgreSQL function',{to:'IDENTITY_DOCUMENTS'})

 const after=await rt.call('manager','projects/'+project(316))
 assert.equal(after.status,200,JSON.stringify(after.body))
 assert.equal(after.body.project.stage,'IDENTITY_DOCUMENTS')
 assert.equal(after.body.project.revision,stageUpdate.body.result.revision)
 check('stage command re-reads current server state',{revision:after.body.project.revision})

 const wrongStage=await rt.call('manager','projects/'+project(316)+'/commands',{kind:'STAGE',payload:{revision:after.body.project.revision,stage:'MATERIALS'}},'identity-0040-stage-wrong')
 assert.equal(wrongStage.status,422,JSON.stringify(wrongStage.body))
 assert.equal(wrongStage.body.error?.code,'INVALID_COMMAND')
 const unchanged=await rt.call('manager','projects/'+project(316))
 assert.equal(unchanged.status,200,JSON.stringify(unchanged.body))
 assert.equal(unchanged.body.project.stage,'IDENTITY_DOCUMENTS')
 check('incorrect Identity stage command fails closed and preserves stage',{rejectedStatus:wrongStage.status,stage:unchanged.body.project.stage})

 const familyRead=await rt.call('client-a','projects/'+project(316))
 assert.equal(familyRead.status,200,JSON.stringify(familyRead.body))
 assert.equal(familyRead.body.project.domain,'IDENTITY')
 check('authorized family identity can read only the synthetic project',{actor:'client-a',project:project(316)})
 const sameFamilyDenied=await rt.call('client-a','projects/'+project(312))
 assert.equal(sameFamilyDenied.status,403,JSON.stringify(sameFamilyDenied.body))
 const crossFamilyDenied=await rt.call('client-a','projects/'+project(315))
 assert.equal(crossFamilyDenied.status,403,JSON.stringify(crossFamilyDenied.body))
 check('unrelated same-family and cross-family project links are denied',{sameFamily:project(312),crossFamily:project(315)})

 db.sql("INSERT INTO service.project_domains(project_domain_id,service_project_id,business_domain,created_by_principal_id) VALUES('"+id(5316)+"','"+project(316)+"','HEALTH','"+id(900)+"')")
 const {rows:[{ticket}]}=await rt.binder.query(
  "SELECT auth.issue_context_ticket($1,$2,$3,'ADVISOR',clock_timestamp()+interval '30 seconds',$4,$1) AS ticket",
  [id(212),id(12),id(100),id(9940)]
 )
 const staff=await rt.app.connect()
 try {
  await staff.query('SET ROLE phoenix_canonical_service_workbench')
  await staff.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket,id(212)])
  for (const [idValue,expected] of [[project(316),true],[project(310),false],[project(315),false],[null,true]]) {
   const {rows:[{mixed}]}=await staff.query('SELECT service.workbench_staging_staff_mixed_health($1::uuid) AS mixed',[idValue])
   assert.equal(mixed,expected)
  }
  await assert.rejects(staff.query('SELECT * FROM service.project_domains LIMIT 1'),{code:'42501'})
 } finally { staff.release(true) }
 check('separated staff role can evaluate mixed Health safety without direct table reads')

 record.synthetic.requests=rt.receipts
 record.synthetic.status='PASS'
 record.status='PASS_SYNTHETIC_0040_REAL_PG'
 console.log('PASS focused 0040 Identity PostgreSQL acceptance on PG'+version)
}

try{await run()}
catch(error){
 record.synthetic.status='FAIL'
 record.status='FAIL'
 record.error={name:error?.name,message:error?.message,stack:error?.stack}
 console.error(error)
 process.exitCode=1
}
finally{
 try{await rt?.close()}catch{}
 try{db?.cleanup()}catch{}
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'identity-0040-acceptance-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
}
