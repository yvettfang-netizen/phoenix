import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/canonical-family-projection.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handleSessionFamilyProjection}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const opaque='opaque_synthetic_session_abcdefghijklmnopqrstuvwxyz';
const request=(extra={})=>new Request('http://127.0.0.1:4500/api/canonical/session-projections/family',{...extra,headers:{cookie:'phoenix_family_session='+opaque,...extra.headers}});
const flags={CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'true',CANONICAL_BROKER_SESSION_BRIDGE_ENABLED:'true'};
test('opaque-session BFF defaults off, requires all local flags and rejects mixed/forged contexts',async()=>{
  for(const env of [{},{...flags,CANONICAL_BROKER_SESSION_BRIDGE_ENABLED:'false'},{...flags,CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'false'}])assert.equal((await handleSessionFamilyProjection(request(),env,'development','family')).status,404);
  assert.equal((await handleSessionFamilyProjection(request(),flags,'production','family')).status,404);
  for(const headers of [{cookie:'phoenix_family_preview=a.b.c'},{cookie:'phoenix_family_session=a.b.c'},{cookie:'phoenix_family_session='+opaque+'; phoenix_family_session='+opaque},
    {authorization:'Bearer forged'},{origin:'https://other.invalid'},{'sec-fetch-site':'cross-site'},{'x-family-id':'forged'}])assert.equal((await handleSessionFamilyProjection(request({headers}),flags,'development','family')).status,403);
  assert.equal((await handleSessionFamilyProjection(request({method:'POST'}),flags,'development','family')).status,405);
  assert.equal((await handleSessionFamilyProjection(request(),flags,'development','students/stu_'+'a'.repeat(32))).status,404);
});
test('opaque-session BFF only forwards opaque auth to its dedicated backend and enforces audited DTOs',async t=>{
  let mode='good',calls=0;
  const server=createServer((req,res)=>{
    calls++;assert.equal(req.url,'/v1/canonical/session-projections/family');assert.equal(req.headers.authorization,'Bearer '+opaque);
    assert.equal(req.headers.cookie,undefined);assert.equal(req.headers['x-role'],undefined);
    if(mode==='redirect'){res.writeHead(302,{location:'https://untrusted.invalid'});res.end();return;}
    res.setHeader('content-type','application/json');res.setHeader('set-cookie','must_not_forward=1');
    const body={schemaVersion:mode==='legacy'?'family-summary.v1':'family-summary.v2',family:{familyRef:'fam_'+'a'.repeat(32),displayName:'Synthetic'}};
    if(mode==='extra')body.family.phone='synthetic-forbidden';res.end(JSON.stringify(body));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const env={...flags,CANONICAL_SESSION_API_ORIGIN:`http://127.0.0.1:${server.address().port}`};
  const result=await handleSessionFamilyProjection(request(),env,'development','family');assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'private, no-store');
  for(mode of ['legacy','extra','redirect'])assert.equal((await handleSessionFamilyProjection(request(),env,'development','family')).status,503);
  const before=calls;assert.equal((await handleSessionFamilyProjection(request(),{...flags,CANONICAL_FAMILY_API_ORIGIN:env.CANONICAL_SESSION_API_ORIGIN},'development','family')).status,503);assert.equal(calls,before);
});
