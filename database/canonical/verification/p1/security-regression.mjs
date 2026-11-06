import assert from 'node:assert/strict'
import {setTimeout as delay} from 'node:timers/promises'
import {id} from '../v0038/cluster.mjs'

const bridgeHeader='x-phoenix-customer-bridge'
const project=n=>'projects/'+id(n)

export async function verifyGatewaySecurity(db,rt,customerToken,check){
 const headers=marker=>({
  Authorization:'Bearer '+customerToken,
  ...(marker===undefined?{}:{[bridgeHeader]:marker})
 })
 const call=(resource,marker,body)=>rt.call('client-c',resource,body,undefined,{headers:headers(marker)})
 const mixed=project(318)
 const message={kind:'MESSAGE',payload:{revision:1,subjectId:id(2),body:'Synthetic forbidden message',audience:'CLIENT'}}
 const upload={revision:1,subjectId:id(2),kind:'TRANSCRIPT',mime:'text/plain',contentBase64:Buffer.from('Synthetic denied file').toString('base64')}
 for(const marker of [undefined,'forged','p1']){
  assert.equal((await call(mixed,marker)).status,403)
  assert.equal((await call(mixed+'/commands',marker,message)).status,403)
  assert.equal((await call(mixed+'/materials',marker,upload)).status,403)
  assert.equal((await call(mixed+'/materials/'+id(99999)+'/download',marker)).status,403)
 }
 assert.equal(db.sql("SELECT count(*) FROM service.workbench_messages WHERE service_project_id='"+id(318)+"'"),'0')
 assert.equal((await call(project(312),'p1')).status,200)
 assert.equal((await call(project(312),undefined)).status,403)
 const list=await call('projects','p1')
 assert.equal(list.status,200)
 assert.ok(list.body.items.some(item=>item.id===id(312)))
 assert.ok(!list.body.items.some(item=>item.id===id(318)))
 for(const alias of ['client-b','advisor-a']){
  assert.equal((await rt.call(alias,'projects',undefined,undefined,{headers:{[bridgeHeader]:'p1'}})).status,403)
  assert.equal((await rt.call(alias,'projects')).status,200)
 }
 const session=rt.sessions.get(customerToken)
 rt.sessions.set(customerToken,{...session,profile:undefined})
 try{assert.equal((await call(project(312),undefined)).status,403)}
 finally{rt.sessions.set(customerToken,session)}
 const advisorToken=rt.tokens['advisor-a'],advisorSession=rt.sessions.get(advisorToken)
 rt.sessions.set(advisorToken,{...advisorSession,profile:'CUSTOMER'})
 try{assert.equal((await rt.call('advisor-a','projects',undefined,undefined,{headers:{[bridgeHeader]:'p1'}})).status,403)}
 finally{rt.sessions.set(advisorToken,advisorSession)}
 check('A1 verified customer profile cannot drop or forge the marker or borrow a synthetic session')

 const role='phoenix_canonical_service_workbench'
 const grants=[
  ['table SELECT','SELECT ON service.projects',role],
  ['column UPDATE','UPDATE (project_name) ON service.projects',role],
  ['schema CREATE','CREATE ON SCHEMA service',role],
  ['unlisted EXECUTE','EXECUTE ON FUNCTION service.workbench_can_read(uuid)',role],
  ['binder EXECUTE drift','EXECUTE ON FUNCTION auth.clear_context()', 'workbench_binder'],
  ['role membership','phoenix_canonical_reader',role]
 ]
 if(db.version==='17')grants.push(['table MAINTAIN','MAINTAIN ON service.projects',role])
 for(const [name,privilege,grantee] of grants){
  db.sql('GRANT '+privilege+' TO '+grantee)
  try{
   assert.equal((await call(project(312),'p1')).status,503,name)
   assert.equal(db.sql('SELECT count(*) FROM auth.session_contexts'),'0',name)
   assert.equal(db.sql('SELECT count(*) FROM auth.context_exchange_tickets'),'0',name)
  }finally{db.sql('REVOKE '+privilege+' FROM '+grantee)}
 }
 const ownedTable='service.workbench_owner_drift_probe'
 db.sql('CREATE TABLE '+ownedTable+' (probe integer); ALTER TABLE '+ownedTable+' OWNER TO '+role+'; REVOKE ALL ON '+ownedTable+' FROM '+role)
 try{
  assert.equal(db.sql("SELECT has_table_privilege('"+role+"','"+ownedTable+"','SELECT')"),'f')
  assert.equal((await call(project(312),'p1')).status,503,'ownership without ordinary ACLs')
  assert.equal(db.sql('SELECT count(*) FROM auth.session_contexts'),'0')
  assert.equal(db.sql('SELECT count(*) FROM auth.context_exchange_tickets'),'0')
 }finally{db.sql('ALTER TABLE '+ownedTable+' OWNER TO phoenix_bootstrap')}
 assert.equal((await call(project(312),'p1')).status,200)
 check('A3 effective role rejects unexpected ACLs and object ownership before ticket issue',{driftCases:[...grants.map(([name])=>name),'table ownership with ordinary ACLs revoked']})
}

export async function verifyBridgeSecurity({db,rt,bridge,env,config,provider,account,mapping,check}){
 const invoke=async(resource,{onAudit=()=>{},onReleaseRead,mappedProvider=provider,body,key}={})=>{
  const ids=[]
  let sessionReads=0
  const observedDb={
   prepare(sql){
    const statement=config.db.prepare(sql)
    if(onReleaseRead&&sql.includes('FROM core_auth_sessions')){
     return {bind(...values){return {async first(){
      const row=await statement.bind(...values).first()
      if(++sessionReads===2)await onReleaseRead(row)
      return row
     }}}}
    }
    if(!sql.startsWith('INSERT INTO core_auth_audit'))return statement
    return {bind(...values){
     const bound=statement.bind(...values)
     return {async run(){
      await onAudit(values[2])
      const result=await bound.run()
      ids.push(values[0])
      return result
     }}
    }}
   }
  }
  const headers={cookie:account.cookie}
  if(body)Object.assign(headers,{origin:config.origin,'content-type':'application/json','idempotency-key':key})
  const request=new Request(config.origin+'/api/service-workbench/'+resource,
   {method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined})
  const response=await bridge.handleCustomerServices(request,env,'development',resource,{...config,db:observedDb},mappedProvider)
  const rows=await Promise.all(ids.map(auditId=>config.db.prepare('SELECT id,action FROM core_auth_audit WHERE id=?').bind(auditId).first()))
  assert.ok(rows.length>0)
  assert.equal(new Set(rows.map(row=>row.id.split(':')[0])).size,1)
  assert.equal(rows[0].id.split(':')[1],'attempt')
  return {response,actions:rows.map(row=>row.action)}
 }
 const attempt='CANONICAL_ACCESS_ATTEMPT',prepared='CANONICAL_ACCESS_PREPARED'
 const denied='CANONICAL_ACCESS_DENIED',unavailable='CANONICAL_ACCESS_UNAVAILABLE'
 const atPreparation=action=>action===prepared
 const initial=await invoke('summary')
 assert.equal(initial.response.status,200)
 assert.ok((await initial.response.json()).projects.some(item=>item.service_project_id===id(310)))
 assert.deepEqual(initial.actions,[attempt,prepared])

 const setExpiry=value=>config.db.prepare('UPDATE core_auth_sessions SET expires_at=? WHERE token_hash=?').bind(value,account.sessionHash).run()
 const expiry=await config.db.prepare('SELECT expires_at FROM core_auth_sessions WHERE token_hash=?').bind(account.sessionHash).first()
 try{
  const expired=await invoke('summary',{onAudit:async action=>{if(atPreparation(action))await setExpiry(0)}})
  assert.equal(expired.response.status,401)
  assert.deepEqual(await expired.response.json(),{error:{code:'SIGN_IN_REQUIRED'}})
  assert.deepEqual(expired.actions,[attempt,prepared,denied])
 }finally{await setExpiry(expiry.expires_at)}

 let releaseRow=false
 try{
  const revoked=await invoke('summary',{onReleaseRead:row=>{releaseRow=!!row;mapping.active=false}})
  assert.equal(releaseRow,true)
  assert.equal(revoked.response.status,503)
  assert.deepEqual(await revoked.response.json(),{error:{code:'IDENTITY_BRIDGE_UNAVAILABLE'}})
  assert.deepEqual(revoked.actions,[attempt,prepared,unavailable])
 }finally{mapping.active=true}
 check('A2 revoking the mapping during the last D1 session lookup withholds the buffered project')

 for(const point of ['D1 read','authority check']){
  let deadline=0,entered=false
  const onAudit=async action=>{
   if(atPreparation(action)){
    deadline=Date.now()+600
    await setExpiry(deadline)
   }
  }
  const crossDeadline=async()=>{
   entered=true
   await delay(Math.max(0,deadline-Date.now()+10))
  }
  try{
   const mappedProvider={async resolve(identity){
    const resolved=await provider.resolve(identity)
    let checks=0
    return {token:resolved.token,async assertCurrent(){
     await resolved.assertCurrent()
     if(point==='authority check'&&++checks===2)await crossDeadline()
    }}
   }}
   const expired=await invoke('summary',{onAudit,mappedProvider,onReleaseRead:async row=>{
    assert.equal(row?.valid_until,deadline)
    if(point==='D1 read')await crossDeadline()
   }})
   assert.ok(entered&&Date.now()>=deadline,point)
   assert.equal(expired.response.status,401,point)
   assert.deepEqual(await expired.response.json(),{error:{code:'SIGN_IN_REQUIRED'}})
   assert.deepEqual(expired.actions,[attempt,prepared,denied])
  }finally{await setExpiry(expiry.expires_at)}
 }
 check('A2 the session deadline must still be valid after both the D1 lookup and the final authority check')

 const currentRevision=()=>Number(db.sql("SELECT revision FROM service.workbench_settings WHERE service_project_id='"+id(310)+"'"))
 const content='Synthetic authorized download bytes'
 const uploaded=await rt.call('client-a',project(310)+'/materials',
  {revision:currentRevision(),subjectId:id(1),kind:'TRANSCRIPT',mime:'text/plain',contentBase64:Buffer.from(content).toString('base64')})
 assert.equal(uploaded.status,200)
 const version=uploaded.body.result.versionId
 assert.equal((await rt.call('advisor-a',project(310)+'/commands',
  {kind:'MATERIAL_REVIEW',payload:{revision:currentRevision(),id:version,status:'APPROVED',note:'Synthetic review'}})).status,200)
 const download=project(310)+'/materials/'+version+'/download'
 const positiveDownload=await invoke(download)
 assert.equal(positiveDownload.response.status,200)
 assert.equal(await positiveDownload.response.text(),content)
 try{
  const revoked=await invoke(download,{onAudit:action=>{if(atPreparation(action))mapping.active=false}})
  assert.equal(revoked.response.status,503)
  assert.deepEqual(await revoked.response.json(),{error:{code:'IDENTITY_BRIDGE_UNAVAILABLE'}})
  assert.equal(revoked.response.headers.get('content-disposition'),null)
  assert.deepEqual(revoked.actions,[attempt,prepared,unavailable])
 }finally{mapping.active=true}
 check('A2 D1 expiration and mapping revocation during the release audit withhold summary and real file bytes')

 const messageCount=()=>Number(db.sql("SELECT count(*) FROM service.workbench_messages WHERE service_project_id='"+id(310)+"'"))
 const before=messageCount(),resource=project(310)+'/commands',key='p1-security-a2-idempotent-message'
 const body={kind:'MESSAGE',payload:{revision:currentRevision(),subjectId:id(1),body:'Synthetic committed message',audience:'CLIENT'}}
 try{
  const revoked=await invoke(resource,{body,key,onAudit:action=>{if(atPreparation(action))mapping.active=false}})
  assert.equal(revoked.response.status,503)
  assert.deepEqual(revoked.actions,[attempt,prepared,unavailable])
 }finally{mapping.active=true}
 assert.equal(messageCount(),before+1)
 const replay=await invoke(resource,{body,key})
 assert.equal(replay.response.status,200)
 assert.equal((await replay.response.json()).replayed,true)
 assert.equal(messageCount(),before+1)
 check('A2 response denial after a committed command preserves one write and an idempotent authorized retry')

 const badProvider={async resolve(){return {token:mapping.token,async assertCurrent(){throw Error('Synthetic provider refusal detail')}}}}
 const refused=await invoke('summary',{mappedProvider:badProvider})
 assert.equal(refused.response.status,503)
 assert.deepEqual(await refused.response.json(),{error:{code:'IDENTITY_BRIDGE_UNAVAILABLE'}})
 assert.deepEqual(refused.actions,[attempt,unavailable])
 const auditFault=await invoke('summary',{onAudit:action=>{if(atPreparation(action))throw Error('Synthetic D1 audit outage')}})
 assert.equal(auditFault.response.status,503)
 assert.deepEqual(auditFault.actions,[attempt,unavailable])
 check('A4 provider and audit faults record a correlated terminal failure and disclose no provider error')
}
