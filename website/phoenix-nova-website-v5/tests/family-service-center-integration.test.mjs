import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {deriveAuthorizedPanels,nextStepFromAuthorizedSummary} from "../lib/family-service-center-panels.ts";
const center=readFileSync(new URL("../components/family-center-v2.tsx",import.meta.url),"utf8");
const extras=readFileSync(new URL("../components/family-service-center-panels.tsx",import.meta.url),"utf8");
const id="01920000-0000-7000-8000-000000000136";
const id2="01920000-0000-7000-8000-000000000137";
function project(projectId,compass="EDUCATION"){
 return {service_project_id:projectId,name:"Synthetic authorized service",compass,status:"ACTIVE",
 current_stage:"MATERIALS",adviser:null,next_milestone:compass==="HEALTH"?null:{
  id:"01920000-0000-7000-8000-000000000139",title:"Confirm document list",target_at:null
 },customer_todo_count:compass==="HEALTH"?0:2,overdue_count:0,
 latest_progress:null,detail_href:"/en/my-services/"+projectId};
}
function summary(){return {schemaVersion:"service-project-summary.v1",
 projects:[project(id)],as_of:new Date().toISOString(),
 expires_at:new Date(Date.now()+50000).toISOString(),next_cursor:null};}

test("one canonical Family Center retains the existing Service Project summary and old preview",()=>{
 assert.match(center,/p1AccountWorkbench\?<FamilyServiceOverview locale=\{locale\}\/>/);
 assert.match(center,/p1AccountWorkbench&&\(view==='access'\|\|view==='updates'\|\|view==='assistant'\)/);
 assert.match(center,/FamilyServiceCenterPanels key=.*locale=\{locale\} panel=\{view\}/);
 assert.match(center,/!p1AccountWorkbench&&<div className="fc-lower">/);
 assert.doesNotMatch(center,/FamilyServiceCenterTarget|synthetic-preview/);
});

test("only allowlisted authenticated BFF summary produces task and milestone views",()=>{
 const v=deriveAuthorizedPanels(summary(),"zh");
 assert(v);
 assert.equal(v.todoTotal,2);
 assert.equal(v.entries.length,2);
 assert.deepEqual(v.entries.map(x=>x.href),Array(2).fill("/zh/my-services/"+id));
 assert.match(nextStepFromAuthorizedSummary(v,"zh"),/已授权的项目摘要/);
 assert.match(nextStepFromAuthorizedSummary(v,"en"),/authorized project summary/);
 const broken=summary();broken.projects[0].patient="private";assert.equal(deriveAuthorizedPanels(broken,"zh"),null);
 const stale=summary();stale.expires_at=new Date(Date.now()-1000).toISOString();
 assert.equal(deriveAuthorizedPanels(stale,"zh"),null);
});

test("no private Health progress or extra fields surface in service updates",()=>{
 const p=summary();p.projects=[project(id),project(id2,"HEALTH")];
 const v=deriveAuthorizedPanels(p,"en");
 assert(v);
 assert.equal(v.entries.some(e=>e.projectId===id2),false);
 assert.equal(v.todoTotal,2);
 assert.equal(v.projectsCount,2);
 assert.equal(v.entries.every(e=>!e.href.startsWith("http")),true);
});

test("revocation, stale session and failed API cannot expose old cached data or automatic writes",()=>{
 assert.match(extras,/valid|deriveAuthorizedPanels\(raw,locale\)/);
 assert.match(extras,/credentials:"same-origin",cache:"no-store"/);
 assert.match(extras,/new AbortController\(\)/);
 assert.match(extras,/window\.addEventListener\("blur",clear\)/);
 assert.match(extras,/window\.addEventListener\("pagehide",clear\)/);
 assert.match(extras,/document\.addEventListener\("visibilitychange",hidden\)/);
 assert.match(extras,/setData\(null\);setState\("stale"\)/);
 assert.match(extras,/response\.status/);
 assert.match(extras,/code===401\|\|code===403/);
 assert.match(extras,/45_000/);
 assert.doesNotMatch(extras,/localStorage|sessionStorage|setItem\(|sendBeacon/);
 assert.doesNotMatch(extras,/auth\.issue_context_ticket|consent\.create_grant|consent\.withdraw_grant|OPENAI_API_KEY/);
});

test("permissions and guardianship never claim active consent or simulate mutations",()=>{
 assert.match(extras,/真实授权管理尚未开放/);
 assert.match(extras,/Relationship/);
 assert.match(extras,/This is not AI chat/);
 assert.match(extras,/not a delivered inbox/);
 assert.match(extras,/fsv-source/);
 const v=deriveAuthorizedPanels(summary(),"zh");assert(v);
 assert.equal(nextStepFromAuthorizedSummary({...v,expiresAt:0},"zh"),null);
});
