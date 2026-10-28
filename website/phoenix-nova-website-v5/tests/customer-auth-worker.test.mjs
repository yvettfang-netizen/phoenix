import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createV5Worker } from "./worker-fixture.mjs";

test("built V5 Worker registers and authenticates with real local D1, and gates the family route",async()=>{
  const origin="https://auth-test.example";
  const mf=createV5Worker({CUSTOMER_AUTH_ENABLED:"1",CUSTOMER_AUTH_REGISTRATION_ENABLED:"1",CUSTOMER_AUTH_ORIGIN:origin});
  try {
    const db=await mf.getD1Database("DB");
    const dir=new URL("../drizzle/",import.meta.url);
    for(const name of readdirSync(dir).filter(x=>x.endsWith(".sql")).sort()){
      for(const sql of readFileSync(new URL(name,dir),"utf8").split("--> statement-breakpoint").filter(x=>x.trim()))await db.prepare(sql).run();
    }
    const call=(path,data,cookie="")=>mf.dispatchFetch(origin+path,{method:data?"POST":"GET",headers:{origin,"content-type":"application/json",cookie},...(data?{body:JSON.stringify(data)}:{})});
    const account=await call("/zh/account");assert.equal(account.status,200);assert.match(await account.text(),/欢迎回到凤启/);
    const unauthorized=await mf.dispatchFetch(origin+"/zh/family-center",{redirect:"manual"});assert.ok([302,303,307,308].includes(unauthorized.status));assert.match(unauthorized.headers.get("location"),/\/zh\/account/);
    const registration=await call("/api/customer-auth/register",{username:"worker_tester",password:"Worker-test-passphrase-2026",testAccount:true});
    assert.equal(registration.status,201);const created=await registration.json();assert.ok(created.user.id);assert.ok(created.recoveryCode);
    const login=await call("/api/customer-auth/login",{username:"worker_tester",password:"Worker-test-passphrase-2026"});assert.equal(login.status,200);const cookie=login.headers.get("set-cookie");assert.match(cookie,/HttpOnly/);
    const session=await call("/api/customer-auth/session",undefined,cookie);assert.equal((await session.json()).user.id,created.user.id);
    const family=await mf.dispatchFetch(origin+"/zh/family-center",{headers:{cookie},redirect:"manual"});assert.equal(family.status,200);const html=await family.text();assert.doesNotMatch(html,/回乡证|获准逗留期限|demo-xiao/);
    assert.equal((await call("/api/customer-auth/logout",{},cookie)).status,200);
    assert.equal((await (await call("/api/customer-auth/session",undefined,cookie)).json()).user,null);
  } finally { await mf.dispose(); }
});
