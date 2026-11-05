import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {randomBytes,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,lstatSync,realpathSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';
export const candidate='database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql';
export const id=n=>'01920000-0000-7000-8000-'+n.toString(16).padStart(12,'0');
export function protect(file){if(process.platform==='win32'){const sid=spawnSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true}).stdout.match(/S-1-5-[0-9-]+/)?.[0];assert(sid);
 assert.equal(spawnSync('icacls.exe',[file,'/inheritance:r','/grant:r','*'+sid+':'+(lstatSync(file).isDirectory()?'(OI)(CI)F':'F')],{windowsHide:true,stdio:'ignore'}).status,0);}}
export async function createCluster(version,{initialize=true}={}){
 assert(['16','17'].includes(version));const root=process.cwd(),nonce=randomBytes(8).toString('hex'),work=mkdtempSync(path.join(tmpdir(),'canonical-workbench-'));protect(work);
 const context=process.env.DOCKER_CONTEXT||(process.platform==='win32'?'desktop-linux':'default');
 const call=(args,input)=>{const r=spawnSync('docker',['--context',context,...args],{input,encoding:'utf8',windowsHide:true,maxBuffer:16e6});if(r.status!==0)throw Error('Owned Docker '+args[0]+' failed: '+String(r.stderr+r.stdout).replace(/[A-Za-z0-9_=-]{32,}/g,'[REDACTED]').slice(-1800));return r.stdout.trim();};
 const endpoint=call(['context','inspect',context,'--format','{{.Endpoints.docker.Host}}']);assert(/^(npipe:|unix:)/.test(endpoint),'Local Docker socket required');
 const password=randomBytes(32).toString('hex'),envFile=path.join(work,'postgres.env');
 writeFileSync(envFile,'POSTGRES_DB=phoenix_canonical_dev\nPOSTGRES_USER=phoenix_bootstrap\nPOSTGRES_PASSWORD='+password+'\nPOSTGRES_INITDB_ARGS=--auth-local=scram-sha-256 --auth-host=scram-sha-256\n',{mode:0o600,flag:'wx'});protect(envFile);
 const images={16:'postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d',17:'postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'};
 const container=call(['run','-d','--name','service-workbench-'+version+'-'+nonce,'--label','canonical.workbench.test='+nonce,'-p','127.0.0.1::5432','--env-file',envFile,images[version]]);
 assert.match(container,/^[a-f0-9]{64}$/);
 const sql=text=>call(['exec','-i','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',container,'psql','-X','-q','-At','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','-v','ON_ERROR_STOP=1'],text);
 call(['exec',container,'bash','-c','umask 077; printf \'127.0.0.1:5432:*:phoenix_bootstrap:%s\\n\' "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass']);
 let ready=false;for(let n=0;n<60;n++){try{if(sql('SELECT 1')==='1'){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Owned cluster ready');
 const port=Number(call(['port',container,'5432/tcp']).split(':').at(-1));
 const ownedWorkPath=realpathSync(work);
 const cleanup=()=>{assert.equal(call(['inspect','--format','{{index .Config.Labels "canonical.workbench.test"}}',container]),nonce);assert.equal(realpathSync(work),ownedWorkPath);assert.equal(path.dirname(ownedWorkPath),realpathSync(tmpdir()));assert(path.basename(ownedWorkPath).startsWith('canonical-workbench-'));call(['rm','-f','-v',container]);rmSync(ownedWorkPath,{recursive:true});console.log('PASS owned synthetic cluster and private fixture directory cleaned');};
 const migrate=()=>call(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=38',container,'bash','/opt/verification/migrate.sh']);
 try{
  call(['exec',container,'mkdir','-p','/opt/canonical-migrations','/opt/verification']);
  call(['cp',path.join(root,'database/canonical/migrations')+'/.',container+':/opt/canonical-migrations']);
  call(['cp',path.join(root,candidate),container+':/opt/canonical-migrations/0038_service_project_workbench.sql']);
  call(['cp',path.join(root,'database/canonical/verification/migrate.sh'),container+':/opt/verification/migrate.sh']);
  if(initialize){const initialized=migrate();assert(initialized.includes('APPLIED 0038'));assert(initialized.includes('PASS ledger=38'));console.log(initialized);
  assert(migrate().includes('SKIP 0038'));console.log('PASS migration repeat; ledger38');}
  return{container,port,nonce,work,call,sql,migrate,cleanup,version,candidateSha:createHash('sha256').update(readFileSync(candidate)).digest('hex')};
 }catch(error){cleanup();throw error;}
}
