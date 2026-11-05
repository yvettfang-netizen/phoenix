export interface ServiceProjectListItem{id:string;title:string;domain:string;status:string;stage:string;opened:boolean;template:string}
export interface WorkbenchSnapshot{
 schemaVersion:"service-workbench.v1";
 project:ServiceProjectListItem&{code:string;scope:string;revision:number;staff:boolean;write:boolean;manage:boolean;clinicalEnabled:false;viewerPrincipalId:string};
 subjects:{id:string;name:string;principalId:string|null;documentsAllowed:boolean}[];
 team:{principalId:string;name:string;role:string}[];
 milestones:{id:string;title:string;status:string;targetAt:string|null}[];
 tasks:{id:string;title:string;status:string;priority:string;dueAt:string|null;assignee:string;subjectId:string;audience:string}[];
 applications:{id:string;subjectId:string;institutionId:string;programId:string;institution:string;program:string;status:string;year:number;round:string;deadlineAt:string|null;submittedAt:string|null;reference:string|null;interviewRequired:boolean;requirements:string;outcome:string;offerVersionId:string|null;depositDueAt:string|null;depositReference:string|null}[];
 materials:{documentId:string;versionId:string;version:number;kind:string;subjectId:string;status:string;reviewNote:string;submittedBy:string;mime:string;createdAt:string}[];
 deliverables:{id:string;kind:string;status:string;versionId:string;round:number;dueAt:string|null;createdBy:string;updatedBy:string;reviewedBy:string|null}[];
 messages:{id:string;body:string;audience:string;subjectId:string;at:string;author:string}[];
 events:{id:string;kind:string;at:string;fromStatus:string|null;toStatus:string|null;outcome:string|null;actor:string|null;compensatesEventId:string|null}[];
 commercial:{availability:string;events?:{kind:string;reference:string;source:string;at:string}[]}
}
export interface CatalogueItem{institutionId:string;institution:string;programId:string;program:string}

const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object"&&!Array.isArray(x);
const keys=(x:unknown,list:string)=>object(x)&&Object.keys(x).sort().join(",")===list.split(",").sort().join(",");
const uuid=(x:unknown)=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const rows=(x:unknown,fields:string)=>Array.isArray(x)&&x.length<=2000&&x.every(r=>keys(r,fields));
const text=(x:unknown)=>typeof x==="string"&&x.length<=4000;
const domains=["EDUCATION","IDENTITY","WEALTH","HEALTH"];
const bools=new Set(["opened","staff","write","manage","clinicalEnabled","documentsAllowed","interviewRequired"]);
const ids=new Set(["id","principalId","assignee","subjectId","institutionId","programId","documentId","versionId","submittedBy","createdBy","updatedBy","reviewedBy","viewerPrincipalId","eventId","applicationId","taskId","messageId","deliverableId","compensatesEventId","offerVersionId"]);
const nullableIds=new Set(["principalId","reviewedBy","compensatesEventId","offerVersionId"]);
const nullableText=new Set(["reference","depositReference","actor","fromStatus","toStatus","outcome","previousOutcome"]);
const dates=new Set(["targetAt","dueAt","deadlineAt","submittedAt","depositDueAt","createdAt","at"]);
// Allowlisted keys are insufficient: an object hidden inside an allowed text field
// must never become a browser projection after an upstream/schema mismatch.
function typedScalars(value:unknown):boolean{
 return object(value)&&Object.entries(value).every(([key,v])=>{
  if(bools.has(key))return typeof v==="boolean";
  if(ids.has(key))return uuid(v)||v===null&&nullableIds.has(key);
  if(dates.has(key))return v===null&&!["createdAt","at"].includes(key)||typeof v==="string"&&Number.isFinite(Date.parse(v));
  if(["revision","version","year"].includes(key))return Number.isSafeInteger(v)&&Number(v)>0;
  if(key==="round")return text(v)||Number.isSafeInteger(v)&&Number(v)>=0;
  return text(v)||v===null&&nullableText.has(key);
 });
}
export function validWorkbenchResponse(resource:string,value:unknown):boolean{
 if(!object(value))return false;
 if(resource==="projects")return keys(value,"schemaVersion,items")&&value.schemaVersion==="service-project-list.v1"&&rows(value.items,"id,title,domain,status,stage,opened,template")&&(value.items as Record<string,unknown>[]).every(r=>typedScalars(r)&&domains.includes(String(r.domain)));
 if(resource==="catalogue")return keys(value,"items")&&rows(value.items,"institutionId,institution,programId,program")&&(value.items as unknown[]).every(typedScalars);
 if(resource.endsWith("/commands")||resource.endsWith("/materials"))return keys(value,"status,result,replayed")&&value.status==="ALLOW"&&typeof value.replayed==="boolean"&&object(value.result)&&typedScalars(value.result)&&uuid(value.result.eventId)&&Number.isSafeInteger(value.result.revision)&&Object.keys(value.result).every(k=>["revision","eventId","applicationId","taskId","documentId","versionId","messageId","deliverableId","fromStatus","toStatus","action","outcome","previousOutcome","compensatesEventId","compensationReason"].includes(k));
 if(!keys(value,"schemaVersion,project,subjects,team,milestones,tasks,applications,materials,deliverables,messages,events,commercial")||value.schemaVersion!=="service-workbench.v1")return false;
 if(!keys(value.project,"id,code,title,domain,status,stage,scope,template,revision,opened,staff,write,manage,clinicalEnabled,viewerPrincipalId"))return false;
 const p=value.project as Record<string,unknown>;
 if(!typedScalars(p)||!domains.includes(String(p.domain))||!uuid(p.id)||p.id!==resource.split("/")[1]||!uuid(p.viewerPrincipalId)||!Number.isInteger(p.revision)||Number(p.revision)<1||typeof p.title!=="string"||p.clinicalEnabled!==false||
  !["opened","staff","write","manage"].every(k=>typeof p[k]==="boolean"))return false;
 const structures:Record<string,string>={subjects:"id,name,principalId,documentsAllowed",team:"principalId,name,role",milestones:"id,title,status,targetAt",tasks:"id,title,status,priority,dueAt,assignee,subjectId,audience",
  applications:"id,subjectId,institutionId,programId,institution,program,status,year,round,deadlineAt,submittedAt,reference,interviewRequired,requirements,outcome,offerVersionId,depositDueAt,depositReference",
  materials:"documentId,versionId,version,kind,subjectId,status,reviewNote,submittedBy,mime,createdAt",deliverables:"id,kind,status,versionId,round,dueAt,createdBy,updatedBy,reviewedBy",
  messages:"id,body,audience,subjectId,at,author",events:"id,kind,at,fromStatus,toStatus,outcome,actor,compensatesEventId"};
 if(!Object.entries(structures).every(([k,fields])=>rows(value[k],fields)&&(value[k] as unknown[]).every(typedScalars)))return false;
 if(p.domain==="HEALTH"&&["materials","deliverables","messages","applications"].some(k=>(value[k] as unknown[]).length>0))return false;
 const c=value.commercial;if(!object(c))return false;
 if(c.availability==="NOT_AUTHORIZED")return keys(c,"availability");
 return c.availability==="SOURCE_REFERENCES_ONLY"&&keys(c,"availability,events")&&rows(c.events,"kind,reference,source,at")&&(c.events as unknown[]).every(typedScalars);
}
