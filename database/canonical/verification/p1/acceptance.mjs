import assert from 'node:assert/strict'
import {createHash,randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createCluster,id} from '../v0038/cluster.mjs'
import {seedWorkbench} from '../v0038/fixtures.mjs'
import {startWorkbench} from '../v0038/runtime.mjs'
import {seedIdentityProject} from './fixture.mjs'
import {verifyBridgeSecurity,verifyGatewaySecurity} from './security-regression.mjs'
import {createSyntheticAuthFixture} from './canonical-auth-fixture.mjs'

const version=process.argv[2]||'16'
assert(['16','17'].includes(version),'PostgreSQL matrix version must be 16 or 17')
const root=process.cwd()
const output=path.resolve(process.env.P1_EVIDENCE_DIR||('out/p1-family-service/pg'+version))
mkdirSync(output,{recursive:true})
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const gitSha=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const forbiddenProjection=/diagnosis|patient|insurance|claim|medical[_ -]?record|raw[_ -]?questionnaire|document_versions/i
const project=n=>id(n)
const record={
 schemaVersion:'phoenix-p1-family-service.v1',
 started:new Date().toISOString(),
 sourceSha:gitSha(),
 sourceState:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()?'WORKING_TREE':'COMMITTED',
 postgres:{version},
 synthetic:{status:'NOT_RUN',identities:[],checks:[],requests:[],authRequests:[]},
 browser:{status:'BLOCKED',reason:'P1 browser screenshots require a dedicated Vite fixture that injects the server-owned provider; no browser evidence is claimed by this API harness.'},
 realIdentity:{
  status:'BLOCKED',
  missing:[
   'Founder-approved trusted customer identity provider for staging',
   'approved customer-to-Canonical principal/family/subject mapping contract and configuration',
   'private Sites staging credentials and access-control evidence',
   'two approved real staging accounts with distinct service entitlements',
   'security review of the real provider and mapping'
  ]
 },
 status:'BLOCKED'
}
let db,rt,authFixture,bridgeServer
const check=(name,details={})=>{record.synthetic.checks.push({name,status:'PASS',at:new Date().toISOString(),...details});console.log('PASS '+name)}
const expectStatus=(value,expected)=>{assert.equal(value.status,expected,JSON.stringify(value.data));return value.data}
const summaryData=value=>value?.projects?value:(value?.data??value)
const validateSummary=value=>{
 const data=summaryData(value)
 assert.equal(data?.schemaVersion,'service-project-summary.v1')
 assert.ok(Array.isArray(data.projects))
 assert.ok(data.projects.length<=50)
 assert.ok(typeof data.as_of==='string'&&Number.isFinite(Date.parse(data.as_of)))
 assert.ok(typeof data.expires_at==='string'&&Number.isFinite(Date.parse(data.expires_at)))
 assert.ok(data.next_cursor===null||typeof data.next_cursor==='string')
 for(const item of data.projects){
  assert.deepEqual(Object.keys(item).sort(),['adviser','compass','current_stage','customer_todo_count','detail_href','latest_progress','name','next_milestone','overdue_count','service_project_id','status'].sort())
  assert.match(item.service_project_id,/^[0-9a-f-]{36}$/)
  assert.ok(typeof item.name==='string'&&item.name.length>0)
  assert.ok(['EDUCATION','IDENTITY','HEALTH','WEALTH'].includes(item.compass))
  assert.ok(Number.isSafeInteger(item.customer_todo_count)&&item.customer_todo_count>=0)
  assert.ok(Number.isSafeInteger(item.overdue_count)&&item.overdue_count>=0&&item.overdue_count<=item.customer_todo_count)
  assert.equal(item.detail_href,'/en/my-services/'+item.service_project_id)
 }
 assert.doesNotMatch(JSON.stringify(data),forbiddenProjection)
 return data
}
const snapshotData=value=>value?.project?value:(value?.data??value)

async function run(){
 const candidate=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql')
 const manifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest.json'),'utf8'))
 assert.equal(sha(candidate),manifest.sha256,'0038 candidate changed without its manifest')
 const summarySql=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql')
 const summaryManifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0039-summary.json'),'utf8'))
 assert.equal(sha(summarySql).toUpperCase(),summaryManifest.sha256,'0039 candidate changed without its manifest')
 record.dependencies={serviceWorkbench0038Sha:manifest.sha256,serviceSummary0039Sha:sha(summarySql)}
 db=await createCluster(version)
 record.postgres.candidateSha=db.candidateSha
 db.sql(readFileSync(summarySql,'utf8'))
 assert.equal(db.sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='service' AND p.proname='workbench_summary'"),'1')
 const credentials=seedWorkbench(db)
 db.sql("UPDATE service.tasks SET due_at=clock_timestamp()-interval '1 day' WHERE task_id='"+id(8001)+"'")
 seedIdentityProject(db)
 rt=await startWorkbench(db,credentials)
 const env={
  SERVICE_WORKBENCH_ENABLED:'true',
  CUSTOMER_CANONICAL_BRIDGE_ENABLED:'true',
  SERVICE_WORKBENCH_API_ORIGIN:rt.origin
 }
 const bridge=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts')).href)
 const auth=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-auth.ts')).href)
 const accounts={}
 const mappings=new Map()
 let config
 const provider={
  async resolve(identity){
   const mapping=mappings.get(identity.customerId)
   if(!mapping||!mapping.active||mapping.sessionHash!==identity.sessionHash)return null
   const {token}=mapping
   return{
    token,
    async assertCurrent(){
     const current=mappings.get(identity.customerId)
     const session=rt.sessions.get(token)
     if(current!==mapping||!current.active||current.sessionHash!==identity.sessionHash||!session||session.expires<=Date.now())throw Error('synthetic mapping revoked')
    }
   }
  }
 }
 bridgeServer=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url??'/', 'http://'+(req.headers.host??'127.0.0.1'))
   const chunks=[]
   for await(const chunk of req)chunks.push(Buffer.from(chunk))
   const requestHeaders=new Headers()
   for(const [key,value] of Object.entries(req.headers))if(value!==undefined)requestHeaders.set(key,Array.isArray(value)?value.join(','):value)
   const request=new Request(url,{method:req.method??'GET',headers:requestHeaders,body:chunks.length?Buffer.concat(chunks):undefined})
   let response
   if(url.pathname.startsWith('/api/customer-auth/'))response=await auth.handleCustomerAuth(request,config)
   else if(url.pathname==='/api/family-services/summary')response=await bridge.handleCustomerServices(request,env,'development','summary',config,provider)
   else if(url.pathname.startsWith('/api/service-workbench/')){
    const resource=url.pathname.slice('/api/service-workbench/'.length)
    response=await bridge.handleCustomerServices(request,env,'development',resource,config,provider)
   }else response=Response.json({error:{code:'NOT_FOUND'}},{status:404})
   const outputHeaders={}
   response.headers.forEach((value,key)=>{outputHeaders[key]=value})
   res.writeHead(response.status,outputHeaders)
   res.end(Buffer.from(await response.arrayBuffer()))
  }catch(error){
   res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'})
   res.end(JSON.stringify({error:{code:'IDENTITY_BRIDGE_UNAVAILABLE'}}))
  }
 })
 await new Promise(resolve=>bridgeServer.listen(0,'127.0.0.1',resolve))
 const bridgeOrigin='http://127.0.0.1:'+bridgeServer.address().port
 authFixture=createSyntheticAuthFixture({origin:bridgeOrigin})
 config=authFixture.config
 record.synthetic.transport={customerAuth:'server-owned synthetic trusted Canonical identity verifier',customerBff:'HTTP -> server bridge -> HTTP BFF -> PostgreSQL API',canonicalMapping:'synthetic server-owned provider',browserUI:'NOT_CLAIMED'}
 for(const action of ['register','login']){
  const response=await fetch(bridgeOrigin+'/api/customer-auth/'+action,{method:'POST',headers:{origin:bridgeOrigin,'content-type':'application/json'},body:JSON.stringify({synthetic:true}),signal:AbortSignal.timeout(10000)})
  record.synthetic.authRequests.push({action,status:response.status})
  assert.equal(response.status,503)
  assert.equal(response.headers.has('set-cookie'),false)
  assert.equal((await response.json()).error,'CANONICAL_AUTH_NOT_CONFIGURED')
 }
 check('retired local registration and password login stay unavailable without creating sessions')
 const register=async(alias,routeAlias)=>{
  const account=authFixture.register(alias,routeAlias)
  const {cookie}=account
  const sessionRequest=new Request(bridgeOrigin+'/api/customer-auth/session',{headers:{cookie}})
  const session=await auth.readCustomerSession(sessionRequest,config)
  assert.equal(session?.id,account.id)
  accounts[alias]=account
  mappings.set(account.id,{token:rt.issueCustomerSession(routeAlias),sessionHash:session.token_hash,active:true})
  record.synthetic.identities.push({alias,customerId:account.id,canonicalAlias:routeAlias,synthetic:true})
 }
 await register('client-a','client-a')
 await register('client-b','client-b')
 await register('outsider','outsider')
 await register('client-identity','outsider')
 await register('client-c','client-b')
 const call=async(alias,resource,{method='GET',body,query='',headers={}}={})=>{
  const account=accounts[alias]
  assert.ok(account,'Unknown synthetic account '+alias)
  const requestHeaders=new Headers(headers)
  requestHeaders.set('cookie',account.cookie)
  if(method==='POST'){
    requestHeaders.set('origin',bridgeOrigin)
   requestHeaders.set('content-type','application/json')
   if(!requestHeaders.has('idempotency-key'))requestHeaders.set('idempotency-key','p1-'+alias+'-'+Date.now()+'-'+Math.random().toString(16).slice(2))
  }
  const url=bridgeOrigin+'/api/service-workbench/'+resource+(query||'')
  const response=await fetch(url,{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body)})
  let data
  try{data=await response.clone().json()}catch{data=await response.text()}
  record.synthetic.requests.push({alias,resource,method,status:response.status,body:data})
  return{status:response.status,data}
 }
 const summary=async(alias,query='')=>fetch(bridgeOrigin+'/api/family-services/summary'+query,{headers:{cookie:accounts[alias].cookie}}).then(async response=>{
  let data;try{data=await response.clone().json()}catch{data=await response.text()}
  record.synthetic.requests.push({alias,resource:'summary',method:'GET',status:response.status,body:data})
  return{status:response.status,data}
 })

 let response=await summary('client-a')
 let data=expectStatus(response,200)
 data=validateSummary(data)
 assert.ok(data.projects.some(x=>x.service_project_id===project(310)))
 assert.equal(data.projects.find(x=>x.service_project_id===project(310)).overdue_count,1)
 assert.ok(!data.projects.some(x=>x.service_project_id===project(312)||x.service_project_id===project(315)))
 assert.equal(data.projects.some(x=>x.service_project_id===project(313)),false,'Unopened projects must not appear purchased')
 check('trusted synthetic client A summary is limited to authorized project subject')
 response=await summary('client-b');data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.some(x=>x.service_project_id===project(312)))
 assert.ok(!data.projects.some(x=>x.service_project_id===project(310)))
 check('trusted synthetic client B same-family subject isolation')
 response=await summary('client-identity')
 data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.length===1&&data.projects[0].compass==='IDENTITY')
 check('trusted synthetic Identity customer sees only the authorized Identity project')
 response=await summary('client-c')
 data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.length>=2,'Synthetic client C must have multiple authorized projects')
 check('trusted synthetic client C receives multiple authorized projects through the same server mapping contract')
 const authorizedIds=validateSummary(expectStatus(await summary('client-a'),200)).projects.map(p=>p.service_project_id).sort()
 response=await summary('client-a','?limit=1');data=validateSummary(expectStatus(response,200));assert.equal(data.projects.length,1)
 const pagedIds=data.projects.map(p=>p.service_project_id)
 let cursor=data.next_cursor
 for(let page=0;cursor&&page<10;page++){
  data=validateSummary(expectStatus(await summary('client-a','?limit=1&cursor='+encodeURIComponent(cursor)),200))
  pagedIds.push(...data.projects.map(p=>p.service_project_id));cursor=data.next_cursor
 }
 assert.equal(cursor,null)
 assert.equal(new Set(pagedIds).size,pagedIds.length)
 assert.deepEqual(pagedIds.sort(),authorizedIds)
 check('summary limit is bounded and cursor-safe')

 response=await call('client-a','projects/'+project(310));let detail=snapshotData(expectStatus(response,200))
 const initialTodoCount=validateSummary(expectStatus(await summary('client-a'),200)).projects.find(x=>x.service_project_id===project(310)).customer_todo_count
 assert.equal(detail.project.id,project(310));assert.equal(detail.project.clinicalEnabled,false)
 assert.ok(detail.tasks.some(x=>x.id===id(8001)&&x.status==='PENDING'))
 assert.doesNotMatch(JSON.stringify(detail),forbiddenProjection)
 check('authorized detail includes client task but excludes Health and raw sensitive data')
 expectStatus(await call('client-b','projects/'+project(310)),403)
 expectStatus(await call('client-a','projects/'+project(312)),403)
 expectStatus(await call('client-a','projects/'+project(315)),403)
 expectStatus(await call('outsider','projects/'+project(310)),403)
 check('cross-family and unassigned-project links are denied')

 const taskRevision=detail.project.revision
 response=await call('client-a','projects/'+project(310)+'/commands',{method:'POST',body:{kind:'TASK_STATUS',payload:{revision:taskRevision,id:id(8001),status:'IN_PROGRESS',reason:'P1_SYNTHETIC_REFRESH'}}})
 expectStatus(response,200)
 response=await call('client-a','projects/'+project(310));detail=snapshotData(expectStatus(response,200))
 assert.equal(detail.tasks.find(x=>x.id===id(8001)).status,'IN_PROGRESS')
 response=await call('client-a','projects/'+project(310)+'/commands',{method:'POST',body:{kind:'TASK_STATUS',payload:{revision:detail.project.revision,id:id(8001),status:'COMPLETED',reason:'P1_SYNTHETIC_COMPLETED'}}})
 expectStatus(response,200)
 response=await call('client-a','projects/'+project(310));detail=snapshotData(expectStatus(response,200))
 assert.equal(detail.tasks.find(x=>x.id===id(8001)).status,'COMPLETED')
 const refreshedSummary=validateSummary(expectStatus(await summary('client-a'),200))
 assert.ok(refreshedSummary.projects.find(x=>x.service_project_id===project(310)).customer_todo_count<initialTodoCount)
 assert.equal(refreshedSummary.projects.find(x=>x.service_project_id===project(310)).overdue_count,0)
 check('client task completion path re-reads the current server state and refreshes summary counts')

 const advisorRead=await rt.call('advisor-a','projects/'+project(310))
 assert.equal(advisorRead.status,200,JSON.stringify(advisorRead.body))
 const advisorDetail=snapshotData(advisorRead.body)
 const stageUpdate=await rt.call('advisor-a','projects/'+project(310)+'/commands',{kind:'STAGE',payload:{revision:advisorDetail.project.revision,stage:'SCHOOL_SELECTION'}},'p1-adviser-stage-update')
 assert.equal(stageUpdate.status,200,JSON.stringify(stageUpdate.body))
 response=await call('client-a','projects/'+project(310));detail=snapshotData(expectStatus(response,200))
 assert.equal(detail.project.stage,'SCHOOL_SELECTION')
 check('synthetic P0 adviser fixture updates stage; Canonical customer bridge sees it after refresh')
 // A non-Health primary domain cannot conceal a secondary clinical domain.
 db.sql("INSERT INTO service.project_domains(project_domain_id,service_project_id,business_domain,created_by_principal_id) VALUES('"+id(5318)+"','"+project(318)+"','HEALTH','"+id(900)+"')")
 const mixed=validateSummary(expectStatus(await summary('client-c'),200))
 assert.equal(mixed.projects.some(p=>p.service_project_id===project(318)),false)
 expectStatus(await call('client-c','projects/'+project(318)),403)
 expectStatus(await call('client-c','projects/'+project(318)+'/materials/'+id(99999)+'/download'),403)
 expectStatus(await call('client-c','projects/'+project(318)+'/commands',{method:'POST',body:{kind:'MESSAGE',payload:{revision:1,subjectId:id(2),body:'SYNTHETIC_DENIED_CLINICAL_WRITE',audience:'CLIENT'}}}),403)
 assert.equal(db.sql("SELECT count(*) FROM service.workbench_messages WHERE service_project_id='"+project(318)+"'"),'0')
 check('secondary Health domain refuses customer summary, direct detail and commands')
 await verifyGatewaySecurity(db,rt,mappings.get(accounts['client-c'].id).token,check)
 await verifyBridgeSecurity({db,rt,bridge,env,config,provider,authFixture,account:accounts['client-a'],
  mapping:mappings.get(accounts['client-a'].id),check})

 const health=await call('client-b','projects/'+project(314))
 if(health.status===200){
  const healthData=snapshotData(health.data)
  assert.equal(healthData.project.clinicalEnabled,false)
  assert.equal(healthData.materials.length,0);assert.equal(healthData.messages.length,0);assert.equal(healthData.applications.length,0)
  check('Health patient boundary keeps raw clinical, questionnaire and claim data out of Family OS')
 }else assert.ok([403,404].includes(health.status))

 // Verify the release-specific BFF restriction against the real disposable database.
 // The student and guardian are distinct FAMILY principals pending the separate STUDENT context.
 const verifyFamilyTasks=async()=>{
  const service=project(310), student=8011, parent=8012, guardian=7701
  db.sql(`INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
   VALUES('${id(7700)}','${id(1)}','MINOR_VERIFIED','synthetic://student-capacity','${id(900)}');
   INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,valid_from,valid_until)
   VALUES('${id(guardian)}','${id(100)}','${id(2)}','${id(1)}','VERIFIED','EDUCATION',now()-interval '1 hour',now()+interval '1 hour');`)
  for(const [task,actor,title] of [[student,201,'Synthetic student: complete interview practice'],[parent,202,'Synthetic guardian: confirm materials checklist']]){
   db.sql(`INSERT INTO service.tasks(task_id,service_project_id,task_type,task_title,task_status,priority,assigned_principal_id,created_by_principal_id,updated_by_principal_id)
    VALUES('${id(task)}','${service}','APPLICATION_ACTION','${title}','PENDING','MEDIUM','${id(actor)}','${id(900)}','${id(900)}');
    INSERT INTO service.workbench_task_scope VALUES('${id(task)}','${id(1)}','CLIENT');`)
  }
  await register('family-student','client-a')
  await register('family-parent','client-b')
  const endpoint='projects/'+service
  const snapshot=async alias=>snapshotData(expectStatus(await call(alias,endpoint),200))
  const send=(alias,body,key)=>call(alias,endpoint+'/commands',{method:'POST',body,headers:{'idempotency-key':key}})
  const command=(task,status,revision)=>({kind:'TASK_STATUS',payload:{id:id(task),status,revision,reason:'CLIENT_ACTION'}})
  env.FAMILY_P1_ENABLED='1'
  try {
   for(const [alias,task,other,actor,routeAlias] of [['family-student',student,parent,201,'client-a'],['family-parent',parent,student,202,'client-b']]){
    let current=await snapshot(alias)
    assert.equal(current.project.viewerPrincipalId,id(actor))
    assert.ok(current.milestones.length>0)
    assert.ok(current.tasks.some(item=>item.id===id(task)))
    assert.ok(!current.tasks.some(item=>item.id===id(other)))
    expectStatus(await send(alias,command(other,'IN_PROGRESS',current.project.revision),randomBytes(16).toString('hex')),403)
    expectStatus(await send(alias,command(task,'IN_PROGRESS',current.project.revision),randomBytes(16).toString('hex')),200)
    current=await snapshot(alias)
    const body=command(task,'COMPLETED',current.project.revision), key=randomBytes(16).toString('hex')
    const first=expectStatus(await send(alias,body,key),200)
    const replay=expectStatus(await send(alias,body,key),200)
    assert.equal(first.replayed,false)
    assert.equal(replay.replayed,true)
    assert.equal(first.result.eventId,replay.result.eventId)
    assert.equal(db.sql(`SELECT count(*) FROM service.task_events WHERE task_id='${id(task)}' AND to_status='COMPLETED' AND actor_principal_id='${id(actor)}' AND occurred_at IS NOT NULL`),'1')
    assert.ok(Number(db.sql(`SELECT count(*) FROM audit.access_events WHERE principal_id='${id(actor)}' AND resource_id='${service}' AND action='TASK_STATUS' AND decision='ALLOW' AND reason_code='WORKBENCH_COMMAND_COMMITTED'`))>0)
    authFixture.sessions.get(accounts[alias].sessionHash).valid_until=Date.now()-1000
    expectStatus(await call(alias,endpoint),401)
    expectStatus(await send(alias,body,key),401)
    await register(alias+'-new-session',routeAlias)
    assert.equal((await snapshot(alias+'-new-session')).tasks.find(item=>item.id===id(task))?.status,'COMPLETED')
   }
   await register('other-family','outsider')
   assert.ok(!validateSummary(expectStatus(await summary('other-family'),200)).projects.some(item=>item.service_project_id===service))
   expectStatus(await call('other-family',endpoint),403)
   expectStatus(await send('other-family',command(student,'COMPLETED',1),randomBytes(16).toString('hex')),403)
   const guardianAlias='family-parent-new-session'
   const parentRevision=(await snapshot(guardianAlias)).project.revision
   db.sql(`UPDATE core.family_memberships SET valid_until=clock_timestamp() WHERE family_id='${id(100)}' AND person_id='${id(2)}'`)
   // The existing context-ticket issuer may return a generic unavailable status on expired membership.
   for(const denied of [await call(guardianAlias,endpoint),
    await send(guardianAlias,command(parent,'COMPLETED',parentRevision),randomBytes(16).toString('hex'))]){
    assert.ok([403,503].includes(denied.status),JSON.stringify(denied.data))
    assert.deepEqual(Object.keys(denied.data),['error'])
   }
   db.sql(`UPDATE core.family_memberships SET valid_until=NULL WHERE family_id='${id(100)}' AND person_id='${id(2)}'`)
   await snapshot(guardianAlias)
   db.sql(`UPDATE core.guardian_authorities SET revoked_at=clock_timestamp() WHERE authority_id='${id(guardian)}'`)
   expectStatus(await call(guardianAlias,endpoint),403)
   expectStatus(await send(guardianAlias,command(parent,'COMPLETED',parentRevision),randomBytes(16).toString('hex')),403)
   check('V5 Family OS two principals complete assigned tasks in one real isolated PostgreSQL project, reverify after sign-in and enforce scope and expiry')
  } finally {
   delete env.FAMILY_P1_ENABLED
   db.sql(`INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)
    VALUES('${id(7702)}','${id(1)}','ADULT_VERIFIED','synthetic://baseline-restored','${id(900)}');`)
  }
 }
 await verifyFamilyTasks()

 const beforeRevoke=await summary('client-a');assert.ok(validateSummary(expectStatus(beforeRevoke,200)).projects.some(x=>x.service_project_id===project(310)))
 db.sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp(),ended_by_principal_id='"+id(900)+"' WHERE service_project_id='"+project(310)+"' AND subject_person_id='"+id(1)+"'")
 response=await summary('client-a');data=validateSummary(expectStatus(response,200));assert.ok(!data.projects.some(x=>x.service_project_id===project(310)))
 expectStatus(await call('client-a','projects/'+project(310)),403)
 check('project authorization revocation removes summary and denies detail')

 mappings.get(accounts['client-a'].id).active=false
 expectStatus(await summary('client-a'),403)
 mappings.get(accounts['client-a'].id).active=true
 check('missing or revoked Canonical mapping fails closed')

 authFixture.sessions.get(accounts['client-b'].sessionHash).valid_until=Date.now()-1000
 const expiredResponse=await summary('client-b')
 expectStatus(expiredResponse,401)
 check('expired trusted Canonical identity session is refused before project resolution')

 const faultConfig={...config,async verifySession(){throw Error('synthetic trusted identity authority outage')}}
 const dbFault=await bridge.handleCustomerServices(new Request(bridgeOrigin+'/api/family-services/summary',{headers:{cookie:accounts['client-a'].cookie}}),env,'development','summary',faultConfig,provider)
 assert.equal(dbFault.status,503)
 env.SERVICE_WORKBENCH_API_ORIGIN='http://127.0.0.1:1'
 const gatewayFault=await summary('client-a')
 assert.equal(gatewayFault.status,503)
 check('identity authority and gateway failures fail closed without a false progress payload')
 const auditRows=[]
 for(const action of ['CANONICAL_ACCESS_ATTEMPT','CANONICAL_ACCESS_PREPARED','CANONICAL_ACCESS_DENIED','CANONICAL_ACCESS_UNAVAILABLE']){
  auditRows.push({action,count:authFixture.events.filter(row=>row.action===action).length})
 }
 record.synthetic.audit=auditRows
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_ATTEMPT')?.count>0)
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_PREPARED')?.count>0)
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_DENIED')?.count>0)
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_UNAVAILABLE')?.count>0)
 check('trusted audit callback records attempts and outcomes')
 // Stop only this harness's owned Canonical container, after other assertions.
 // Identity availability alone must never make a failed Canonical read look empty.
 env.SERVICE_WORKBENCH_API_ORIGIN=rt.origin
 db.call(['stop',db.container])
 const canonicalFault=await summary('outsider')
 assert.equal(canonicalFault.status,503)
 assert.equal(canonicalFault.data.projects,undefined)
 check('actual Canonical PostgreSQL outage returns an error without cached or empty project facts')
 record.synthetic.status='PASS'
 record.status='SYNTHETIC_PASS_REAL_IDENTITY_BLOCKED'
 console.log('PASS P1 synthetic trusted identity -> bridge -> PostgreSQL acceptance on PG'+version)
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
 try{if(bridgeServer){bridgeServer.closeAllConnections();await new Promise(resolve=>bridgeServer.close(()=>resolve()))}}catch{}
 try{await rt?.close()}catch{}
 try{db?.cleanup()}catch{}
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'p1-acceptance-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
}
