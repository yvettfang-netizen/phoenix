import {id} from '../v0038/cluster.mjs';
import {seedWorkbench} from '../v0038/fixtures.mjs';
export const aliases={'identity-only':[9,100,'FAMILY'],'dual-client':[4,100,'FAMILY'],'new-client':[5,100,'FAMILY'],'assessment-only':[6,100,'FAMILY'],'history-client':[7,100,'FAMILY']};
export function seedDashboard(db){
 const credentials=seedWorkbench(db),{sql}=db;
 for(const [person,name]of [[4,'Synthetic Dual Client'],[5,'Synthetic New Client'],[6,'Synthetic Assessment Client'],[7,'Synthetic History Client'],[8,'Synthetic Shared Minor'],[9,'Synthetic Identity Client']]){
  sql("INSERT INTO core.people(person_id,display_name)VALUES('"+id(person)+"','"+name+"');INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)VALUES('"+id(200+person)+"','"+id(person)+"','FAMILY','ACTIVE');INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)VALUES('"+id(40000+person)+"','"+id(100)+"','"+id(person)+"','MEMBER',now()-interval '1 day');INSERT INTO core.civil_capacity_history(capacity_record_id,person_id,capacity_status,evidence_ref,verified_by_principal_id)VALUES('"+id(41000+person)+"','"+id(person)+"','"+(person===8?'MINOR_VERIFIED':'ADULT_VERIFIED')+"','synthetic://p1-capacity','"+id(900)+"');");
  if([4,7].includes(person))for(const n of [10,11,12])sql("INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at)VALUES('"+id(42000+person*100+n)+"','"+id(100)+"','"+id(person===8?1:person)+"','"+id(n)+"','"+id(person)+"','EDUCATION_CASE','EDUCATION','ACTIVE',now()-interval '1 hour',now()+interval '2 days');");
 }
 sql("INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,scope,evidence_level,valid_from,valid_until)VALUES('"+id(43008)+"','"+id(100)+"','"+id(1)+"','"+id(8)+"','EDUCATION','VERIFIED',now()-interval '1 day',now()+interval '2 days');");
 // Remove B's Education fixture from the active P1 client view by revoking the
 // project subject link; no Person/Family/Client master or historical event is deleted.
 sql("UPDATE service.project_subjects SET status='ENDED',valid_until=clock_timestamp(),ended_by_principal_id='"+id(900)+"' WHERE service_project_id='"+id(312)+"';");
 for(const [project,person,domain,opened]of [[318,9,'IDENTITY',true],[319,4,'EDUCATION',true],[320,4,'IDENTITY',true],[323,7,'EDUCATION',true],[324,4,'IDENTITY',false],[325,8,'EDUCATION',true]]){
  const base=500000+project*100;
  sql("INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id)VALUES('"+id(project)+"','"+id(500)+"','"+id(100)+"','SYN_P1_"+project+"','Synthetic "+(domain==='IDENTITY'?'Hong Kong Identity':'HK Masters')+" "+project+"','ACTIVE','"+domain+"','"+id(900)+"','"+id(900)+"');INSERT INTO service.workbench_settings VALUES('"+id(project)+"','"+(domain==='EDUCATION'?'HK_MASTERS':'GENERAL')+"','Synthetic P1 authorized scope','DISCOVERY',now()+interval '7 days',1);INSERT INTO service.project_subjects(project_subject_id,service_project_id,family_id,subject_person_id,subject_role,data_scope,created_by_principal_id)VALUES('"+id(base)+"','"+id(project)+"','"+id(100)+"','"+id(person)+"','SERVICE_RECIPIENT','"+domain+"','"+id(900)+"');INSERT INTO service.project_parties(project_party_id,service_project_id,party_role,person_id,valid_from,created_by_principal_id)VALUES('"+id(base+1)+"','"+id(project)+"','CONTRACTING_PARTY','"+id(person===8?1:person)+"',now()-interval '1 hour','"+id(900)+"');");
  for(const n of [10,12])sql("INSERT INTO service.project_assignments(project_assignment_id,service_project_id,principal_id,assignment_role,status,valid_from,assigned_by_principal_id)VALUES('"+id(base+10+n)+"','"+id(project)+"','"+id(200+n)+"','"+(n===12?'PROJECT_MANAGER':'SPECIALIST')+"','ACTIVE',now()-interval '1 hour','"+id(900)+"');");
  for(const [i,kind]of (opened?['CONTRACT_SIGNED','PAYMENT_CONFIRMED','OPENING_APPROVED']:['CONTRACT_SIGNED','PAYMENT_CONFIRMED']).entries())sql("INSERT INTO service.workbench_commercial_events VALUES('"+id(base+30+i)+"','"+id(project)+"','phoenix_operations','SYN_P1_"+project+"_"+i+"','"+kind+"','SYN_P1_REFERENCE','"+'e'.repeat(64)+"',"+(i+1)+",now()-interval '1 hour',clock_timestamp(),'"+id(901)+"');");
  if(person!==7&&person!==8){
   sql("INSERT INTO service.tasks(task_id,service_project_id,task_type,task_title,task_status,priority,assigned_principal_id,due_at,created_by_principal_id,updated_by_principal_id)VALUES('"+id(base+40)+"','"+id(project)+"','WORKBENCH_ACTION','Synthetic client action "+project+"','PENDING','HIGH','"+id(200+person)+"',now()+interval '1 day','"+id(900)+"','"+id(900)+"');INSERT INTO service.workbench_task_scope VALUES('"+id(base+40)+"','"+id(person)+"','CLIENT');INSERT INTO service.project_milestones(project_milestone_id,service_project_id,milestone_code,milestone_title,status,target_at,created_by_principal_id)VALUES('"+id(base+50)+"','"+id(project)+"','SYN_P1_"+project+"','Synthetic next milestone "+project+"','PENDING',now()+interval '2 days','"+id(900)+"');");
  }
 }
 sql("UPDATE service.projects SET project_name='SYNTHETIC_HEALTH_PRIVATE_MARKER' WHERE service_project_id='"+id(314)+"';");
 return credentials;
}
export async function closeHistory(db,rt){
 const revision=Number(db.sql("SELECT revision FROM service.workbench_settings WHERE service_project_id='"+id(323)+"'"));
 const r=await rt.call('manager','projects/'+id(323)+'/commands',{kind:'PROJECT_STATUS',payload:{revision,status:'COMPLETED',reason:'SYNTHETIC_P1_HISTORY'}});if(r.status!==200)throw Error(JSON.stringify(r.body));
}
