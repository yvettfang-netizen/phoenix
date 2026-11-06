import {runWorkbenchSuite} from './regression-suite.mjs';
import assert from 'node:assert/strict';import {writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';
import {createCluster,id} from './cluster.mjs';import {seedWorkbench} from './fixtures.mjs';import {startWorkbench} from './runtime.mjs';
const version=process.argv[2];assert(['16','17'].includes(version));const output=path.resolve(process.env.WORKBENCH_EVIDENCE_DIR||'out/service-project-workbench-v1');mkdirSync(output,{recursive:true});
let db,rt;const checks=[];
function check(name){checks.push({name,status:'PASS',at:new Date().toISOString()});console.log('PASS '+name);}
function expect(response,status=200){assert.equal(response.status,status,JSON.stringify(response.body));return response.body;}
try{
 db=await createCluster(version);rt=await startWorkbench(db,seedWorkbench(db));
 await runWorkbenchSuite(db,rt,310,0,checks);
}catch(error){console.error(error);process.exitCode=1;}
finally{
 if(rt)writeFileSync(path.join(output,'api-pg'+version+'.json'),JSON.stringify({candidateSha:db.candidateSha,sourceState:'working tree candidate; final exact-SHA CI still required',checks,requests:rt.receipts},null,2)+'\n');
 await rt?.close();db?.cleanup();
}
