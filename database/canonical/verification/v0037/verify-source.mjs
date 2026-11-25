import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(path.join(root,'database/canonical/migration-manifests/0037-candidate.json')));
const original=readFileSync(path.join(root,'docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md'),'utf8');
const expected=new Map([...original.matchAll(/^\| (\d{4}) \| `([a-f0-9]{64})` \|$/gm)].map(x=>[x[1],x[2]]));
assert.equal(expected.size,35);expected.set('0037',manifest.sha256);
const directory=path.join(root,'database/canonical/migrations');
const files=readdirSync(directory).filter(n=>n.endsWith('.sql')).sort();assert.equal(files.length,36);
for(const file of files){assert.match(file,/^\d{4}_[a-z0-9_]+\.sql$/);const bytes=readFileSync(path.join(directory,file));assert(!bytes.includes(13));assert.equal(hash(bytes),expected.get(file.slice(0,4)),file);}
assert.equal(files.at(-1),manifest.file);assert(!files.some(n=>n.startsWith('0036_')));
console.log('PASS source inventory: 35 historical hashes + independent 0037, files=36; 0036 reserved/unmerged, not imported; all SQL LF');
