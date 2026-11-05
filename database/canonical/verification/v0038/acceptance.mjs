import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCluster} from './cluster.mjs';
import {seedWorkbench,rotateWorkbenchCredentials,seedAdditionalProject} from './fixtures.mjs';
import {startWorkbench} from './runtime.mjs';
import {runWorkbenchSuite} from './regression-suite.mjs';
import {migrationFaults,restoreFresh} from './recovery.mjs';
import {commercialRegression} from './commercial-regression.mjs';
const version=process.argv[2];assert(['16','17'].includes(version));
const output=path.resolve(process.env.WORKBENCH_EVIDENCE_DIR||'out/service-project-workbench-v1');mkdirSync(output,{recursive:true});
const record={started:new Date().toISOString(),sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceState:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()?'WORKING TREE':'COMMITTED',version,checks:[],requests:[],status:'FAIL'};
let db,rt,restored;
try{
 db=await createCluster(version);record.candidateSha=db.candidateSha;migrationFaults(db);
 const credentials=seedWorkbench(db);rt=await startWorkbench(db,credentials);
 record.checks.push(await commercialRegression(db,rt,credentials));await runWorkbenchSuite(db,rt,310,0,record.checks);record.requests.push(...rt.receipts);
 const objects=rt.objectsRoot;await rt.close();rt=null;
 const recovery=await restoreFresh(db,objects);restored=recovery.db;record.restore=recovery.record;
 seedAdditionalProject(restored,316);rt=await startWorkbench(restored,rotateWorkbenchCredentials(restored));
 await runWorkbenchSuite(restored,rt,316,100000,record.checks);record.requests.push(...rt.receipts);
 record.status='PASS';console.log('PASS PG'+version+' fresh and restored full workbench regression');
}catch(error){record.error={name:error.name,message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{await rt?.close();restored?.cleanup();db?.cleanup();record.finished=new Date().toISOString();writeFileSync(path.join(output,'acceptance-pg'+version+'.json'),JSON.stringify(record,null,2)+'\n');}
