import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export async function reviewConfigProbe({loadFamilyProjection,work,save,original}) {
  const file=path.join(work,'review-malformed.json');
  save(file,'{"p":CANARY}');
  let failure;
  try { await loadFamilyProjection({NODE_ENV:'test',CANONICAL_FAMILY_PROJECTION_ENABLED:'true',
    CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED:'true',CANONICAL_FAMILY_APP_CONFIG_FILE:file}); }
  catch(error){failure=error;}
  const observation={probe:'R48-01',errorName:failure?.name,status:failure?.status??null,excerptPresent:String(failure?.message).includes('CANARY')};
  console.log('REVIEW_OBSERVATION '+JSON.stringify(observation));
  if(original){assert.equal(observation.errorName,'SyntaxError');assert.equal(observation.excerptPresent,true);}
  else {assert.equal(observation.status,503);assert.equal(observation.excerptPresent,false);}
  if(!original) {
    for(const [name,text] of [['null','null'],['array','[]'],['string','"CANARY"']]){
      const invalid=path.join(work,'review-root-'+name+'.json');save(invalid,text);
      await assert.rejects(loadFamilyProjection({NODE_ENV:'test',CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_APP_CONFIG_FILE:invalid}),e=>e.status===503&&!String(e.message).includes('CANARY'));
    }
    await assert.rejects(loadFamilyProjection({NODE_ENV:'test',CANONICAL_FAMILY_PROJECTION_ENABLED:'true',CANONICAL_FAMILY_APP_CONFIG_FILE:path.join(work,'missing-PATHCANARY.json')}),e=>e.status===503&&!String(e.message).includes('PATHCANARY'));
  }
}

export async function reviewRuntimeProbes({db,sql,call,original}) {
  assert.equal((await call()).status,200); // Warm the binder and return it through DISCARD ALL.
  const getDefinition=()=>sql(db,"SELECT pg_get_functiondef('auth.issue_application_family_context_ticket(text,text,text,timestamp with time zone,uuid)'::regprocedure)");
  const definition=getDefinition();
  assert(definition.includes('BEGIN\n'));
  const guarded=definition.replace('BEGIN\n',"BEGIN\n  RAISE LOG 'REVIEW_BINDER_SETTING timeout=% reset=% pid=%', current_setting('statement_timeout'),(SELECT reset_val FROM pg_catalog.pg_settings WHERE name='statement_timeout'),pg_backend_pid();\n  IF current_setting('statement_timeout')<>'2s' THEN RAISE EXCEPTION 'SYNTHETIC_BINDER_TIMEOUT_MISSING'; END IF;\n");
  try {
    sql(db,guarded);
    const status=(await call()).status;assert.equal(status,200);
    assert.equal((await call()).status,200);
    const logs=spawnSync('docker',['logs',db.id],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});assert.equal(logs.status,0);
    const observations=[...(logs.stdout+logs.stderr).matchAll(/REVIEW_BINDER_SETTING timeout=(\S+) reset=(\S+) pid=(\d+)/g)].slice(-2).map(m=>({timeout:m[1],reset:m[2],pid:m[3]}));
    assert.equal(observations.length,2);assert(observations.every(x=>x.timeout==='2s'&&x.reset==='2000'));assert.equal(observations[0].pid,observations[1].pid);
    console.log('REVIEW_OBSERVATION '+JSON.stringify({probe:'R48-02',status,binderStartupTimeoutPreserved:true,sameBackend:observations[0].pid===observations[1].pid,observations}));
  } finally {sql(db,definition);assert.equal(getDefinition(),definition);}
  for(const grantee of ['projection_app','phoenix_canonical_projection_reader','projection_binder']) {
    try {
      sql(db,`GRANT CREATE ON SCHEMA casework TO ${grantee}`);
      assert.equal(sql(db,`SELECT has_schema_privilege('${grantee}','casework','CREATE')`),'t');
      const status=(await call()).status;
      console.log('REVIEW_OBSERVATION '+JSON.stringify({probe:'R48-03',grantee,excessiveCreateHttpStatus:status}));
      assert.equal(status,original?200:503);
    } finally {sql(db,`REVOKE CREATE ON SCHEMA casework FROM ${grantee}`);}
    try {
      sql(db,`GRANT CREATE ON DATABASE phoenix_canonical_dev TO ${grantee}`);
      assert.equal(sql(db,`SELECT has_database_privilege('${grantee}',current_database(),'CREATE')`),'t');
      const status=(await call()).status;
      console.log('REVIEW_OBSERVATION '+JSON.stringify({probe:'R48-03',grantee,excessiveDatabaseCreateHttpStatus:status}));
      assert.equal(status,original?200:503);
    } finally {sql(db,`REVOKE CREATE ON DATABASE phoenix_canonical_dev FROM ${grantee}`);}
  }
  assert.equal((await call()).status,200);
  const acl=JSON.parse(sql(db,`SELECT json_agg(row_to_json(x)) FROM (
    SELECT p.oid::regprocedure::text AS function,p.prosecdef AS security_definer,
      has_function_privilege('phoenix_canonical_projection_reader',p.oid,'EXECUTE') AS projection_execute,
      has_function_privilege('projection_binder',p.oid,'EXECUTE') AS binder_execute,
      has_function_privilege('phoenix_canonical_app',p.oid,'EXECUTE') AS old_app_execute,
      p.proconfig FROM pg_proc p WHERE p.oid IN ('core.read_family_summary()'::regprocedure,'core.list_student_summaries()'::regprocedure,
        'core.read_student_summary(text)'::regprocedure,'core.read_projection_summary(text,text)'::regprocedure,
        'integration.lookup_projection_public_id(text,uuid)'::regprocedure) ORDER BY p.proname) x`));
  assert.equal(acl.length,5);
  for(const item of acl){assert(item.security_definer);assert(!item.binder_execute&&!item.old_app_execute);assert.equal(item.projection_execute,['read_family_summary','list_student_summaries','read_student_summary'].some(n=>item.function.startsWith('core.'+n+'(')));assert(item.proconfig.some(x=>x.includes('pg_temp')));}
  console.log('REVIEW_PERMISSION_MATRIX '+JSON.stringify(acl));
  console.log(original?'PASS original fixed-SHA findings reproduced; injected grants/function restored':'PASS formal-review regression: redacted loader, preserved binder reset default, database/all-schema CREATE guard');
}
