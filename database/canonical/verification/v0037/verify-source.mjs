import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(path.join(root,'database/canonical/migration-manifests/0037-candidate.json')));
const original=readFileSync(path.join(root,'docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md'),'utf8');
const expected=new Map([...original.matchAll(/^\| (\d{4}) \| `([a-f0-9]{64})` \|$/gm)].map(x=>[x[1],x[2]]));
assert.equal(expected.size,35);expected.set('0037',manifest.sha256);
const combinedPath=path.join(root,'database/canonical/migration-manifests/combined-0036-0037-candidate.json');
const combined=existsSync(combinedPath)?JSON.parse(readFileSync(combinedPath)):undefined;
if(combined){
  const m36=JSON.parse(readFileSync(path.join(root,'database/canonical/migration-manifests/0036-candidate.json')));
  assert.equal(m36.migration.sha256,'2c977cb44e3ec01f7ad00d4c0d8f32c5e2cd8e8fd2fed796340a919dfd0b7719');
  assert.equal(manifest.sha256,'29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2');
  assert.equal(combined.candidate_files,37);assert.equal(combined.forwards.length,2);
  assert.deepEqual(combined.forwards,[{file:m36.migration.filename,sha256:m36.migration.sha256},{file:manifest.file,sha256:manifest.sha256}]);
  assert.equal(combined.approval_source_sha256,m36.approval_source_sha256);
  expected.set('0036',m36.migration.sha256);
  for(const item of m36.verification)assert.equal(hash(readFileSync(path.join(root,'database/canonical',item.path))),item.sha256,item.path);
}
const directory=path.join(root,'database/canonical/migrations');
const files=readdirSync(directory).filter(n=>n.endsWith('.sql')).sort();assert.equal(files.length,combined?37:36);
for(const file of files){assert.match(file,/^\d{4}_[a-z0-9_]+\.sql$/);const bytes=readFileSync(path.join(directory,file));assert(!bytes.includes(13));assert.equal(hash(bytes),expected.get(file.slice(0,4)),file);}
assert.equal(files.at(-1),manifest.file);
if(combined){assert.deepEqual(files.map(f=>f.slice(0,4)),Array.from({length:37},(_,i)=>String(i+1).padStart(4,'0')));console.log('PASS source inventory: 35 historical + byte-exact0036/0037, files=37; isolated combined candidate only, all SQL LF');}
else{assert(!files.some(n=>n.startsWith('0036_')));console.log('PASS source inventory: 35 historical hashes + independent 0037, files=36; 0036 reserved/unmerged, not imported; all SQL LF');}
