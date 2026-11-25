import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/canonical-family-projection.ts',import.meta.url),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handleFamilyProjection}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const cookie='phoenix_family_preview=synthetic.synthetic.synthetic';
const request=(suffix='',headers={})=>new Request('http://127.0.0.1:4499/api/canonical/projections/family'+suffix,{headers:{cookie,...headers}});
test('projection BFF stays off by default/production and rejects client identity assertions, invalid cookie and cross-origin',async()=>{
  assert.equal((await handleFamilyProjection(request(),{},'development','family')).status,404);
  const env={CANONICAL_FAMILY_PROJECTION_ENABLED:'true'};
  assert.equal((await handleFamilyProjection(request(),env,'production','family')).status,404);
  for(const r of [request('?family=forged'),request('',{cookie:''}),request('',{cookie:cookie+'; '+cookie}),request('',{origin:'https://other.invalid'}),
    request('',{'sec-fetch-site':'cross-site'}),request('',{'x-role':'FAMILY'})]) {
    assert.equal((await handleFamilyProjection(r,env,'development','family')).status,403);
  }
  for(const resource of ['FAMILY','family/forged','students/not-a-uuid','../family'])assert.equal((await handleFamilyProjection(request(),env,'development',resource)).status,404);
});

test('audited v2 BFF accepts only typed public IDs and refuses legacy v1 UUID DTO fallback',async t=>{
  let legacy=false;
  const id='01910000-0000-7000-8000-000000000003',student='stu_'+id.replaceAll('-',''),family='fam_'+id.replaceAll('-','');
  const server=createServer((req,res)=>{
    res.setHeader('content-type','application/json');
    const isFamily=req.url.endsWith('/family'),isSingle=req.url.includes('/stu_');
    const item={studentRef:legacy?id:student,displayName:'Synthetic'};
    res.end(JSON.stringify(isFamily?{schemaVersion:legacy?'family-summary.v1':'family-summary.v2',family:{familyRef:legacy?id:family,displayName:'Synthetic'}}
      :isSingle?{schemaVersion:'student-summary.v2',item}:{schemaVersion:'student-summary.v2',items:[item]}));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const env={CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'true',CANONICAL_FAMILY_API_ORIGIN:`http://127.0.0.1:${server.address().port}`};
  for(const path of ['family','students','students/'+student])assert.equal((await handleFamilyProjection(request(),env,'development',path)).status,200);
  for(const path of ['students/'+id,'students/per_'+id.replaceAll('-',''),'family/'+family])assert.equal((await handleFamilyProjection(request(),env,'development',path)).status,404);
  legacy=true;for(const path of ['family','students','students/'+student])assert.equal((await handleFamilyProjection(request(),env,'development',path)).status,503);
});
test('projection BFF enforces exact typed DTOs, bounded response bytes and no redirect/cookie or role forwarding',async t=>{
  let state='family',sinkCalls=0;
  const sink=createServer((_req,res)=>{sinkCalls++;res.end();});await new Promise(r=>sink.listen(0,'127.0.0.1',r));
  const id='01910000-0000-7000-8000-000000000003';
  const server=createServer((req,res)=>{
    assert.equal(req.headers.cookie,undefined);assert.equal(req.headers['x-role'],undefined);
    assert.equal(req.headers.authorization,'Bearer synthetic.synthetic.synthetic');
    if(state==='redirect'){res.writeHead(302,{location:`http://127.0.0.1:${sink.address().port}`});res.end();return;}
    res.setHeader('content-type','application/json');
    let body={schemaVersion:'family-summary.v1',family:{familyRef:id,displayName:'Synthetic'}};
    if(state==='extra')body.family.phone='forbidden';
    if(state==='bad-type')body.family.familyRef=[id];
    if(state==='oversize')body.family.displayName='x'.repeat(130000);
    if(state==='students')body={schemaVersion:'student-summary.v1',items:[{studentRef:id,displayName:'Synthetic'}]};
    if(state==='duplicate')body={schemaVersion:'student-summary.v1',items:[{studentRef:id,displayName:'A'},{studentRef:id,displayName:'B'}]};
    if(state==='bad-student')body={schemaVersion:'student-summary.v1',items:[{studentRef:[id],displayName:'Synthetic'}]};
    res.end(JSON.stringify(body));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>Promise.all([new Promise(r=>server.close(r)),new Promise(r=>sink.close(r))]));
  const env={CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_API_ORIGIN:`http://127.0.0.1:${server.address().port}`};
  let r=await handleFamilyProjection(request(),env,'development','family');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');
  for(state of ['extra','bad-type','oversize','redirect'])assert.equal((await handleFamilyProjection(request(),env,'development','family')).status,503);
  assert.equal(sinkCalls,0);
  state='students';assert.equal((await handleFamilyProjection(request(),env,'development','students')).status,200);
  for(state of ['duplicate','bad-student'])assert.equal((await handleFamilyProjection(request(),env,'development','students')).status,503);
});
