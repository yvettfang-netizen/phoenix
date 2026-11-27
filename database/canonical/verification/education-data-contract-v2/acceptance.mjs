import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runApiAuthorization} from './api-auth.mjs';

const version=process.argv[2];assert(['16','17'].includes(version));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const image=version==='16'
 ? 'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d'
 : 'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
const nonce=randomBytes(6).toString('hex');
const work=mkdtempSync(path.join(tmpdir(),'edc-v2-'));
let container=null;
function docker(args,input,strict=true){
 const r=spawnSync('docker',args,{encoding:'utf8',input,windowsHide:true,maxBuffer:16*1024*1024});
 if(strict&&r.status!==0)throw Error('DOCKER_'+args[0]+'_FAILED '+String(r.stderr+r.stdout).replace(/[A-Za-z0-9_-]{32,}/g,'[REDACTED]').slice(-1200));
 return r;
}
function sql(source,strict=true){
 return docker(['exec','-i','-e','PGPASSFILE=/tmp/edc.pgpass',container,
  'psql','-X','-q','-At','-h','127.0.0.1','-U','phoenix_bootstrap',
  '-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],source,strict);
}
function query(s){return sql(s).stdout.trim();}
try{
 const env=path.join(work,'postgres.env');
 writeFileSync(env,'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+randomBytes(32).toString('hex')+'\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',{mode:0o600});
 container=docker(['run','-d','--name','edc-v2-'+version+'-'+nonce,'--label','phoenix.edc-v2='+nonce,'-p','127.0.0.1::5432','--env-file',env,image]).stdout.trim();
 assert.match(container,/^[a-f0-9]{64}$/);
 const port=Number(docker(['port',container,'5432/tcp']).stdout.trim().split(':').at(-1));
 assert(port>0&&port<=65535,'PG_LOOPBACK_PORT_REQUIRED');
 docker(['exec',container,'bash','-c','umask 077; printf "127.0.0.1:5432:*:phoenix_bootstrap:%s\\n" "$POSTGRES_PASSWORD" > /tmp/edc.pgpass']);
 let ready=false;
 for(let i=0;i<60;i++){
  if(sql('SELECT 1',false).status===0){ready=true;break;}
  await new Promise(ok=>setTimeout(ok,500));
 }
 assert(ready,'POSTGRES_START_FAILED');
 docker(['exec',container,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
 docker(['cp',path.join(root,'database/canonical/migrations')+'/.',container+':/opt/canonical-migrations']);
 docker(['cp',path.join(root,'database/canonical/verification/migrate.sh'),container+':/opt/verification/migrate.sh']);
 assert.equal(readdirSync(path.join(root,'database/canonical/migrations')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).length,37);
 const baseline=docker(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=37',container,'bash','/opt/verification/migrate.sh']).stdout;
 assert.match(baseline,/PASS ledger=37 files=37 expected=37/);
 const f=path.join(root,'database/canonical/forward-candidates/education-data-contract-v2');
 const candidate=readFileSync(path.join(f,'UNNUMBERED_education_data_contract_v2.sql'),'utf8');
 const rollback=readFileSync(path.join(f,'rollback_UNNUMBERED_education_data_contract_v2.sql'),'utf8');
 const fixture=readFileSync(path.join(root,'database/canonical/verification/education-data-contract-v2/synthetic.sql'),'utf8');
 sql(candidate);
 assert.equal(query('SELECT count(*) FROM canonical_migrations.applied'),'37');
 const repeat=sql(candidate,false);
 assert.notEqual(repeat.status,0,'REPEAT_MUST_REFUSE');
 assert.match(repeat.stderr,/already exists/);
 console.log('PASS PG'+version+' formal 0001-0037 fresh, candidate installed, repeat refused; ledger 37');
 sql(fixture);
 console.log('PASS PG'+version+' synthetic D01/D02/D03/D06/A04/A05 + FORCE RLS/ACL negatives');
 const sourceDir=path.join(root,'database/canonical/forward-candidates/education-data-contract-v2');
 const apiCandidate=readFileSync(path.join(sourceDir,'UNNUMBERED_private_use_api_candidate.sql'),'utf8');
 const apiRollback=readFileSync(path.join(sourceDir,'rollback_UNNUMBERED_private_use_api_candidate.sql'),'utf8');
 const actors=readFileSync(path.join(root,'database/canonical/verification/education-data-contract-v2/api_actors_synthetic.sql'),'utf8');
 sql(apiCandidate);
 const apiRepeat=sql(apiCandidate,false);
 assert.notEqual(apiRepeat.status,0,'API_REPEAT_MUST_REFUSE');
 sql(actors);
 await runApiAuthorization({port,sql:query,version});
 console.log('PASS PG'+version+' scoped API; separate app/binder LOGIN; live revocation; no direct table rights');
 sql(apiRollback);
 sql(rollback);
 assert.equal(query("SELECT to_regclass('service.education_document_uses') IS NULL"),'t');
 assert.equal(query("SELECT to_regclass('learning.askwise_evidence_inbox') IS NULL"),'t');
 assert.equal(query('SELECT count(*) FROM canonical_migrations.applied'),'37');
 console.log('PASS PG'+version+' rollback; formal 37 intact');
}catch(e){console.error(String(e?.message??e));process.exitCode=1;}
finally{
 if(container){
  const r=docker(['inspect','--format','{{index .Config.Labels "phoenix.edc-v2"}}',container],undefined,false);
  assert.equal(r.stdout.trim(),nonce,'FOREIGN_CLUSTER_CLEANUP_DENIED');
  docker(['rm','-f','-v',container]);
 }
 rmSync(work,{recursive:true,force:true});
 console.log('PG'+version+' synthetic cluster and credentials cleaned');
}
