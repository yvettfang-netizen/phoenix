import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
export function drillRecorder({directory,pg='N/A',phase='browser'}) {
  const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const records=[];
  const persist=()=>{if(directory){mkdirSync(directory,{recursive:true});writeFileSync(path.join(directory,`${phase}-pg${pg}.json`),JSON.stringify({application_commit_sha:sha,records},null,2)+'\n');}};
  return { records, start(id,name,injection) {
    const row={scenario_id:id,scenario_name:name,test_environment:'isolated local development; synthetic only',application_commit_sha:sha,frontend_version:sha,database_migration_version:pg==='N/A'?'N/A':'0001-0037 isolated candidate',gateway_version:sha,agent_runtime_version:'N/A: no HARMONY Runtime implemented',postgresql_version:pg,test_data_version:'family-center-v2-drill-v1',feature_flags:'explicit per-test configuration; defaults closed',fault_injection_method:injection,injected_at:new Date().toISOString(),detected_at:null,contained_at:null,recovery_started_at:null,recovered_at:null,expected_result:'fail closed and restore only the approved local synthetic scope',actual_result:null,security_assertions:[],data_integrity_result:'NOT RUN',audit_reference:null,log_reference:`${phase}-pg${pg}.json`,screenshot_or_trace_reference:'N/A: DB probe; browser probe sets its own reference',rpo_actual:'N/A: read-only application fault; database recovery separately HOLD',rto_actual:null,rollback_version:sha,test_executor:'Codex under Founder instruction',independent_reviewer:'HOLD: no independent signature',review_status:'HOLD',final_status:'NOT RUN',scope:'local mechanism only; no Staging/production attestation'};
    records.push(row);persist();return row;
  },mark(row,field){row[field]=new Date().toISOString();persist();}, finish(row,result={}) {Object.assign(row,result);if(row.recovery_started_at&&row.recovered_at)row.rto_actual={milliseconds:Date.parse(row.recovered_at)-Date.parse(row.recovery_started_at),basis:'observed local recovery interval; no approved SLA inferred'};persist();}, save() {persist();console.log('DRILL_RECORDS '+JSON.stringify(records));} };
}
const tables=['core.people','core.families','core.student_profiles','core.family_memberships','core.guardian_authorities','consent.grants','service.projects','service.project_subjects','crm.clients','crm.deals','integration.legacy_id_mappings'];
// Only the caller's labelled disposable synthetic cluster is accepted by the runner.
export function integritySnapshot(db,sql) {
  const result={};for(const table of tables){
    const raw=sql(db,`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text FROM ${table} t`);
    const rows=JSON.parse(raw);result[table]={count:rows.length,sha256:createHash('sha256').update(raw).digest('hex')};
  }
  result.ledger=sql(db,'SELECT string_agg(migration_name||\':\'||sha256,\',\' ORDER BY migration_name) FROM canonical_migrations.applied');
  return result;
}
