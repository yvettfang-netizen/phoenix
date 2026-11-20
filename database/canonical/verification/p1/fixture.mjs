import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createRequire} from 'node:module'
import {mkdirSync,readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createCluster,id,protect} from '../v0038/cluster.mjs'
import {seedWorkbench} from '../v0038/fixtures.mjs'
import {startWorkbench} from '../v0038/runtime.mjs'
import {createSyntheticAuthFixture} from './canonical-auth-fixture.mjs'

const project=n=>id(n)

export function seedIdentityProject(db){
 // End the old grant without rewriting terminal history.
 db.sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp(),ended_by_principal_id='"+id(900)+"' WHERE service_project_id='"+project(315)+"' AND status='ACTIVE'")
 for(const [n,subject,family,name] of [[318,2,100,'Synthetic Identity Planning 318'],[319,3,101,'Synthetic Identity Hong Kong 319']]){
  db.sql("INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id) VALUES('"+project(n)+"','"+id(400+family)+"','"+id(family)+"','SYN_PROJECT_"+n+"','"+name+"','ACTIVE','IDENTITY','"+id(900)+"','"+id(900)+"');"+
   "INSERT INTO service.workbench_settings VALUES('"+project(n)+"','GENERAL','Synthetic Identity coordination','DISCOVERY',now()+interval '7 days',1);"+
   "INSERT INTO service.project_subjects(project_subject_id,service_project_id,family_id,subject_person_id,subject_role,data_scope,created_by_principal_id) VALUES('"+id(600+n)+"','"+project(n)+"','"+id(family)+"','"+id(subject)+"','SERVICE_RECIPIENT','IDENTITY','"+id(900)+"');"+
   "INSERT INTO service.project_parties(project_party_id,service_project_id,party_role,person_id,valid_from,created_by_principal_id) VALUES('"+id(1600+n)+"','"+project(n)+"','CONTRACTING_PARTY','"+id(subject)+"',now()-interval '1 hour','"+id(900)+"');")
  for(const [index,kind] of ['CONTRACT_SIGNED','PAYMENT_CONFIRMED','OPENING_APPROVED'].entries())db.sql("INSERT INTO service.workbench_commercial_events VALUES('"+id(10000+n*10+index)+"','"+project(n)+"','phoenix_operations','SYN_"+n+"_"+index+"','"+kind+"','SYN_REFERENCE_"+n+"_"+index+"','"+'b'.repeat(64)+"',"+(index+1)+",now()-interval '1 hour',clock_timestamp(),'"+id(901)+"')")
 }
}

export async function startP1Fixture({root=process.cwd(),version='16'}={}){
 assert(['16','17'].includes(version))
 let db,rt,bridgeServer,emptyApi
 let closed=false
 const close=async()=>{
  if(closed)return
  closed=true
  try{if(bridgeServer){bridgeServer.closeAllConnections();await new Promise(resolve=>bridgeServer.close(()=>resolve()))}}catch{}
  try{await emptyApi?.close()}catch{}
  try{await rt?.close()}catch{}
  try{db?.cleanup()}catch{}
 }
 try{
  db=await createCluster(version)
  const summarySql=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql')
  db.sql(readFileSync(summarySql,'utf8'))
  const credentials=seedWorkbench(db)
  seedIdentityProject(db)
  rt=await startWorkbench(db,credentials)
  const env={
   SERVICE_WORKBENCH_ENABLED:'true',
   CUSTOMER_CANONICAL_BRIDGE_ENABLED:'true',
   SERVICE_WORKBENCH_API_ORIGIN:rt.origin
  }
  const bridge=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts')).href)
  const auth=await import(pathToFileURL(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-auth.ts')).href)
  let identity
  let accounts
  const mappings=new Map()
  let config
  const provider={
   async resolve(identity){
    const mapping=mappings.get(identity.customerId)
    if(!mapping||!mapping.active||mapping.sessionHash!==identity.sessionHash)return null
    const {token}=mapping
    return{token,async assertCurrent(){
     const current=mappings.get(identity.customerId),session=rt.sessions.get(token)
     if(current!==mapping||!current.active||current.sessionHash!==identity.sessionHash||(mapping.alias!=='empty'&&(!session||session.expires<=Date.now())))throw Error('synthetic mapping revoked')
    }}
   }
  }
  bridgeServer=createServer(async(req,res)=>{
   try{
    const url=new URL(req.url??'/', 'http://'+(req.headers.host??'127.0.0.1'))
    const chunks=[]
    for await(const chunk of req)chunks.push(Buffer.from(chunk))
    const headers=new Headers()
    for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value)
    const request=new Request(url,{method:req.method??'GET',headers,body:chunks.length?Buffer.concat(chunks):undefined})
    let response
    if(url.pathname.startsWith('/api/customer-auth/'))response=await auth.handleCustomerAuth(request,config)
    else if(url.pathname==='/api/family-services/summary')response=await bridge.handleCustomerServices(request,env,'development','summary',config,provider)
    else if(url.pathname.startsWith('/api/service-workbench/'))response=await bridge.handleCustomerServices(request,env,'development',url.pathname.slice('/api/service-workbench/'.length),config,provider)
    else response=Response.json({error:{code:'NOT_FOUND'}},{status:404})
    const outputHeaders={}
    response.headers.forEach((value,key)=>{outputHeaders[key]=value})
    res.writeHead(response.status,outputHeaders)
    res.end(Buffer.from(await response.arrayBuffer()))
   }catch{
    res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'})
    res.end(JSON.stringify({error:{code:'IDENTITY_BRIDGE_UNAVAILABLE'}}))
   }
  })
  await new Promise((resolve,reject)=>{
   bridgeServer.once('error',reject)
   bridgeServer.listen(0,'127.0.0.1',resolve)
  })
  const bridgeOrigin='http://127.0.0.1:'+bridgeServer.address().port
  identity=createSyntheticAuthFixture({origin:bridgeOrigin})
  config=identity.config
  accounts=identity.accounts
  const register=async(alias,routeAlias)=>{
   const account=identity.register(alias,routeAlias)
   const response=await fetch(bridgeOrigin+'/api/customer-auth/session',{headers:{cookie:account.cookie}})
   assert.equal(response.status,200)
   const session=await response.json()
   assert.equal(session.user?.id,account.id)
   assert.equal(session.registration,false)
   mappings.set(account.id,{alias:routeAlias,token:rt.issueCustomerSession(routeAlias),sessionHash:account.sessionHash,active:true})
  }
  await register('client-a','client-a')
  await register('client-b','client-b')
  await register('outsider','outsider')
  await register('client-identity','outsider')
  await register('client-c','client-b')
  await register('client-empty','client-b')
  const backendRoot=path.resolve(root,'Phoenix Compass/education compass/server')
  const backendRequire=createRequire(path.join(backendRoot,'package.json'))
  const {Pool}=backendRequire('pg')
  const {createAppServer}=backendRequire('./dist/http/app.js')
  const {createServiceWorkbench,privateWorkbenchObjects}=backendRequire('./dist/services/service-workbench.js')
  db.sql("INSERT INTO core.families(family_id,display_name) VALUES('"+id(102)+"','Synthetic Empty Family') ON CONFLICT DO NOTHING;"+
   "INSERT INTO core.people(person_id,display_name) VALUES('"+id(4)+"','Synthetic Empty Customer') ON CONFLICT DO NOTHING;"+
   "INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES('"+id(204)+"','"+id(4)+"','FAMILY','ACTIVE') ON CONFLICT DO NOTHING;"+
   "INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES('"+id(1004)+"','"+id(102)+"','"+id(4)+"','MEMBER',now()-interval '1 day') ON CONFLICT DO NOTHING;"+
   "INSERT INTO core.student_profiles(person_id) VALUES('"+id(4)+"') ON CONFLICT DO NOTHING;"+
   "INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id) VALUES('"+id(1104)+"','"+id(4)+"','ADULT_VERIFIED','synthetic://capacity','"+id(900)+"') ON CONFLICT DO NOTHING;")
  const emptyObjects=path.join(db.work,'p1-empty-objects');mkdirSync(emptyObjects,{mode:0o700});protect(emptyObjects)
  const emptyStore=await privateWorkbenchObjects(emptyObjects)
  const emptyApp=new Pool(rt.connection('workbench_app',credentials.appPassword))
  const emptyBinder=new Pool(rt.connection('workbench_binder',credentials.binderPassword))
  const emptyToken=randomBytes(32).toString('base64url')
  const emptyWorkbench=createServiceWorkbench({
   app:emptyApp,binder:emptyBinder,objects:emptyStore,mode:'test',
   resolve:async authorization=>{
    const token=authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,256})$/)?.[1]
    if(token===emptyToken)return{principalId:id(204),actorPersonId:id(4),familyId:id(102),channel:'FAMILY',profile:'CUSTOMER',async assertCurrent(){}}
    const session=rt.sessions.get(token)
    const customerAliases={'client-a':[1,100],'client-b':[2,100],outsider:[3,101]}
    const scope=session&&customerAliases[session.alias]
    if(!scope||session.profile!=='CUSTOMER')throw Error('customer synthetic session required')
    const [person,family]=scope
    return{principalId:id(200+person),actorPersonId:id(person),familyId:id(family),channel:'FAMILY',profile:'CUSTOMER',async assertCurrent(){
     if(rt.sessions.get(token)!==session||session.expires<=Date.now())throw Error('synthetic customer session revoked')
    }}
   }
  })
  const emptyLegacy=new Proxy({},{get(){throw Error('Legacy store/auth must not be used by empty synthetic service')}})
  const emptyServer=createAppServer({auth:emptyLegacy,profiles:emptyLegacy,assessments:emptyLegacy,orders:emptyLegacy,reports:emptyLegacy,serviceWorkbench:emptyWorkbench,logger:{error(){}}})
  emptyApi={origin:null,token:emptyToken,async close(){
   try{emptyServer.closeAllConnections();await new Promise(resolve=>emptyServer.close(()=>resolve()))}catch{}
   try{await emptyWorkbench.close()}catch{}
  }}
  await new Promise((resolve,reject)=>{
   emptyServer.once('error',reject)
   emptyServer.listen(0,'127.0.0.1',resolve)
  })
  emptyApi.origin='http://127.0.0.1:'+emptyServer.address().port
  mappings.set(accounts['client-empty'].id,{alias:'empty',token:emptyToken,sessionHash:accounts['client-empty'].sessionHash,active:true})
  // All four independent customer principals share the same gateway and database.
  // Staff updates continue through the separate inherited P0 staff fixture.
  env.SERVICE_WORKBENCH_API_ORIGIN=emptyApi.origin
  const call=async(alias,resource,{method='GET',body,query='',headers={}}={})=>{
   const account=accounts[alias];assert.ok(account,'Unknown synthetic account '+alias)
   const requestHeaders=new Headers(headers);requestHeaders.set('cookie',account.cookie)
   if(method==='POST'){
    requestHeaders.set('origin',bridgeOrigin);requestHeaders.set('content-type','application/json')
    if(!requestHeaders.has('idempotency-key'))requestHeaders.set('idempotency-key','p1-browser-'+alias+'-'+Date.now()+'-'+Math.random().toString(16).slice(2))
   }
   const response=await fetch(bridgeOrigin+'/api/service-workbench/'+resource+(query||''),{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body)})
   let data;try{data=await response.clone().json()}catch{data=await response.text()}
   return{status:response.status,data}
  }
  const summary=async(alias,query='')=>{
   const response=await fetch(bridgeOrigin+'/api/family-services/summary'+query,{headers:{cookie:accounts[alias].cookie}})
   let data;try{data=await response.clone().json()}catch{data=await response.text()}
   return{status:response.status,data}
  }
  const revoke=async(projectNumber,subjectNumber)=>{
   db.sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp(),ended_by_principal_id='"+id(900)+"' WHERE service_project_id='"+project(projectNumber)+"' AND subject_person_id='"+id(subjectNumber)+"'")
  }
  return{root,version,db,rt,identity,env,bridge,auth,config,provider,accounts,mappings,bridgeOrigin,emptyApi,call,summary,revoke,close,project,id}
 }catch(error){
  await close()
  throw error
 }
}
