import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createCluster,id} from '../v0038/cluster.mjs'
import {seedWorkbench} from '../v0038/fixtures.mjs'
import {startWorkbench} from '../v0038/runtime.mjs'

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
let db,rt,mf,bridgeServer
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

async function createD1(){
 const fixture=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/tests/worker-fixture.mjs')).href)
 const worker=fixture.createV5Worker({
  CUSTOMER_AUTH_ENABLED:'1',
  CUSTOMER_AUTH_REGISTRATION_ENABLED:'1',
  CUSTOMER_AUTH_ORIGIN:rt.origin
 })
 const database=await worker.getD1Database('DB')
 const migrations=path.resolve(root,'website/phoenix-nova-website-v5/drizzle')
 for(const name of readdirSync(migrations).filter(x=>x.endsWith('.sql')).sort()){
  const statements=readFileSync(path.join(migrations,name),'utf8').split('--> statement-breakpoint').filter(x=>x.trim())
  for(const statement of statements)await database.prepare(statement).run()
 }
 return{worker,database}
}

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
 db.sql("UPDATE service.projects SET primary_domain='IDENTITY',project_name='Synthetic Identity Hong Kong 315' WHERE service_project_id='"+project(315)+"'")
 rt=await startWorkbench(db,credentials)
 const env={
  SERVICE_WORKBENCH_ENABLED:'true',
  CUSTOMER_CANONICAL_BRIDGE_ENABLED:'true',
  SERVICE_WORKBENCH_API_ORIGIN:rt.origin
 }
 const bridge=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts')).href)
 const auth=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-auth.ts')).href)
 mf=await createD1()
 const accounts={}
 const mappings=new Map()
 let config
 const provider={
  async resolve(identity){
   const mapping=mappings.get(identity.customerId)
   if(!mapping||!mapping.active||mapping.sessionHash!==identity.sessionHash)return null
   const token=rt.tokens[mapping.alias]
   return{
    token,
    async assertCurrent(){
     const current=mappings.get(identity.customerId)
     const session=rt.sessions.get(token)
     if(!current||!current.active||current.sessionHash!==identity.sessionHash||!session||session.expires<=Date.now())throw Error('synthetic mapping revoked')
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
 config={db:mf.database,origin:bridgeOrigin,registration:true}
 record.synthetic.transport={customerAuth:'HTTP -> real Miniflare D1',customerBff:'HTTP -> server bridge -> HTTP BFF -> PostgreSQL API',canonicalMapping:'synthetic server-owned provider',browserUI:'NOT_CLAIMED'}
 const register=async(alias,routeAlias)=>{
  const username='p1_'+alias.replace(/[^a-z0-9]/g,'_')
  const password='P1-synthetic-'+alias+'-passphrase-2026'
  const response=await fetch(bridgeOrigin+'/api/customer-auth/register',{method:'POST',headers:{origin:bridgeOrigin,'content-type':'application/json'},body:JSON.stringify({username,password,testAccount:true})})
  record.synthetic.authRequests.push({alias,action:'register',status:response.status})
  assert.equal(response.status,201,await response.clone().text())
  const created=await response.json()
  const loginResponse=await fetch(bridgeOrigin+'/api/customer-auth/login',{method:'POST',headers:{origin:bridgeOrigin,'content-type':'application/json'},body:JSON.stringify({username,password})})
  record.synthetic.authRequests.push({alias,action:'login',status:loginResponse.status})
  assert.equal(loginResponse.status,200,await loginResponse.clone().text())
  const cookie=loginResponse.headers.get('set-cookie')
  assert.ok(cookie&&cookie.includes('phoenix-local-session='))
  const sessionRequest=new Request(bridgeOrigin+'/api/customer-auth/session',{headers:{cookie}})
  const session=await auth.readCustomerSession(sessionRequest,config)
  assert.equal(session?.id,created.user.id)
  accounts[alias]={id:created.user.id,cookie,sessionHash:session.token_hash,routeAlias}
  mappings.set(created.user.id,{alias:routeAlias,sessionHash:session.token_hash,active:true})
  record.synthetic.identities.push({alias,customerId:created.user.id,canonicalAlias:routeAlias,synthetic:true})
 }
 await register('client-a','client-a')
 await register('client-b','client-b')
 await register('outsider','outsider')
 await register('client-identity','outsider')
 await register('client-c','client-a')
 await register('client-empty','client-b')
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
 assert.ok(!data.projects.some(x=>x.service_project_id===project(312)||x.service_project_id===project(315)))
 check('D1 client A summary is limited to authorized project subject')
 response=await summary('client-b');data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.some(x=>x.service_project_id===project(312)))
 assert.ok(!data.projects.some(x=>x.service_project_id===project(310)))
 check('D1 client B same-family subject isolation')
 response=await summary('client-identity')
 data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.length===1&&data.projects[0].compass==='IDENTITY')
 check('D1 synthetic Identity customer sees only the authorized Identity project')
 response=await summary('client-c')
 data=validateSummary(expectStatus(response,200))
 assert.ok(data.projects.length>=2,'Synthetic client C must have multiple authorized projects')
 check('D1 client C receives multiple authorized projects through the same server mapping contract')
 db.sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp()-interval '1 second' WHERE service_project_id='"+project(312)+"' AND subject_person_id='"+id(2)+"'")
 response=await summary('client-empty')
 data=validateSummary(expectStatus(response,200))
 assert.equal(data.projects.length,0)
 db.sql("UPDATE service.project_subjects SET status='ACTIVE',valid_until=NULL WHERE service_project_id='"+project(312)+"' AND subject_person_id='"+id(2)+"'")
 check('D1 synthetic no-service customer receives a real empty state')
 response=await summary('client-a','?limit=1');data=validateSummary(expectStatus(response,200));assert.ok(data.projects.length<=1)
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
 check('client task completion path re-reads the current server state and refreshes summary counts')

 const advisorDetail=snapshotData(expectStatus(await rt.call('advisor-a','projects/'+project(310)),200))
 const stageUpdate=await rt.call('advisor-a','projects/'+project(310)+'/commands',{kind:'STAGE',payload:{revision:advisorDetail.project.revision,stage:'SCHOOL_SELECTION'}},'p1-adviser-stage-update')
 assert.equal(stageUpdate.status,200,JSON.stringify(stageUpdate.body))
 response=await call('client-a','projects/'+project(310));detail=snapshotData(expectStatus(response,200))
 assert.equal(detail.project.stage,'SCHOOL_SELECTION')
 check('synthetic P0 adviser fixture updates stage; D1 customer bridge sees it after refresh')

 const health=await call('client-b','projects/'+project(314))
 if(health.status===200){
  const healthData=snapshotData(health.data)
  assert.equal(healthData.project.clinicalEnabled,false)
  assert.equal(healthData.materials.length,0);assert.equal(healthData.messages.length,0);assert.equal(healthData.applications.length,0)
  check('Health patient boundary keeps raw clinical, questionnaire and claim data out of Family OS')
 }else assert.ok([403,404].includes(health.status))

 const beforeRevoke=await summary('client-a');assert.ok(validateSummary(expectStatus(beforeRevoke,200)).projects.some(x=>x.service_project_id===project(310)))
 db.sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp()-interval '1 second' WHERE service_project_id='"+project(310)+"' AND subject_person_id='"+id(1)+"'")
 response=await summary('client-a');data=validateSummary(expectStatus(response,200));assert.ok(!data.projects.some(x=>x.service_project_id===project(310)))
 expectStatus(await call('client-a','projects/'+project(310)),403)
 check('project authorization revocation removes summary and denies detail')

 mappings.get(accounts['client-a'].id).active=false
 expectStatus(await summary('client-a'),403)
 mappings.get(accounts['client-a'].id).active=true
 check('missing or revoked Canonical mapping fails closed')

 await mf.database.prepare('UPDATE core_auth_sessions SET expires_at=? WHERE token_hash=?').bind(Date.now()-1000,accounts['client-b'].sessionHash).run()
 const expiredResponse=await summary('client-b')
 expectStatus(expiredResponse,401)
 check('expired D1 customer session is refused before Canonical resolution')

 const faultConfig={db:{prepare(){throw Error('synthetic D1 outage')}},origin:bridgeOrigin,registration:true}
 const dbFault=await bridge.handleCustomerServices(new Request(bridgeOrigin+'/api/family-services/summary',{headers:{cookie:accounts['client-a'].cookie}}),env,'development','summary',faultConfig,provider)
 assert.equal(dbFault.status,503)
 env.SERVICE_WORKBENCH_API_ORIGIN='http://127.0.0.1:1'
 const gatewayFault=await summary('client-a')
 assert.equal(gatewayFault.status,503)
 check('D1/database and gateway failures fail closed without a false progress payload')
 const auditRows=[]
 for(const action of ['CANONICAL_ACCESS_ATTEMPT','CANONICAL_ACCESS_GRANTED','CANONICAL_ACCESS_DENIED']){
  const row=await mf.database.prepare('SELECT count(*) AS count FROM core_auth_audit WHERE action=?').bind(action).first()
  auditRows.push({action,count:Number(row?.count||0)})
 }
 record.synthetic.audit=auditRows
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_ATTEMPT')?.count>0)
 assert.ok(auditRows.find(x=>x.action==='CANONICAL_ACCESS_GRANTED')?.count>0)
 check('D1 bridge audit records attempts and outcomes')
 record.synthetic.status='PASS'
 record.status='SYNTHETIC_PASS_REAL_IDENTITY_BLOCKED'
 console.log('PASS P1 synthetic D1 -> bridge -> PostgreSQL acceptance on PG'+version)
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
 try{await mf?.worker?.dispose()}catch{}
 try{if(bridgeServer){bridgeServer.closeAllConnections();await new Promise(resolve=>bridgeServer.close(()=>resolve()))}}catch{}
 try{await rt?.close()}catch{}
 try{db?.cleanup()}catch{}
 record.finished=new Date().toISOString()
 writeFileSync(path.join(output,'p1-acceptance-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n')
}
