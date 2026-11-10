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
  assert([302,303,307,308].includes(family.status));
  assert.match(family.headers.get('location'),/\/zh\/account/);
 }finally{await mf.dispose();}
});
