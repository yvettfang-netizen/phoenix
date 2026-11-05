import {PoolClient} from 'pg'
import type {WorkbenchIdentity} from './service-workbench'

type Row=Record<string,unknown>
const record=(v:unknown):Row=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('DASHBOARD_CONTRACT');return v as Row}
const text=(v:unknown):string=>{if(typeof v!=='string'||v.length>4000)throw Error('DASHBOARD_CONTRACT');return v}
const rows=(v:unknown):Row[]=>{if(!Array.isArray(v)||v.length>2000)throw Error('DASHBOARD_CONTRACT');return v.map(record)}
const timestamp=(v:unknown):string=>{const s=text(v);if(!Number.isFinite(Date.parse(s)))throw Error('DASHBOARD_CONTRACT');return s}
const domains=['EDUCATION','IDENTITY','WEALTH','HEALTH']
const priority:Record<string,number>={URGENT:0,HIGH:1,MEDIUM:2,LOW:3}
const eventKinds=new Set(['MESSAGE','STAGE','TASK_CREATE','TASK_STATUS','MATERIAL_UPLOAD','MATERIAL_REVIEW','APPLICATION_CREATE','APPLICATION_UPDATE','DELIVERABLE_CREATE','DELIVERABLE_SUBMIT','DELIVERABLE_REVIEW','DELIVERABLE_ACCEPT','MILESTONE_STATUS','PROJECT_STATUS'])

/** Reads only existing P0 controlled functions under the redeemed app connection.
 * No table grant, new identity, assessment lookup, financial inference or SQL migration.
 */
export async function readFamilyDashboard(client:PoolClient,identity:WorkbenchIdentity):Promise<Row>{
 if(identity.channel!=='FAMILY')return {status:'DENY'}
 const list=async()=>{
  const r=record((await client.query('SELECT service.workbench_list() AS result')).rows[0].result)
  if(r.status!=='ALLOW')throw Error('DASHBOARD_SCOPE')
  const data=record(r.data);if(data.schemaVersion!=='service-project-list.v1')throw Error('P0_LIST_CONTRACT')
  return rows(data.items).filter(x=>x.opened===true&&x.status!=='CANCELLED')
 }
 const initial=await list();if(initial.length>64)throw Error('DASHBOARD_CAPACITY') // no silently truncated counts
 const current:Row[]=[],history:Row[]=[],actions:Row[]=[],updates:Row[]=[]
 let viewerLabel:string|null=null
 for(const item of initial){
  const projectId=text(item.id)
  const result=record((await client.query('SELECT service.workbench_snapshot($1) AS result',[projectId])).rows[0].result)
  if(result.status!=='ALLOW')return {status:'DENY'}
  const data=record(result.data),p=record(data.project),domain=text(p.domain),status=text(p.status)
  if(data.schemaVersion!=='service-workbench.v1')throw Error('P0_PROJECT_CONTRACT')
  if(p.id!==projectId||p.staff!==false||!domains.includes(domain))return {status:'DENY'}
  if(status==='CANCELLED'||p.opened!==true)return {status:'DENY'}
  const health=domain==='HEALTH',completed=status==='COMPLETED',active=status==='ACTIVE'
  const subjects=rows(data.subjects),subjectIds=new Set(subjects.map(s=>text(s.id)))
  const self=subjects.find(s=>s.id===identity.actorPersonId)
  if(self&&!health)viewerLabel=text(self.name)
  const projectActions:Row[]=[]
  // Health free-text tasks/events/milestones/team may themselves contain clinical
  // information. The ordinary family homepage never projects those fields.
  if(active&&!health)for(const task of rows(data.tasks)){
   if(task.audience!=='CLIENT'||task.assignee!==identity.principalId||!subjectIds.has(text(task.subjectId)))continue
   const state=text(task.status);if(!['PENDING','IN_PROGRESS','BLOCKED'].includes(state))continue
   const dueAt=task.dueAt===null?null:timestamp(task.dueAt),taskPriority=text(task.priority)
   if(!(taskPriority in priority))throw Error('DASHBOARD_CONTRACT')
   projectActions.push({id:text(task.id),projectId,title:text(task.title),status:state,priority:taskPriority,dueAt,
    nextStatus:state==='IN_PROGRESS'?'COMPLETED':'IN_PROGRESS',projectRevision:p.revision})
  }
  const milestones=health||completed?[]:rows(data.milestones).filter(m=>m.status==='PENDING').map(m=>({id:text(m.id),title:text(m.title),targetAt:m.targetAt===null?null:timestamp(m.targetAt)}))
  milestones.sort((a,b)=>(a.targetAt?Date.parse(a.targetAt):Infinity)-(b.targetAt?Date.parse(b.targetAt):Infinity)||a.id.localeCompare(b.id))
  const projectUpdates:Row[]=[]
  if(!health)for(const e of rows(data.events))if(eventKinds.has(text(e.kind)))projectUpdates.push({id:text(e.id),projectId,kind:text(e.kind),at:timestamp(e.at)})
  projectUpdates.sort((a,b)=>Date.parse(text(b.at))-Date.parse(text(a.at))||text(a.id).localeCompare(text(b.id)))
  const advisors=health?[]:rows(data.team).filter(a=>['PROJECT_OWNER','PROJECT_MANAGER','SPECIALIST','COORDINATOR'].includes(text(a.role))).map(a=>({principalId:text(a.principalId),name:text(a.name),role:text(a.role)}))
  const projected={id:projectId,projectType:text(p.template),displayName:health?'HEALTH_SERVICE':text(p.title),compass:domain,lifecycleStatus:status,currentStage:text(p.stage),
   advisors,nextMilestone:milestones[0]??null,customerActionCount:projectActions.length,latestPublicEvent:projectUpdates[0]??null,
   detailPath:'/my-services/'+projectId,healthRestricted:health}
  ;(completed?history:current).push(projected)
  actions.push(...projectActions);updates.push(...projectUpdates)
 }
 // Recheck list authority before releasing the aggregate. Any scope change during
 // collection refuses the entire response; no partial count or stale fallback.
 const final=await list(),ids=(items:Row[])=>items.map(x=>text(x.id)).sort().join(',')
 if(ids(initial)!==ids(final))return {status:'DENY'}
 actions.sort((a,b)=>{
  const due=(x:Row)=>x.dueAt===null?Infinity:Date.parse(text(x.dueAt))
  return due(a)-due(b)||priority[text(a.priority)]-priority[text(b.priority)]||text(a.id).localeCompare(text(b.id))
 })
 updates.sort((a,b)=>Date.parse(text(b.at))-Date.parse(text(a.at))||text(a.id).localeCompare(text(b.id)))
 const generatedAt=new Date().toISOString()
 return {status:'ALLOW',data:{schemaVersion:'family-os-dashboard.v1',family:{id:identity.familyId,label:null},
  viewer:{principalId:identity.principalId,label:viewerLabel,permissions:['AUTHORIZED_PROJECT_READ','OWN_CLIENT_TASK_TRANSITION']},
  metrics:{currentProjects:current.length,historyProjects:history.length,activeProjects:current.filter(p=>p.lifecycleStatus==='ACTIVE').length,pausedProjects:current.filter(p=>p.lifecycleStatus==='ON_HOLD').length,customerActions:actions.length},
  projects:current,history,nextActions:actions,recentUpdates:updates.slice(0,20),assessments:{availability:'NOT_CONNECTED'},
  generatedAt,validUntil:new Date(Date.parse(generatedAt)+2000).toISOString()}}
}
