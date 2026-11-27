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

test("the V5 Family OS entry serves the new bilingual shell with protected APIs closed", async () => {
  const origin = "https://family-entry.example";
  const mf = createV5Worker({});
  try {
    for (const [locale, heading, learning] of [["zh", "凤启家序", "我的学习"], ["en", "Family OS", "My Learning"]]) {
      const gateway = await mf.dispatchFetch(`${origin}/${locale}/family-center/entry`, {redirect: "manual"});
      assert.equal(gateway.status, 307);
      assert.equal(new URL(gateway.headers.get("location"), origin).pathname, `/${locale}/family-center`);
      const page = await mf.dispatchFetch(`${origin}/${locale}/family-center`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /data-family-center-v2/);
      assert.ok(html.includes(heading) && html.includes(learning));
      assert.doesNotMatch(html, /demo-xiao|Choose a test session|选择测试会话/);
    }
    for (const api of ["family-learning", "family-services/summary", "service-workbench/projects"]) {
      assert.equal((await mf.dispatchFetch(`${origin}/api/${api}`)).status, 404);
    }
  } finally { await mf.dispose(); }
});
