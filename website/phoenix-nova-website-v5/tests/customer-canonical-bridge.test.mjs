import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCustomerServices} from '../lib/customer-canonical-bridge.ts';
const origin='http://127.0.0.1:4699',token='s'.repeat(43);
const env={SERVICE_WORKBENCH_ENABLED:'true',CUSTOMER_CANONICAL_BRIDGE_ENABLED:'true',SERVICE_WORKBENCH_API_ORIGIN:'http://127.0.0.1:4698'};
// Unit adapter, not D1/PG/Staging evidence.
function fixture(){
 let active=true,revoked=false,failAudit=false;
 const session={id:'synthetic-customer-a',token_hash:'synthetic-session-hash'};
 const audits=[];
 const db={prepare(sql){return {bind(...args){this.args=args;return this;},async first(){return active?session:null;},async run(){if(sql.startsWith('INSERT')){if(failAudit)throw Error('audit down');audits.push(this.args[2]);}return {meta:{changes:1}};}};}};
 const config={db,origin,registration:false};
 const provider={async resolve(identity){assert.deepEqual(identity,{customerId:session.id,sessionHash:session.token_hash});return {token,async assertCurrent(){if(revoked)throw Error('revoked');}};}};
 return {config,provider,audits,expire(){active=false;},revoke(){revoked=true;},auditDown(){failAudit=true;}};
}
const request=(headers={})=>new Request(origin+'/api/service-workbench/projects',{headers:{cookie:'phoenix-local-session='+'c'.repeat(43),...headers}});
test('bridge refuses production, missing config/mapping, client authority and dev login',async()=>{
 const f=fixture();
 assert.equal((await handleCustomerServices(request(),env,'production','projects',f.config,f.provider)).status,404);
 assert.equal((await handleCustomerServices(request(),env,'development','projects',null,f.provider)).status,503);
 assert.equal((await handleCustomerServices(request(),env,'development','projects',f.config,undefined)).status,503);
 assert.equal((await handleCustomerServices(request(),env,'development','dev-session',f.config,f.provider)).status,404);
 for(const h of ['authorization','x-customer-id','x-family-id','x-project-id','x-principal-id','x-role','x-phoenix-customer-bridge']){
  assert.equal((await handleCustomerServices(request({[h]:'forged'}),env,'development','projects',f.config,f.provider)).status,403);
 }
 const missing={async resolve(){return null;}};
 assert.equal((await handleCustomerServices(request(),env,'development','projects',f.config,missing)).status,403);
});
test('server mapping supplies opaque token, never browser workbench cookie; expires and revokes before release',async()=>{
 const original=globalThis.fetch;
 try{
  for(const event of ['success','expire','revoke','auditDown']){
   const f=fixture();
   globalThis.fetch=async(_url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer '+token);
    assert.equal(options.headers["X-Phoenix-Customer-Bridge"],'p1');
    if(event!=='success')f[event]();
    return Response.json({schemaVersion:'service-project-list.v1',items:[]});
   };
   const result=await handleCustomerServices(request({cookie:'phoenix-local-session='+'c'.repeat(43)+'; phoenix_workbench_session='+'x'.repeat(43)}),env,'development','projects',f.config,f.provider);
   assert.equal(result.status,event==='success'?200:event==='expire'?401:503);
   assert(!(await result.text()).includes(token));
   assert.equal(result.headers.get('cache-control'),'private, no-store');
   assert(f.audits.includes('CANONICAL_ACCESS_ATTEMPT'));
   if(event==='success')assert(f.audits.includes('CANONICAL_ACCESS_GRANTED'));
  }
 }finally{globalThis.fetch=original;}
});
test('expired D1 login never calls mapping or gateway; database/audit failure denies',async()=>{
 const f=fixture();f.expire();
 assert.equal((await handleCustomerServices(request(),env,'development','projects',f.config,{async resolve(){assert.fail('mapping must not run');}})).status,401);
 const g=fixture();g.auditDown();
 assert.equal((await handleCustomerServices(request(),env,'development','projects',g.config,g.provider)).status,503);
});
