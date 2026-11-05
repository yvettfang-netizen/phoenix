import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createCluster} from './cluster.mjs';import {seedWorkbench} from './fixtures.mjs';import {startWorkbench} from './runtime.mjs';import {startWebsite} from './browser.mjs';
assert(!existsSync('website/phoenix-nova-website-v5/.dev.vars'),'Preserve existing preview; do not create another database');
let db,rt,web,closing=false;
const close=async()=>{if(closing)return;closing=true;await web?.close();await rt?.close();db?.cleanup();process.exit();};
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
try{
 db=await createCluster('16');rt=await startWorkbench(db,seedWorkbench(db));web=await startWebsite(rt,4688);
 const directory=path.resolve('out/service-project-workbench-v1');mkdirSync(directory,{recursive:true});
 writeFileSync(path.join(directory,'retained-preview.json'),JSON.stringify({started:new Date().toISOString(),pid:process.pid,container:db.container,label:db.nonce,origin:web.origin,apiOrigin:rt.origin,syntheticOnly:true,candidateSha:db.candidateSha,stop:'Send Ctrl+C to this retained preview process; owned website/API/container/private test directory are cleaned. No shared database or historical volume is deleted.'},null,2)+'\n');
 console.log('RETAINED SYNTHETIC PREVIEW '+web.origin+'/zh/my-services');console.log('No real identity, deployment, production data or financial source activation.');
}catch(error){console.error(error);await close();}
