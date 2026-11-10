import test from 'node:test';
import assert from 'node:assert/strict';
import {createV5Worker} from './worker-fixture.mjs';
test('built V5 Worker does not create D1 customer identities, sessions, or registrations',async()=>{
 const origin='https://auth-test.example';
 const mf=createV5Worker({CUSTOMER_AUTH_ENABLED:'1',CUSTOMER_AUTH_REGISTRATION_ENABLED:'1',CUSTOMER_AUTH_ORIGIN:origin});
 try{
  const session=await mf.dispatchFetch(origin+'/api/customer-auth/session');
  assert.equal(session.status,503);
  const register=await mf.dispatchFetch(origin+'/api/customer-auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});
  assert.equal(register.status,503);
  const family=await mf.dispatchFetch(origin+'/zh/family-center',{redirect:'manual'});
  // When the Canonical verifier is not yet supplied the site may render a
  // clearly labelled preview or sign-in surface, never a signed-in client.
  assert.equal(family.status,200);
  const html=await family.text();
  assert.doesNotMatch(html,/synthetic-customer-a|synthetic-canonical-submission/);
 }finally{await mf.dispose();}
});
