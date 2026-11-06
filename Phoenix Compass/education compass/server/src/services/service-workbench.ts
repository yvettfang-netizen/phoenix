import {randomBytes,createHash} from 'node:crypto'
import {mkdir,writeFile,readFile,lstat,realpath} from 'node:fs/promises'
import path from 'node:path'
import {Pool,PoolClient} from 'pg'
import {IncomingMessage,ServerResponse} from 'node:http'
import {execFileSync} from 'node:child_process'
import {AppError} from '../domain/errors'

export interface WorkbenchIdentity {
 principalId:string;actorPersonId:string;familyId:string;channel:'FAMILY'|'ADVISOR'
 /** Bound by the server-side bearer resolver when the session is issued. */
 profile:'CUSTOMER'|'STAFF'|'SYNTHETIC'
 assertCurrent():Promise<void>
}
export interface WorkbenchObjects {
 put(key:string,bytes:Buffer):Promise<void>
 get(key:string):Promise<Buffer>
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function workbenchUuid():string {
 const b=randomBytes(16),now=BigInt(Date.now());for(let n=0;n<6;n++)b[5-n]=Number(now>>BigInt(n*8)&255n)
 b[6]=(b[6]&15)|112;b[8]=(b[8]&63)|128;const h=b.toString('hex')
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)
}
const failure=(status=503,code='WORKBENCH_UNAVAILABLE')=>new AppError(status,code,'服务工作台暂不可用，请按提示重试')
const hash=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex')
const summaryPageSize=20
const summaryProject=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type SummaryCursor={at:string;project:string}
function parseSummaryCursor(value:unknown):SummaryCursor|null {
 if(value===undefined||value===null||value==='')return null
 if(typeof value!=='string'||value.length>512)throw failure(422,'INVALID_CURSOR')
 let parsed:unknown
 try{parsed=JSON.parse(value)}catch{throw failure(422,'INVALID_CURSOR')}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw failure(422,'INVALID_CURSOR')
 const cursor=parsed as Record<string,unknown>
 if(Object.keys(cursor).sort().join(',')!=='at,project'||typeof cursor.at!=='string'||!Number.isFinite(Date.parse(cursor.at))||
   typeof cursor.project!=='string'||!summaryProject.test(cursor.project))throw failure(422,'INVALID_CURSOR')
 // Preserve PostgreSQL microsecond precision for the keyset boundary.
 return {at:cursor.at,project:cursor.project}
}
function parseSummaryLimit(value:unknown):number {
 if(value===undefined||value===null||value==='')return summaryPageSize
 if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=50)return value
 if(typeof value==='string'&&/^(?:[1-9]|[1-4][0-9]|50)$/.test(value))return Number(value)
 throw failure(422,'INVALID_LIMIT')
}
export async function privateWorkbenchObjects(directory:string):Promise<WorkbenchObjects> {
 if(!path.isAbsolute(directory))throw failure()
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink()||(process.platform!=='win32'&&(info.mode&0o077)!==0))throw failure()
 if(process.platform==='win32')try{execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
  '$a=Get-Acl -LiteralPath $env:WORKBENCH_CHECK_ROOT; $s=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $ok=@($s,"S-1-5-18","S-1-5-32-544"); if(@($a.Access|Where-Object {$_.AccessControlType -eq "Allow" -and $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $ok}).Count){exit 1}'],
  {env:{...process.env,WORKBENCH_CHECK_ROOT:directory},stdio:'ignore',timeout:5000,windowsHide:true})}catch{throw failure()}
 const root=await realpath(directory)
 const target=(key:string)=>{if(!/^mock\/workbench\/[a-f0-9/-]{16,180}$/.test(key))throw failure();const f=path.resolve(root,key);if(!f.startsWith(root+path.sep))throw failure();return f}
 return{
  async put(key,bytes){const f=target(key);await mkdir(path.dirname(f),{recursive:true,mode:0o700});const parent=await realpath(path.dirname(f));if(!parent.startsWith(root+path.sep))throw failure()
   try{await writeFile(f,bytes,{flag:'wx',mode:0o600})}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw failure();const i=await lstat(f);if(!i.isFile()||i.isSymbolicLink()||hash(await readFile(f))!==hash(bytes))throw failure(409,'OBJECT_CONFLICT')}
  },
  async get(key){const f=target(key),i=await lstat(f);if(!i.isFile()||i.isSymbolicLink()||i.size>524288)throw failure();if(!(await realpath(f)).startsWith(root+path.sep))throw failure();return readFile(f)}
 }
}
export interface WorkbenchDependencies {
 app:Pool;binder:Pool;objects:WorkbenchObjects
 resolve(authorization:string|undefined):Promise<WorkbenchIdentity>
 /** Explicit local synthetic preview only; never set by normal application bootstrap. */
 syntheticLogin?:(alias:string)=>Promise<string>
 /** The private staging composition installs the 0040 staff safety gate. */
 projectSafetyGuard?:(client:PoolClient,identity:WorkbenchIdentity,project?:string)=>Promise<void>
 mode:'test'|'development'|'private-staging'
}
const workbenchRole='phoenix_canonical_service_workbench'
const roleFunctions={
 binder:['auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid)'],
 app:[],
 workbench:[
  'auth.clear_context()','auth.redeem_context_ticket(uuid,uuid)',
  'service.workbench_snapshot(uuid)','service.workbench_list()',
  'service.workbench_command(uuid,text,jsonb,text,uuid)','service.workbench_download(uuid,uuid)',
  'service.workbench_catalogue()','service.workbench_customer_scope(uuid)',
  'service.workbench_customer_snapshot(uuid)','service.workbench_customer_list()',
  'service.workbench_summary(integer,timestamptz,uuid)',
  'service.workbench_staging_staff_mixed_health(uuid)'
 ]
}
async function guard(client:PoolClient,role:keyof typeof roleFunctions):Promise<void>{
 const schemas=role==='workbench'?['auth','service']:['auth']
 const result=await client.query(`
  WITH app_schemas AS (
   SELECT oid,nspname,nspowner FROM pg_catalog.pg_namespace
   WHERE nspname NOT IN ('pg_catalog','information_schema','pg_toast')
     AND nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
  ), allowed_functions AS (
   SELECT pg_catalog.to_regprocedure(signature) AS oid FROM unnest($4::text[]) AS f(signature)
  )
  SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR rolinherit)
   AND CASE WHEN $1='workbench' THEN NOT rolcanlogin AND current_user=$2::name
            ELSE rolcanlogin AND current_user=session_user END
   AND NOT pg_catalog.has_database_privilege(current_database(),'CREATE')
   AND NOT EXISTS (
    SELECT FROM pg_catalog.pg_database d WHERE d.datname=current_database() AND d.datdba=r.oid
   )
   AND NOT EXISTS (
    SELECT FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid
      AND ($1<>'app' OR m.roleid<>$2::regrole OR m.admin_option OR m.inherit_option OR NOT m.set_option)
   )
   AND ($1<>'app' OR pg_catalog.pg_has_role(current_user,$2::name,'SET'))
   AND NOT EXISTS (
    SELECT FROM app_schemas n WHERE n.nspowner=r.oid OR pg_catalog.has_schema_privilege(n.oid,'CREATE,USAGE WITH GRANT OPTION')
      OR (n.nspname<>ALL($3::name[]) AND pg_catalog.has_schema_privilege(n.oid,'USAGE'))
   )
   AND NOT EXISTS (
    SELECT FROM pg_catalog.pg_class t JOIN app_schemas n ON n.oid=t.relnamespace
    WHERE t.relowner=r.oid OR CASE
     WHEN t.relkind='S' THEN pg_catalog.has_sequence_privilege(t.oid,'USAGE,SELECT,UPDATE')
     WHEN t.relkind IN ('r','p','v','m','f') THEN
      pg_catalog.has_table_privilege(t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER' ||
       CASE WHEN current_setting('server_version_num')::int>=170000 THEN ',MAINTAIN' ELSE '' END)
      OR pg_catalog.has_any_column_privilege(t.oid,'SELECT,INSERT,UPDATE,REFERENCES')
     ELSE false END
   )
   AND NOT EXISTS (
    SELECT FROM pg_catalog.pg_proc p JOIN app_schemas n ON n.oid=p.pronamespace
    WHERE p.proowner=r.oid OR (pg_catalog.has_schema_privilege(n.oid,'USAGE') AND pg_catalog.has_function_privilege(p.oid,'EXECUTE')
      AND (pg_catalog.has_function_privilege(p.oid,'EXECUTE WITH GRANT OPTION')
        OR NOT EXISTS (SELECT FROM allowed_functions f WHERE f.oid=p.oid)))
   ) AS ok
  FROM pg_catalog.pg_roles r WHERE rolname=current_user
 `,[role,workbenchRole,schemas,roleFunctions[role]])
 if(result.rows[0]?.ok!==true)throw failure()
}
export function createServiceWorkbench(deps:WorkbenchDependencies){
 if(!['test','development','private-staging'].includes(deps.mode))throw failure()
 const privateStaging=deps.mode==='private-staging'
 if(privateStaging&&(!deps.projectSafetyGuard||deps.syntheticLogin))throw failure()
 for(const pool of [deps.app,deps.binder]){pool.on('error',()=>{});pool.on('connect',client=>client.on('error',()=>{}))}
 async function run(authorization:string|undefined,customerRoute:boolean,
  operation:(client:PoolClient,identity:WorkbenchIdentity)=>Promise<Record<string,unknown>>,guardProject?:string){
  const identity=await deps.resolve(authorization)
  const customer=identity.profile==='CUSTOMER'
  const allowedProfile=customer?identity.channel==='FAMILY':
   identity.profile==='STAFF'?privateStaging&&identity.channel==='ADVISOR':
   identity.profile==='SYNTHETIC'&&!privateStaging&&!!deps.syntheticLogin&&['FAMILY','ADVISOR'].includes(identity.channel)
  if(![identity.principalId,identity.actorPersonId,identity.familyId].every(v=>uuid.test(v))||
   !allowedProfile||customerRoute!==(customer&&!privateStaging))throw failure(403,'ACCESS_DENIED')
  await identity.assertCurrent()
  let app:PoolClient|undefined,binder:PoolClient|undefined,transaction=false,result:Record<string,unknown>|undefined,error:unknown,appClean=false,binderClean=false
  try{
   binder=await deps.binder.connect();await guard(binder,'binder')
   app=await deps.app.connect();await guard(app,'app')
   await app.query('SET ROLE phoenix_canonical_service_workbench')
   await guard(app,'workbench')
   await app.query('SELECT auth.clear_context()')
   const ticket=await binder.query('SELECT auth.issue_context_ticket($1,$2,$3,$4,clock_timestamp()+interval \'30 seconds\',$5,$1) AS ticket',
    [identity.principalId,identity.actorPersonId,identity.familyId,identity.channel,workbenchUuid()])
   await app.query('SELECT auth.redeem_context_ticket($1,$2)',[ticket.rows[0].ticket,identity.principalId])
   await app.query('BEGIN');transaction=true;await app.query("SET LOCAL statement_timeout='3000ms'")
   await deps.projectSafetyGuard?.(app,identity,guardProject)
   result=await operation(app,identity)
   await identity.assertCurrent()
   await app.query('COMMIT');transaction=false
  }catch(e){error=e instanceof AppError?e:failure();if(app&&transaction)try{await app.query('ROLLBACK')}catch{}}
  finally{
   if(app)try{await app.query('SELECT auth.clear_context()');await app.query('DISCARD ALL');appClean=true}catch{error=failure()}
   if(binder)try{await binder.query('DISCARD ALL');binderClean=true}catch{error=failure()}
   app?.release(!appClean);binder?.release(!binderClean)
  }
  if(error)throw error
  const status=result?.status
  if(status!=='ALLOW')throw failure(status==='DENY'?403:status==='CONFLICT'?409:status==='INVALID'?422:503,status==='DENY'?'ACCESS_DENIED':status==='CONFLICT'?'REVISION_OR_IDEMPOTENCY_CONFLICT':status==='INVALID'?'INVALID_COMMAND':'WORKBENCH_UNAVAILABLE')
  await identity.assertCurrent()
  return result!
 }
 const read=async(authorization:string|undefined,resource:string,project?:string,version?:string,cursor?:SummaryCursor|null,limit=summaryPageSize,customerRoute=false)=>run(authorization,customerRoute,async(c,identity)=>{
  const customer=identity.profile==='CUSTOMER'
  if(resource==='summary'&&!customer)return {status:'DENY'}
  if(customer&&resource==='download'){
   const gate=(await c.query('SELECT service.workbench_customer_snapshot($1) AS result',[project])).rows[0].result
   if(gate.status!=='ALLOW')return gate
  }
  const query=resource==='list'?(customer?'SELECT service.workbench_customer_list() AS result':'SELECT service.workbench_list() AS result'):resource==='catalogue'?'SELECT service.workbench_catalogue() AS result':
   resource==='summary'?'SELECT service.workbench_summary($1,$2::timestamptz,$3::uuid) AS result':
   resource==='download'?'SELECT service.workbench_download($1,$2) AS result':customer?'SELECT service.workbench_customer_snapshot($1) AS result':'SELECT service.workbench_snapshot($1) AS result'
  const params:(string|number|null)[]=resource==='list'||resource==='catalogue'?[]:
   resource==='summary'?[limit,cursor?.at??null,cursor?.project??null]:
   resource==='download'?[project??null,version??null]:[project??null]
  return (await c.query(query,params)).rows[0].result
 },project)
 async function command(authorization:string|undefined,project:string,body:Record<string,unknown>,key:string,upload:boolean,customerRoute=false){
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw failure(400,'IDEMPOTENCY_KEY_REQUIRED')
  return run(authorization,customerRoute,async(c,identity)=>{
   if(identity.profile==='CUSTOMER'){
    const gate=(await c.query('SELECT service.workbench_customer_snapshot($1) AS result',[project])).rows[0].result
    if(gate.status!=='ALLOW')return gate
   }
   let kind:string,payload:Record<string,unknown>
   if(upload){
    const allowed=['revision','subjectId','documentId','kind','contentBase64','mime']
    if(Object.keys(body).some(k=>!allowed.includes(k))||typeof body.contentBase64!=='string'||body.contentBase64.length>700000)throw failure(422,'INVALID_UPLOAD')
    const bytes=Buffer.from(body.contentBase64,'base64');if(bytes.toString('base64')!==body.contentBase64||bytes.length<1||bytes.length>524288)throw failure(422,'INVALID_UPLOAD')
    if(body.mime!=='text/plain'&&body.mime!=='application/pdf'||body.mime==='application/pdf'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw failure(422,'FILE_TYPE_NOT_SUPPORTED')
    if(body.mime==='text/plain')try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(text.includes('\0'))throw failure(422,'INVALID_UPLOAD')}catch{throw failure(422,'INVALID_UPLOAD')}
    const gate=(await c.query('SELECT service.workbench_snapshot($1) AS result',[project])).rows[0].result
    if(gate.status!=='ALLOW'||gate.data?.schemaVersion!=='service-workbench.v1'||gate.data?.project?.staff===true&&gate.data?.project?.write!==true||gate.data?.project?.domain!=='EDUCATION'||gate.data?.project?.status!=='ACTIVE'||gate.data?.project?.opened!==true||
      !Array.isArray(gate.data?.subjects)||!gate.data.subjects.some((s:{id:string;documentsAllowed:boolean})=>s.id===body.subjectId&&s.documentsAllowed===true))return {status:'DENY'}
    const objectKey='mock/workbench/'+project+'/'+hash(identity.principalId+':'+identityKey(key,project))
    await deps.objects.put(objectKey,bytes)
    payload={revision:body.revision,subjectId:body.subjectId,documentId:body.documentId,newDocumentId:workbenchUuid(),versionId:workbenchUuid(),sha256:hash(bytes),storageKey:objectKey,size:bytes.length,kind:body.kind,mime:body.mime}
    kind='MATERIAL_UPLOAD'
   }else{
    if(Object.keys(body).sort().join(',')!=='kind,payload'||typeof body.kind!=='string'||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))throw failure(422,'INVALID_COMMAND')
    kind=body.kind;payload=body.payload as Record<string,unknown>
    // Storage metadata belongs exclusively to the trusted upload adapter.
    if(kind==='MATERIAL_UPLOAD')throw failure(403,'UPLOAD_ADAPTER_REQUIRED')
   }
   return (await c.query('SELECT service.workbench_command($1,$2,$3::jsonb,$4,$5) AS result',[project,kind,JSON.stringify(payload),key,workbenchUuid()])).rows[0].result
  },project)
 }
 function identityKey(key:string,project:string){return project+':'+key}
 async function handle(request:IncomingMessage,response:ServerResponse):Promise<void>{
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Type':'application/json; charset=utf-8'}
  const json=(status:number,value:unknown)=>{response.writeHead(status,headers);response.end(JSON.stringify(value))}
  try{
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress??'')||
    ['x-family-id','x-principal-id','x-role','x-channel','x-source-system'].some(h=>request.headers[h]))throw failure(403,'ACCESS_DENIED')
   const url=new URL(request.url??'','http://127.0.0.1')
   const route=url.pathname.slice('/v1/service-workbench/'.length),method=request.method??'GET'
   const summaryQuery=route==='summary'&&method==='GET'
   if(url.search&&!summaryQuery)throw failure(400,'QUERY_NOT_ALLOWED')
   let summaryLimit=summaryPageSize,summaryCursor:SummaryCursor|null=null
   if(summaryQuery){
    const keys=[...url.searchParams.keys()]
    if(keys.some(k=>k!=='limit'&&k!=='cursor')||new Set(keys).size!==keys.length)throw failure(422,'INVALID_QUERY')
    summaryLimit=parseSummaryLimit(url.searchParams.get('limit')??undefined)
    summaryCursor=parseSummaryCursor(url.searchParams.get('cursor')??undefined)
   }
   let body:Record<string,unknown>={}
   if(method==='POST'){
    const chunks:Buffer[]=[];let size=0
    const reading=(async()=>{for await(const chunk of request){const b=Buffer.from(chunk);size+=b.length;if(size>1000000)throw failure(413,'BODY_TOO_LARGE');chunks.push(b)}})()
    let timer:NodeJS.Timeout|undefined
    try{await Promise.race([reading,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{request.destroy();reject(failure(408,'BODY_TIMEOUT'))},10000)})])}finally{clearTimeout(timer)}
    try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw Error()}catch{throw failure(400,'INVALID_JSON')}
   }
   if(route==='dev-session'&&method==='POST'){
    if(!deps.syntheticLogin||Object.keys(body).join(',')!=='account'||typeof body.account!=='string')throw failure(404,'NOT_FOUND')
    return json(200,{token:await deps.syntheticLogin(body.account),synthetic:true})
   }
   const authorization=request.headers.authorization,key=String(request.headers['idempotency-key']??'')
   // The marker asserts transport intent. Only the verified session selects permissions.
   const marker=request.headers['x-phoenix-customer-bridge']
   if(marker!==undefined&&marker!=='p1')throw failure(403,'ACCESS_DENIED')
   const customerRoute=marker==='p1'
   if(route==='summary'&&(method==='GET'||method==='POST')){
    if(method==='POST'&&Object.keys(body).some(k=>k!=='limit'&&k!=='cursor'))throw failure(422,'INVALID_QUERY')
    const cursor=method==='POST'?parseSummaryCursor(body.cursor):summaryCursor
    const limit=method==='POST'?parseSummaryLimit(body.limit):summaryLimit
    return json(200,(await read(authorization,'summary',undefined,undefined,cursor,limit,customerRoute)).data)
   }
   if(method==='GET'&&route==='projects')return json(200,(await read(authorization,'list',undefined,undefined,undefined,summaryPageSize,customerRoute)).data)
   if(method==='GET'&&route==='catalogue')return json(200,(await read(authorization,'catalogue',undefined,undefined,undefined,summaryPageSize,customerRoute)).data)
   const parts=route.split('/');if(parts[0]!=='projects'||!uuid.test(parts[1]??''))throw failure(404,'NOT_FOUND')
   if(method==='GET'&&parts.length===2)return json(200,(await read(authorization,'project',parts[1],undefined,undefined,summaryPageSize,customerRoute)).data)
   if(method==='POST'&&parts.length===3&&['commands','materials'].includes(parts[2]))return json(200,await command(authorization,parts[1],body,key,parts[2]==='materials',customerRoute))
   if(method==='GET'&&parts.length===5&&parts[2]==='materials'&&uuid.test(parts[3])&&parts[4]==='download'){
    const result=await read(authorization,'download',parts[1],parts[3],undefined,summaryPageSize,customerRoute),d=result.data as {key:string;sha256:string;size:number;mime:string}
    const bytes=await deps.objects.get(d.key);if(bytes.length!==Number(d.size)||hash(bytes)!==d.sha256)throw failure()
    const final=await read(authorization,'download',parts[1],parts[3],undefined,summaryPageSize,customerRoute);if(JSON.stringify(final.data)!==JSON.stringify(d))throw failure(403,'ACCESS_DENIED')
    response.writeHead(200,{...headers,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="material-'+parts[3]+(d.mime==='application/pdf'?'.pdf':'.txt')+'"'});response.end(bytes);return
   }
   throw failure(405,'METHOD_NOT_ALLOWED')
  }catch(error){const e=error instanceof AppError?error:failure();json(e.status,{error:{code:e.code,message:e.message}})}
 }
 return{handle,read,command,async close(){await deps.app.end();await deps.binder.end()}}
}
