import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../lib/education-external-url.ts', import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {safeEducationWebsite} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('external school data only produces absolute HTTP navigation without credentials or control characters',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,test','//evil.test','https://school.test@evil.test','https://user:pass@school.test','https://school.test\\@evil.test','https://school.test\n.evil.test','https://localhost/a','https://a.localhost',null,'/redirect?next=https://evil.test']) assert.equal(safeEducationWebsite(value),null,String(value));
 assert.equal(safeEducationWebsite('https://www.school.edu.hk/path?year=2027'),'https://www.school.edu.hk/path?year=2027');
 assert.equal(safeEducationWebsite('http://www.school.edu.hk/'),'http://www.school.edu.hk/');
});
