/** Bounded, allowlisted projection. No documents, clinical or financial fields. */
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const keys=(v:unknown,list:string)=>obj(v)&&Object.keys(v).sort().join(",")===list.split(",").sort().join(",");
const id=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const text=(v:unknown)=>typeof v==="string"&&v.length>0&&v.length<=500;
const date=(v:unknown)=>typeof v==="string"&&Number.isFinite(Date.parse(v));
export function summarySearch(url:URL):string|null{
 if([...url.searchParams.keys()].some(k=>!["limit","cursor"].includes(k))||["limit","cursor"].some(k=>url.searchParams.getAll(k).length>1))return null;
 const limit=url.searchParams.get("limit"),cursor=url.searchParams.get("cursor");
 if(limit!==null&&(!/^[1-9][0-9]?$/.test(limit)||Number(limit)>50))return null;
 if(cursor!==null){if(cursor.length>200)return null;try{const c=JSON.parse(cursor);if(!keys(c,"at,project")||!date(c.at)||!id(c.project))return null;}catch{return null;}}
 return url.search;
}
export function validFamilyServiceSummary(v:unknown):boolean{
 if(!keys(v,"schemaVersion,projects,as_of,expires_at,next_cursor")||!obj(v)||v.schemaVersion!=="service-project-summary.v1"||!date(v.as_of)||!date(v.expires_at))return false;
 const start=Date.parse(String(v.as_of)),end=Date.parse(String(v.expires_at)),now=Date.now();
 if(start>now+5000||end<=now||end<=start||end-start>61000||now-start>65000)return false;
 if(v.next_cursor!==null){if(typeof v.next_cursor!=="string")return false;const u=new URL("http://localhost");u.searchParams.set("cursor",v.next_cursor);if(summarySearch(u)===null)return false;}
 if(!Array.isArray(v.projects)||v.projects.length>50)return false;
 const seen=new Set();
 return v.projects.every(p=>{
  if(!keys(p,"service_project_id,name,compass,status,current_stage,adviser,next_milestone,customer_todo_count,overdue_count,latest_progress,detail_href")||!obj(p)||
   !id(p.service_project_id)||seen.has(p.service_project_id)||!text(p.name)||!["EDUCATION","IDENTITY","HEALTH","WEALTH"].includes(String(p.compass))||!text(p.status)||
   !["current_stage","adviser","latest_progress"].every(k=>p[k]===null||text(p[k]))||
   !["customer_todo_count","overdue_count"].every(k=>Number.isSafeInteger(p[k])&&Number(p[k])>=0)||Number(p.overdue_count)>Number(p.customer_todo_count)||
   p.detail_href!=="/en/my-services/"+p.service_project_id)return false;
  const m=p.next_milestone;
  if(m!==null&&(!keys(m,"id,title,target_at")||!obj(m)||!id(m.id)||!text(m.title)||m.target_at!==null&&!date(m.target_at)))return false;
  if(p.compass==="HEALTH"&&(p.latest_progress!==null||p.next_milestone!==null||p.customer_todo_count!==0||p.overdue_count!==0))return false;
  seen.add(p.service_project_id);return true;
 });
}
