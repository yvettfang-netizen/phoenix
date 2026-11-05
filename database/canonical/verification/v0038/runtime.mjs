import {createRequire} from 'node:module';import path from 'node:path';import {mkdirSync} from 'node:fs';import {randomBytes} from 'node:crypto';import assert from 'node:assert/strict';
import {id,protect} from './cluster.mjs';
const root=process.cwd(),require=createRequire(path.join(root,'Phoenix Compass/education compass/server/package.json'));
const {Pool}=require('pg'),{createAppServer}=require('./dist/http/app.js'),{createServiceWorkbench,privateWorkbenchObjects}=require('./dist/services/service-workbench.js'),{AppError}=require('./dist/domain/errors.js');
export async function startWorkbench(db,credentials){
 const connection=(user,password)=>({host:'127.0.0.1',port:db.port,database:'phoenix_canonical_dev',user,password,max:2,connectionTimeoutMillis:1500,query_timeout:5000,idleTimeoutMillis:3000});
 const sessions=new Map(),tokens={};const aliases={'client-a':[1,100,'FAMILY'],'client-b':[2,100,'FAMILY'],outsider:[3,101,'FAMILY'],'advisor-a':[10,100,'ADVISOR'],'advisor-b':[11,100,'ADVISOR'],manager:[12,100,'ADVISOR']};
 const login=async alias=>{assert(alias in aliases);const token=randomBytes(32).toString('base64url');sessions.set(token,{alias,expires:Date.now()+900000});tokens[alias]=token;return token;};
 for(const alias of Object.keys(aliases))await login(alias);
 const resolve=async authorization=>{const token=authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,256})$/)?.[1],session=sessions.get(token);if(!session)throw new AppError(401,'SIGN_IN_REQUIRED','Synthetic session required');
  const [n,family,channel]=aliases[session.alias];return{principalId:id(200+n),actorPersonId:id(n),familyId:id(family),channel,async assertCurrent(){if(sessions.get(token)!==session||session.expires<=Date.now())throw new AppError(403,'ACCESS_DENIED','Synthetic session revoked');}};};
 const objectsRoot=path.join(db.work,'objects');mkdirSync(objectsRoot,{mode:0o700,recursive:true});protect(objectsRoot);
 const objects=await privateWorkbenchObjects(objectsRoot),app=new Pool(connection('workbench_app',credentials.appPassword)),binder=new Pool(connection('workbench_binder',credentials.binderPassword));
 const workbench=createServiceWorkbench({app,binder,objects,resolve,mode:'test',syntheticLogin:login});
 const legacy=new Proxy({},{get(){throw Error('Legacy store/auth must not be used by Service Workbench')}});
 const server=createAppServer({auth:legacy,profiles:legacy,assessments:legacy,orders:legacy,reports:legacy,serviceWorkbench:workbench,logger:{error(){}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,receipts=[];
 const call=async(alias,resource,body,key,extra={})=>{const method=body?'POST':'GET',response=await fetch(origin+'/v1/service-workbench/'+resource,{method,headers:{Authorization:'Bearer '+tokens[alias],...(body?{'Content-Type':'application/json','Idempotency-Key':key||randomBytes(16).toString('hex')}:{ }),...extra.headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  let value;if(resource.endsWith('/download'))value=Buffer.from(await response.arrayBuffer());else value=await response.json();receipts.push({at:new Date().toISOString(),alias,method,resource,status:response.status,response:Buffer.isBuffer(value)?{bytes:value.length}:value});return{status:response.status,body:value};};
 return{origin,server,workbench,objects,objectsRoot,app,binder,tokens,sessions,receipts,call,Pool,connection,
 async close(){server.closeAllConnections();await new Promise(r=>server.close(r));await workbench.close();}};
}
