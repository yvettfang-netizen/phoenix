import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
execFileSync(process.execPath,['database/canonical/verification/v0037/verify-source.mjs'],{stdio:'inherit'});
const folder='database/canonical/forward-candidates/service-workbench/',manifest=JSON.parse(readFileSync(folder+'manifest.json','utf8')),bytes=readFileSync(folder+manifest.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);assert(!bytes.includes(13),'Forward SQL must be entirely LF');assert(bytes.toString().startsWith('BEGIN;\n'));assert(bytes.toString().endsWith('COMMIT;\n'));console.log('PASS isolated0038 candidate manifest; no active migration promotion');
