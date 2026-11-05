export interface DashboardEvent{id:string;projectId:string;kind:string;at:string}
export interface DashboardProject{
 id:string;projectType:string;displayName:string;compass:'EDUCATION'|'IDENTITY'|'WEALTH'|'HEALTH';lifecycleStatus:string;currentStage:string;
 advisors:{principalId:string;name:string;role:string}[];nextMilestone:{id:string;title:string;targetAt:string|null}|null;
 customerActionCount:number;latestPublicEvent:DashboardEvent|null;detailPath:string;healthRestricted:boolean;
}
export interface DashboardAction{id:string;projectId:string;title:string;status:string;priority:string;dueAt:string|null;nextStatus:'IN_PROGRESS'|'COMPLETED';projectRevision:number}
export interface FamilyDashboard{
 schemaVersion:'family-os-dashboard.v1';family:{id:string;label:null};viewer:{principalId:string;label:string|null;permissions:string[]};
 metrics:{currentProjects:number;historyProjects:number;activeProjects:number;pausedProjects:number;customerActions:number};
 projects:DashboardProject[];history:DashboardProject[];nextActions:DashboardAction[];recentUpdates:DashboardEvent[];
 assessments:{availability:'NOT_CONNECTED'};generatedAt:string;validUntil:string;
}
export function familyDashboardEnabled(env:Record<string,unknown>,mode:string|undefined){return mode==='development'&&env.FAMILY_OS_DASHBOARD_ENABLED==='true'&&env.SERVICE_WORKBENCH_ENABLED==='true';}
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:unknown,k:string)=>obj(v)&&Object.keys(v).sort().join(',')===k.split(',').sort().join(',');
const id=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const text=(v:unknown)=>typeof v==='string'&&v.length<=4000;
const integer=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const event=(v:unknown)=>keys(v,'id,projectId,kind,at')&&obj(v)&&id(v.id)&&id(v.projectId)&&text(v.kind)&&date(v.at);
const array=(v:unknown,test:(row:unknown)=>boolean,max=2000)=>Array.isArray(v)&&v.length<=max&&v.every(test);
export function validFamilyDashboard(value:unknown):value is FamilyDashboard{
 if(!keys(value,'schemaVersion,family,viewer,metrics,projects,history,nextActions,recentUpdates,assessments,generatedAt,validUntil')||!obj(value)||value.schemaVersion!=='family-os-dashboard.v1')return false;
 const {family,viewer,metrics,assessments}=value;
 if(!keys(family,'id,label')||!obj(family)||!id(family.id)||family.label!==null||!keys(viewer,'principalId,label,permissions')||!obj(viewer)||!id(viewer.principalId)||viewer.label!==null&&!text(viewer.label)||!Array.isArray(viewer.permissions)||viewer.permissions.join(',')!=='AUTHORIZED_PROJECT_READ,OWN_CLIENT_TASK_TRANSITION')return false;
 if(!keys(assessments,'availability')||!obj(assessments)||assessments.availability!=='NOT_CONNECTED'||!keys(metrics,'currentProjects,historyProjects,activeProjects,pausedProjects,customerActions')||!obj(metrics)||!Object.values(metrics).every(integer))return false;
 const project=(v:unknown)=>{
  if(!keys(v,'id,projectType,displayName,compass,lifecycleStatus,currentStage,advisors,nextMilestone,customerActionCount,latestPublicEvent,detailPath,healthRestricted')||!obj(v)||!id(v.id)||!['EDUCATION','IDENTITY','WEALTH','HEALTH'].includes(String(v.compass))||!['DRAFT','PLANNED','ACTIVE','ON_HOLD','COMPLETED'].includes(String(v.lifecycleStatus)))return false;
  if(![v.projectType,v.displayName,v.currentStage].every(text)||v.detailPath!=='/my-services/'+v.id||typeof v.healthRestricted!=='boolean'||!integer(v.customerActionCount)||!array(v.advisors,a=>keys(a,'principalId,name,role')&&obj(a)&&id(a.principalId)&&text(a.name)&&text(a.role),100))return false;
  const m=v.nextMilestone;if(m!==null&&(!keys(m,'id,title,targetAt')||!obj(m)||!id(m.id)||!text(m.title)||m.targetAt!==null&&!date(m.targetAt)))return false;
  if(v.latestPublicEvent!==null&&(!event(v.latestPublicEvent)||!obj(v.latestPublicEvent)||v.latestPublicEvent.projectId!==v.id))return false;
  if(v.compass==='HEALTH'&&(v.displayName!=='HEALTH_SERVICE'||v.healthRestricted!==true||(v.advisors as unknown[]).length||v.nextMilestone!==null||v.latestPublicEvent!==null||v.customerActionCount!==0))return false;
  return v.compass==='HEALTH'||v.healthRestricted===false;
 };
 if(!array(value.projects,project,64)||!array(value.history,project,64)||!array(value.nextActions,a=>keys(a,'id,projectId,title,status,priority,dueAt,nextStatus,projectRevision')&&obj(a)&&id(a.id)&&id(a.projectId)&&text(a.title)&&['PENDING','IN_PROGRESS','BLOCKED'].includes(String(a.status))&&['URGENT','HIGH','MEDIUM','LOW'].includes(String(a.priority))&&(a.dueAt===null||date(a.dueAt))&&a.nextStatus===(a.status==='IN_PROGRESS'?'COMPLETED':'IN_PROGRESS')&&integer(a.projectRevision)&&Number(a.projectRevision)>0)||!array(value.recentUpdates,event,20))return false;
 const current=value.projects as unknown as DashboardProject[],history=value.history as unknown as DashboardProject[],actions=value.nextActions as unknown as DashboardAction[],all=[...current,...history];
 if(new Set(all.map(p=>p.id)).size!==all.length||current.some(p=>p.lifecycleStatus==='COMPLETED')||history.some(p=>p.lifecycleStatus!=='COMPLETED'))return false;
 if(metrics.currentProjects!==current.length||metrics.historyProjects!==history.length||metrics.activeProjects!==current.filter(p=>p.lifecycleStatus==='ACTIVE').length||metrics.pausedProjects!==current.filter(p=>p.lifecycleStatus==='ON_HOLD').length||metrics.customerActions!==actions.length)return false;
 if(new Set(actions.map(a=>a.id)).size!==actions.length||actions.some(a=>!current.some(p=>p.id===a.projectId&&p.lifecycleStatus==='ACTIVE'&&p.compass!=='HEALTH'))||current.some(p=>p.customerActionCount!==actions.filter(a=>a.projectId===p.id).length)||history.some(p=>p.customerActionCount!==0))return false;
 if((value.recentUpdates as DashboardEvent[]).some(e=>!all.some(p=>p.id===e.projectId&&p.compass!=='HEALTH')))return false;
 return date(value.generatedAt)&&date(value.validUntil)&&Date.parse(value.validUntil as string)-Date.parse(value.generatedAt as string)===2000&&Math.abs(Date.now()-Date.parse(value.generatedAt as string))<5000&&Date.now()<Date.parse(value.validUntil as string);
}
