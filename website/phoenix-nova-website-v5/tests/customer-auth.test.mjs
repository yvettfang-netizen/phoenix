import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source=readFileSync(new URL("../lib/customer-auth.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handleCustomerAuth,validAuthOrigin}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const migrationDir=new URL("../drizzle/",import.meta.url);
const schema=readdirSync(migrationDir).filter(x=>x.endsWith(".sql")).sort().map(x=>readFileSync(new URL(x,migrationDir),"utf8")).join("\n");
const origin="https://candidate.example";
const pw="Only-test-passphrase-2026";
const nextPw="Second-test-passphrase-2026";

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),"phoenix-auth-"));
  const filename=join(dir,"accounts.sqlite");
  let sql=new DatabaseSync(filename);sql.exec(schema);
  const wrap=(query,values=[])=>({bind(...v){return wrap(query,v);},async first(){return sql.prepare(query).get(...values)??null;},async run(){const result=sql.prepare(query).run(...values);return {meta:{changes:Number(result.changes)}};}});
  const db={prepare:query=>wrap(query),async batch(statements){sql.exec("BEGIN");try{const out=[];for(const s of statements)out.push(await s.run());sql.exec("COMMIT");return out;}catch(e){sql.exec("ROLLBACK");throw e;}}};
  const config={db,origin,registration:true};
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  return {config,sql:()=>sql,reopen(){sql.close();sql=new DatabaseSync(filename);},async call(action,input={},cookie="",extra={}){
    const response=await handleCustomerAuth(new Request(`${origin}/api/customer-auth/${action}`,action.startsWith("session")?{headers:{cookie}}:{method:"POST",headers:{origin,"content-type":"application/json",cookie,...extra},body:JSON.stringify(input)}),config);
    const data=await response.json();return {status:response.status,data,cookie:response.headers.get("set-cookie"),headers:response.headers};
  }};
}
const register=(f,name="tester_one")=>f.call("register",{username:name,password:pw,testAccount:true});
const login=(f,name="tester_one",value=pw)=>f.call("login",{username:name,password:value});

test("real account creation enforces unique usernames and salted password storage",async t=>{
  const f=fixture(t);const a=await register(f);assert.equal(a.status,201);assert.match(a.data.recoveryCode,/^[A-Za-z0-9_-]{43}$/);
  assert.equal((await register(f,"TESTER_ONE")).status,409);
  await register(f,"tester_two");const rows=f.sql().prepare("SELECT * FROM core_auth_users ORDER BY username").all();
  assert.notEqual(rows[0].password_hash,rows[1].password_hash);assert.match(rows[0].password_hash,/^scrypt:32768:8:3:/);
  assert.ok(!JSON.stringify(rows).includes(pw));assert.ok(!JSON.stringify(rows).includes(a.data.recoveryCode));
  assert.equal((await f.call("register",{username:"testthree",password:"short",testAccount:true})).status,400);
  assert.equal((await f.call("register",{username:"admin",password:pw,testAccount:true})).status,400);
});
test("accounts and sessions survive storage reopening and cannot select another user",async t=>{
  const f=fixture(t);const a=await register(f),b=await register(f,"tester_two");const signed=await login(f);
  assert.equal(signed.status,200);assert.match(signed.cookie,/__Host-phoenix-session=.*HttpOnly.*Secure/);
  assert.equal(signed.headers.get("cache-control"),"no-store");
  f.reopen();const me=await f.call(`session?user_id=${b.data.user.id}`,{},signed.cookie);
  assert.equal(me.data.user.id,a.data.user.id);assert.notEqual(me.data.user.id,b.data.user.id);
  assert.deepEqual(Object.keys(me.data.user).sort(),["createdAt","id","username"]);
  assert.equal((await f.call("session",{},"__Host-phoenix-session=forged")).data.user,null);
  assert.equal((await login(f)).data.user.id,a.data.user.id);
});
test("failed login, disabled account and expired or idle sessions fail closed",async t=>{
  const f=fixture(t);await register(f);const wrong=await login(f,"tester_one","Wrong-but-long-password");
  const missing=await login(f,"unknown_user","Wrong-but-long-password");assert.equal(wrong.status,401);assert.deepEqual(wrong.data,missing.data);
  let signed=await login(f);f.sql().prepare("UPDATE core_auth_sessions SET last_seen_at=0").run();assert.equal((await f.call("session",{},signed.cookie)).data.user,null);
  signed=await login(f);f.sql().prepare("UPDATE core_auth_sessions SET expires_at=0").run();assert.equal((await f.call("session",{},signed.cookie)).data.user,null);
  signed=await login(f);f.sql().prepare("UPDATE core_auth_users SET status='disabled'").run();assert.equal((await f.call("session",{},signed.cookie)).data.user,null);assert.equal((await login(f)).status,401);
});
test("logout revokes its session and logout-all revokes every device",async t=>{
  const f=fixture(t);await register(f);const a=await login(f),b=await login(f);
  const out=await f.call("logout",{},a.cookie);assert.equal(out.status,200);assert.match(out.cookie,/Max-Age=0/);
  assert.equal((await f.call("session",{},a.cookie)).data.user,null);assert.ok((await f.call("session",{},b.cookie)).data.user);
  await f.call("logout-all",{},b.cookie);assert.equal((await f.call("session",{},b.cookie)).data.user,null);
});
test("password change requires current password, rotates recovery and revokes sessions",async t=>{
  const f=fixture(t);const created=await register(f);const a=await login(f),b=await login(f);
  assert.equal((await f.call("password",{currentPassword:"bad",newPassword:nextPw},a.cookie)).status,401);
  const changed=await f.call("password",{currentPassword:pw,newPassword:nextPw},a.cookie);assert.equal(changed.status,200);assert.notEqual(changed.data.recoveryCode,created.data.recoveryCode);
  assert.equal((await f.call("session",{},b.cookie)).data.user,null);assert.equal((await login(f)).status,401);assert.equal((await login(f,"tester_one",nextPw)).status,200);
});
test("recovery code is single-use and does not log the user in automatically",async t=>{
  const f=fixture(t);const created=await register(f);const signed=await login(f);
  const recovered=await f.call("recover",{username:"tester_one",recoveryCode:created.data.recoveryCode,newPassword:nextPw});
  assert.equal(recovered.status,200);assert.equal(recovered.data.signInRequired,true);assert.match(recovered.cookie,/Max-Age=0/);
  assert.equal((await f.call("session",{},signed.cookie)).data.user,null);
  assert.equal((await f.call("recover",{username:"tester_one",recoveryCode:created.data.recoveryCode,newPassword:pw})).status,401);
  assert.equal((await login(f,"tester_one",nextPw)).status,200);
});
test("CSRF, body limits and malformed requests are rejected before authentication",async t=>{
  const f=fixture(t);
  assert.equal((await f.call("register",{username:"tester_one",password:pw,testAccount:true},"",{origin:"https://attacker.example"})).status,403);
  assert.equal((await f.call("login",{},"",{"sec-fetch-site":"cross-site"})).status,403);
  assert.equal((await f.call("login",{},"",{"content-type":"text/plain"})).status,415);
  assert.equal((await f.call("login",{username:"x".repeat(5000)})).status,413);
  const malformed=await handleCustomerAuth(new Request(`${origin}/api/customer-auth/login`,{method:"POST",headers:{origin,"content-type":"application/json"},body:"{"}),f.config);assert.equal(malformed.status,400);
  assert.equal(validAuthOrigin("https://good.example/path"),false);assert.equal(validAuthOrigin("http://public.example"),false);assert.equal(validAuthOrigin("http://localhost:4173"),true);
});
test("durable rate limits survive reopening and never prevent sign-out",async t=>{
  const f=fixture(t);await register(f);const signed=await login(f);
  const start=Math.floor(Date.now()/(15*60000))*15*60000;
  f.sql().prepare("INSERT INTO core_auth_limits (key,count,expires_at) VALUES (?,300,?) ON CONFLICT(key) DO UPDATE SET count=300").run(`global:${start}`,start+15*60000);
  f.reopen();assert.equal((await login(f)).status,429);assert.equal((await f.call("logout",{},signed.cookie)).status,200);
});
test("registration is independently gated and storage failures expose no internals",async t=>{
  const f=fixture(t);f.config.registration=false;assert.equal((await register(f)).status,403);
  const config={...f.config,db:{prepare(){throw new Error("sensitive database internals");}}};
  const response=await handleCustomerAuth(new Request(`${origin}/api/customer-auth/session`,{headers:{cookie:`__Host-phoenix-session=${"a".repeat(43)}`}}),config);
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:"AUTH_UNAVAILABLE"});
});
