import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,cpSync} from 'node:fs';
import path from 'node:path';
import {createCluster,protect} from './cluster.mjs';

const schemas="'auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service'";
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function objectInventory(root,prefix=''){
 return readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(x=>x.isDirectory()?objectInventory(root,path.join(prefix,x.name)):[{path:path.join(prefix,x.name).replaceAll('\\','/'),sha256:hash(path.join(root,prefix,x.name))}]).sort((a,b)=>a.path.localeCompare(b.path));
}
export function fingerprint(db){
 const tables=db.sql(`SELECT schemaname||'.'||tablename FROM pg_tables WHERE schemaname IN (${schemas}) ORDER BY 1`).split('\n');
 return {ledger:db.sql('SELECT row_to_json(t) FROM canonical_migrations.applied t ORDER BY migration_name'),
 policies:db.sql(`SELECT row_to_json(t) FROM (SELECT * FROM pg_policies WHERE schemaname IN (${schemas}) ORDER BY schemaname,tablename,policyname)t`),
 tables:tables.map(table=>({table,...JSON.parse(db.sql(`SELECT json_build_object('count',count(*),'digest',md5(coalesce(string_agg(j,E'\\n' ORDER BY j),''))) FROM (SELECT row_to_json(t)::text j FROM ${table} t)s`))}))};
}
export function migrationFaults(db){
 const original='/opt/canonical-migrations/0038_service_project_workbench.sql';
 db.call(['exec',db.container,'bash','-c',`cp ${original} /tmp/workbench-original.sql; printf '\n-- synthetic drift\n' >> ${original}`]);
 try{assert.throws(()=>db.migrate(),/failed/);}finally{db.call(['exec',db.container,'cp','/tmp/workbench-original.sql',original]);}
 const before=db.sql('SELECT count(*) FROM canonical_migrations.applied');
 const fixture=path.join(db.work,'0039_synthetic_atomic_probe.sql');
 writeFileSync(fixture,'BEGIN;\nCREATE SCHEMA workbench_atomic_probe;\nSELECT 1/0;\nCOMMIT;\n');
 db.call(['cp',fixture,db.container+':/opt/canonical-migrations/0039_synthetic_atomic_probe.sql']);
 try{assert.throws(()=>db.call(['exec','-e','CANONICAL_EXPECTED_MIGRATIONS=39',db.container,'bash','/opt/verification/migrate.sh']),/failed/);
 assert.equal(db.sql("SELECT count(*) FROM pg_namespace WHERE nspname='workbench_atomic_probe'"),'0');assert.equal(db.sql('SELECT count(*) FROM canonical_migrations.applied'),before);
 }finally{db.call(['exec',db.container,'rm','/opt/canonical-migrations/0039_synthetic_atomic_probe.sql']);}
 assert(db.migrate().includes('SKIP 0038'));console.log('PASS drift refusal, atomic DDL/ledger rollback, repeat after recovery');
}
export async function restoreFresh(source,objectsRoot){
 const started=new Date().toISOString(),password=randomBytes(32).toString('hex');
 source.sql("CREATE ROLE workbench_backup LOGIN INHERIT BYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '"+password+"';GRANT pg_read_all_data TO workbench_backup;GRANT CONNECT ON DATABASE phoenix_canonical_dev TO workbench_backup;");
 const pass=path.join(source.work,'backup.pgpass');writeFileSync(pass,'127.0.0.1:5432:*:workbench_backup:'+password+'\n',{mode:0o600});protect(pass);
 source.call(['cp',pass,source.container+':/tmp/workbench-backup.pgpass']);source.call(['exec',source.container,'chmod','600','/tmp/workbench-backup.pgpass']);
 const snapshot=fingerprint(source),objects=objectInventory(objectsRoot),commands=[];
 for(const [program,args]of [['pg_dump',['-d','phoenix_canonical_dev','-Fc','-f','/tmp/workbench.dump']],['pg_dumpall',['--roles-only','--no-role-passwords','-f','/tmp/workbench-roles.sql']]]){
  const argv=['exec','-e','PGPASSFILE=/tmp/workbench-backup.pgpass',source.container,program,'-h','127.0.0.1','-U','workbench_backup',...args];
  const output=source.call(argv);commands.push({command:['docker',...argv],output,exitCode:0});
 }
 const dump=path.join(source.work,'workbench.dump'),roles=path.join(source.work,'roles.sql');
 source.call(['cp',source.container+':/tmp/workbench.dump',dump]);source.call(['cp',source.container+':/tmp/workbench-roles.sql',roles]);
 const manifest={archive:hash(dump),roles:hash(roles),objects};
 const integrity=(file,expected)=>assert.equal(hash(file),expected,'BACKUP_INTEGRITY_REFUSED');
 const tampered=path.join(source.work,'tampered.dump'),bytes=Buffer.from(readFileSync(dump));bytes[0]^=1;writeFileSync(tampered,bytes,{mode:0o600});
 assert.throws(()=>integrity(tampered,manifest.archive),/BACKUP_INTEGRITY_REFUSED/);
 const restored=await createCluster(source.version,{initialize:false});
 try{
  assert.equal(restored.sql('SELECT count(*) FROM pg_tables WHERE schemaname NOT IN (\'pg_catalog\',\'information_schema\')'),'0');
  integrity(dump,manifest.archive);integrity(roles,manifest.roles);
  restored.sql(readFileSync(roles,'utf8').replace(/^CREATE ROLE phoenix_bootstrap;\r?\n/m,''));
  restored.call(['cp',dump,restored.container+':/tmp/workbench.dump']);
  const argv=['exec','-e','PGPASSFILE=/tmp/canonical-premerge.pgpass',restored.container,'pg_restore','--exit-on-error','--no-owner','-h','127.0.0.1','-U','phoenix_bootstrap','-d','phoenix_canonical_dev','/tmp/workbench.dump'];
  commands.push({command:['docker',...argv],output:restored.call(argv),exitCode:0});
  assert.deepEqual(fingerprint(restored),snapshot);assert.equal(snapshot.tables.length,100);assert.equal(restored.sql('SELECT count(*) FROM canonical_migrations.applied'),'38');
  cpSync(objectsRoot,path.join(restored.work,'objects'),{recursive:true,errorOnExist:true});assert.deepEqual(objectInventory(path.join(restored.work,'objects')),objects);
  restored.sql('ALTER ROLE workbench_backup NOLOGIN;');
  console.log('PASS dedicated backup LOGIN, unsigned manifest tamper refusal, empty-cluster role bootstrap and exact ledger/table/audit/policy/object restore');
  return {db:restored,record:{started,finished:new Date().toISOString(),manifest,snapshot,commands,status:'PASS',scope:'Synthetic logical restore; unsigned manifest detects accidental changes, not a malicious rewrite of both archive and manifest. WAL/PITR and approved RPO/RTO remain HOLD.'}};
 }catch(error){restored.cleanup();throw error;}
}
