import test from'node:test';import assert from'node:assert/strict';
import{handleServiceWorkbench}from'../lib/service-workbench-bff.ts';
import{validFamilyDashboard}from'../lib/family-os-dashboard.ts';
const origin='http://127.0.0.1:4680',cookie='phoenix_workbench_session='+'a'.repeat(43),env={SERVICE_WORKBENCH_ENABLED:'true',FAMILY_OS_DASHBOARD_ENABLED:'true',SERVICE_WORKBENCH_API_ORIGIN:'http://127.0.0.1:4678'};
const id=n=>'01920000-0000-7000-8000-'+n.toString(16).padStart(12,'0');
const empty=()=>{const now=Date.now();return{schemaVersion:'family-os-dashboard.v1',family:{id:id(100),label:null},viewer:{principalId:id(201),label:null,permissions:['AUTHORIZED_PROJECT_READ','OWN_CLIENT_TASK_TRANSITION']},metrics:{currentProjects:0,historyProjects:0,activeProjects:0,pausedProjects:0,customerActions:0},projects:[],history:[],nextActions:[],recentUpdates:[],assessments:{availability:'NOT_CONNECTED'},generatedAt:new Date(now).toISOString(),validUntil:new Date(now+2000).toISOString()};};
const request=(extra={})=>new Request(origin+'/api/family-os/dashboard',{headers:{cookie,...extra}});
test('P1 stays off by default/production and refuses arbitrary identity, query, mixed D1 and missing sessions',async()=>{
 const saved=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(empty());};
 try{
  assert.equal((await handleServiceWorkbench(request(),{...env,FAMILY_OS_DASHBOARD_ENABLED:'false'},'development','dashboard')).status,404);
  assert.equal((await handleServiceWorkbench(request(),env,'production','dashboard')).status,404);
  assert.equal((await handleServiceWorkbench(new Request(origin+'/api/family-os/dashboard'),env,'development','dashboard')).status,401);
  for(const header of ['x-family-id','x-principal-id','x-role','authorization'])assert.equal((await handleServiceWorkbench(request({[header]:'forged'}),env,'development','dashboard')).status,403);
  assert.equal((await handleServiceWorkbench(new Request(origin+'/api/family-os/dashboard?family_id='+id(101),{headers:{cookie}}),env,'development','dashboard')).status,403);
  assert.equal((await handleServiceWorkbench(request({cookie:cookie+'; phoenix-local-session=unmapped'}),env,'development','dashboard')).status,403);
  assert.equal((await handleServiceWorkbench(request(),{...env,CUSTOMER_AUTH_ENABLED:'1'},'development','dashboard')).status,403);assert.equal(calls,0);
 }finally{globalThis.fetch=saved;}
});
test('typed fresh empty response is truthful; private no-store and no upstream credential/body forwarding',async()=>{
 const saved=globalThis.fetch;try{globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).pathname,'/v1/service-workbench/dashboard');assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(options.headers.cookie,undefined);return Response.json(empty());};
  const r=await handleServiceWorkbench(request(),env,'development','dashboard');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual((await r.json()).projects,[]);
 }finally{globalThis.fetch=saved;}
});
test('expired, forged counts, nested private values and extra clinical fields are refused without fallback',async()=>{
 const saved=globalThis.fetch;try{for(const change of [d=>{d.metrics.currentProjects=1;},d=>{d.viewer.label={diagnosis:'hidden'};},d=>{d.patientRecords=[];},d=>{d.generatedAt=new Date(Date.now()-3000).toISOString();d.validUntil=new Date(Date.now()-1000).toISOString();}]){
  const d=empty();change(d);globalThis.fetch=async()=>Response.json(d);const r=await handleServiceWorkbench(request(),env,'development','dashboard');assert.equal(r.status,503);assert(!(await r.text()).includes('diagnosis'));
 }}finally{globalThis.fetch=saved;}
});
test('Health summary forbids free-text source names, advisor, milestone, events and task counts',()=>{
 const health={id:id(314),projectType:'GENERAL',displayName:'HEALTH_SERVICE',compass:'HEALTH',lifecycleStatus:'ACTIVE',currentStage:'DISCOVERY',advisors:[],nextMilestone:null,customerActionCount:0,latestPublicEvent:null,detailPath:'/my-services/'+id(314),healthRestricted:true};
 const d=empty();d.projects=[health];d.metrics.currentProjects=1;d.metrics.activeProjects=1;assert(validFamilyDashboard(d));
 for(const change of [p=>{p.displayName='SYNTHETIC_DIAGNOSIS';},p=>{p.advisors=[{principalId:id(210),name:'Private team',role:'SPECIALIST'}];},p=>{p.nextMilestone={id:id(1),title:'Private appointment',targetAt:null};},p=>{p.customerActionCount=1;}]){const broken=structuredClone(d);change(broken.projects[0]);assert.equal(validFamilyDashboard(broken),false);}
});
