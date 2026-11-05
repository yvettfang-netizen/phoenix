import test from 'node:test';import assert from 'node:assert/strict';
import {handleServiceWorkbench} from '../lib/service-workbench-bff.ts';
const env={SERVICE_WORKBENCH_ENABLED:'true',SERVICE_WORKBENCH_SYNTHETIC_PREVIEW:'true',SERVICE_WORKBENCH_API_ORIGIN:'http://127.0.0.1:4678'};
const cookie='phoenix_workbench_session='+'a'.repeat(43),origin='http://127.0.0.1:4677';
const request=(resource='projects',options={})=>new Request(origin+'/api/service-workbench/'+resource,{headers:{cookie,...options.headers},...options});
test('workbench is closed in production, without flags, for foreign hosts and forged identity headers',async()=>{
 assert.equal((await handleServiceWorkbench(request(),env,'production','projects')).status,404);
 assert.equal((await handleServiceWorkbench(request(),{},'development','projects')).status,404);
 assert.equal((await handleServiceWorkbench(new Request('https://nonprod.example.invalid/api/service-workbench/projects',{headers:{cookie}}),env,'development','projects')).status,403);
 for(const name of ['x-family-id','x-role','x-principal-id','x-channel','x-source-system','authorization']){
  assert.equal((await handleServiceWorkbench(request('projects',{headers:{cookie,[name]:'forged'}}),env,'development','projects')).status,403);
 }
});
test('workbench POST requires exact Origin and JSON, cookie is not replaced by a browser bearer',async()=>{
 assert.equal((await handleServiceWorkbench(request('dev-session',{method:'POST',body:'{}'}),env,'development','dev-session')).status,403);
 assert.equal((await handleServiceWorkbench(request('dev-session',{method:'POST',headers:{origin:origin,'content-type':'text/plain'},body:'{}'}),env,'development','dev-session')).status,415);
 assert.equal((await handleServiceWorkbench(request('dev-session',{method:'POST',headers:{origin:'https://forged.invalid','content-type':'application/json'},body:'{}'}),env,'development','dev-session')).status,403);
});
test('opaque synthetic session stays HttpOnly; upstream secret never becomes browser JSON',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).origin,env.SERVICE_WORKBENCH_API_ORIGIN);assert.equal(options.redirect,'manual');return Response.json({token:'b'.repeat(43),synthetic:true});};
  const result=await handleServiceWorkbench(request('dev-session',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{"account":"client-a"}'}),env,'development','dev-session');
  assert.deepEqual(await result.json(),{synthetic:true});assert.match(result.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('unknown or sensitive fields fail the response contract rather than becoming a projection',async()=>{
 const original=globalThis.fetch;
 const item={id:'01920000-0000-7000-8000-000000000136',title:'Synthetic project',domain:'EDUCATION',status:'ACTIVE',stage:'MATERIALS',opened:true,template:'HK_MASTERS'};
 try{
  globalThis.fetch=async()=>Response.json({schemaVersion:'service-project-list.v1',items:[item]});
  const ok=await handleServiceWorkbench(request(),env,'development','projects');assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'private, no-store');
  globalThis.fetch=async()=>Response.json({schemaVersion:'service-project-list.v1',items:[{...item,patientDiagnosis:'must not leak'}]});
  const bad=await handleServiceWorkbench(request(),env,'development','projects');assert.equal(bad.status,503);assert(!(await bad.text()).includes('diagnosis'));
 }finally{globalThis.fetch=original;}
});
test('untrusted upstream origins and unauthorized redirects are not followed',async()=>{
 const original=globalThis.fetch;let calls=0;try{globalThis.fetch=async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://external.invalid'}});};
 assert.equal((await handleServiceWorkbench(request(),{...env,SERVICE_WORKBENCH_API_ORIGIN:'https://external.invalid'},'development','projects')).status,503);assert.equal(calls,0);
 assert.equal((await handleServiceWorkbench(request(),env,'development','projects')).status,503);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('oversize incoming upload is cancelled before forwarding',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1000001));},cancel(){cancelled=true;}});
 const r=new Request(origin+'/api/service-workbench/dev-session',{method:'POST',headers:{origin,'content-type':'application/json'},body:stream,duplex:'half'});
 assert.equal((await handleServiceWorkbench(r,env,'development','dev-session')).status,413);assert(cancelled);
});
