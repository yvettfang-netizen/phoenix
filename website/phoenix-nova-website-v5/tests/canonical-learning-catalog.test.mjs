import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import ts from "typescript";
import { createServer } from "node:http";

const compiled = ts.transpileModule(readFileSync(new URL("../lib/canonical-learning-catalog.ts",import.meta.url),"utf8"),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const { handleLearningCatalog } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const preview = randomBytes(32).toString("hex"), service = randomBytes(32).toString("hex");
const env = {CANONICAL_LEARNING_CATALOG_ENABLED:"true",CANONICAL_CATALOG_PREVIEW_TOKEN:preview,
  CANONICAL_CATALOG_SERVICE_TOKEN:service,CANONICAL_CATALOG_API_ORIGIN:"http://127.0.0.1:12345"};
const request = (suffix="",headers={}) => new Request(`http://127.0.0.1:4444/api/learning/catalog${suffix}`,{
  headers:{cookie:`phoenix_catalog_preview=${preview}`,...headers}});
test("BFF default and production stay closed; missing, duplicate, cross-origin and query assertions are refused",async()=>{
  assert.equal((await handleLearningCatalog(request(),{},"development")).status,404);
  assert.equal((await handleLearningCatalog(request(),env,"production")).status,404);
  for (const req of [request("",{cookie:""}),request("",{cookie:`phoenix_catalog_preview=${preview}; phoenix_catalog_preview=${preview}`}),
    request("",{origin:"https://other.invalid"}),request("?family=forged"),request("",{"sec-fetch-site":"cross-site"})]) {
    assert.equal((await handleLearningCatalog(req,env,"development")).status,403);
  }
});
test("BFF rejects redirect/non-loopback/equal capabilities without outbound calls",async()=>{
  for(const change of [{CANONICAL_CATALOG_API_ORIGIN:"https://other.invalid"},{CANONICAL_CATALOG_API_ORIGIN:"http://127.0.0.1:12345/other"},
    {CANONICAL_CATALOG_SERVICE_TOKEN:preview}]) {
    assert.equal((await handleLearningCatalog(request(),{...env,...change},"development")).status,503);
  }
});
test("real upstream DTO is validated; extra fields and redirects are refused without forwarding capabilities",async t=>{
  let state="valid", redirected=0;
  const sink=createServer((_req,res)=>{redirected++;res.end("forbidden");});
  await new Promise(resolve=>sink.listen(0,"127.0.0.1",resolve));
  const server=createServer((req,res)=>{
    assert.equal(req.url,"/v1/learning/catalog");
    assert.equal(req.headers.authorization,`Bearer ${service}`);
    if(state==="redirect") {res.writeHead(302,{location:`http://127.0.0.1:${sink.address().port}/leak`});res.end();return;}
    res.setHeader("content-type","application/json");
    const item={courseRef:"01900000-0000-7000-8000-000000000001",versionRef:"01900000-0000-7000-8000-000000000002",courseCode:"SYNTH",title:"Synthetic",versionNo:1};
    res.end(JSON.stringify({schemaVersion:"learning-catalog.v1",items:[state==="extra"?{...item,familyId:"forged"}:item]}));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  t.after(()=>Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>sink.close(resolve))]));
  const local={...env,CANONICAL_CATALOG_API_ORIGIN:`http://127.0.0.1:${server.address().port}`};
  const valid=await handleLearningCatalog(request(),local,"development");
  assert.equal(valid.status,200);assert.equal(valid.headers.get("cache-control"),"private, no-store");
  state="extra";assert.equal((await handleLearningCatalog(request(),local,"development")).status,503);
  state="redirect";assert.equal((await handleLearningCatalog(request(),local,"development")).status,503);
  assert.equal(redirected,0);
});
