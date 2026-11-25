import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCustomerServices} from '../lib/customer-canonical-bridge.ts';
const origin='http://127.0.0.1:4699',token='s'.repeat(43);
const env={SERVICE_WORKBENCH_ENABLED:'true',CUSTOMER_CANONICAL_BRIDGE_ENABLED:'true',SERVICE_WORKBENCH_API_ORIGIN:'http://127.0.0.1:4698'};
function fixture(){
 let active=true,revoked=false,failAudit=false;
 const session={id:'synthetic-customer-a',username:'test',created_at:Date.now(),token_hash:'a'.repeat(64),valid_until:Date.now()+60000};
 const audits=[];
 const config={origin,async verifySession(){return active?session:null;},async recordAccess(_actor,action){if(failAudit)throw Error('audit down');audits.push(action);}};
 const provider={async resolve(identity){assert.deepEqual(identity,{customerId:session.id,sessionHash:session.token_hash});return {token,async assertCurrent(){if(revoked)throw Error('revoked');}};}};
 return {config,provider,audits,expire(){active=false;},revoke(){revoked=true;},auditDown(){failAudit=true;}};
}
const request=(headers={})=>new Request(origin+'/api/service-workbench/projects',{headers});
test('bridge requires Canonical verifier, authorization and separate server-owned mapping',async()=>{
 const f=fixture();
 assert.equal((await handleCustomerServices(request(),env,'production','projects',f.config,f.provider)).status,404);
 assert.equal((await handleCustomerServices(request(),env,'development','projects',null,f.provider)).status,503);
 assert.equal((await handleCustomerServices(request(),env,'development','projects',f.config,undefined)).status,503);
 for(const h of ['authorization','x-customer-id','x-family-id','x-project-id','x-principal-id','x-role']){
  assert.equal((await handleCustomerServices(request({[h]:'forged'}),env,'development','projects',f.config,f.provider)).status,403);
 }
});
test('Canonical identity remains checked before delivery and audit failure fails closed',async()=>{
 const original=globalThis.fetch;
 try{
  for(const event of ['success','expire','revoke','auditDown']){
   const f=fixture();
   globalThis.fetch=async(_url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer '+token);
    if(event!=='success')f[event]();
    return Response.json({schemaVersion:'service-project-list.v1',items:[]});
   };
   const result=await handleCustomerServices(request(),env,'development','projects',f.config,f.provider);
   assert.equal(result.status,event==='success'?200:event==='expire'?401:503);
   assert(f.audits.includes('CANONICAL_ACCESS_ATTEMPT')||event==='auditDown');
   assert(!(await result.text()).includes(token));
  }
 }finally{globalThis.fetch=original;}
});
