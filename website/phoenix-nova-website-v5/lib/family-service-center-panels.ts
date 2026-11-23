import {validFamilyServiceSummary} from "./family-service-summary";

export type PortalLocale="zh"|"en";
export type PanelEntry={
  id:string;
  projectId:string;
  title:string;
  caption:string;
  href:string;
  kind:"ACTION_REQUIRED"|"MILESTONE";
};
export type AuthorizedPanelData={
  entries:PanelEntry[];
  asOf:string;
  expiresAt:number;
  projectsCount:number;
  todoTotal:number;
};

/** The only source of personalized cards is the validated, authorized P1 BFF DTO.
 * These are derived SERVICE UPDATES, not a durable notification inbox.
 * No local role selection, synthetic persona, direct DB query or unreviewed
 * Consent mutation may be added to this function.
 */
export function deriveAuthorizedPanels(value:unknown,locale:PortalLocale):AuthorizedPanelData|null {
  if(!validFamilyServiceSummary(value))return null;
  const s=value as {
    as_of:string;expires_at:string;
    projects:Array<{service_project_id:string;name:string;compass:string;
      status:string;customer_todo_count:number;next_milestone:{title:string;target_at:string|null}|null}>;
  };
  const entries:PanelEntry[]=[];
  let total=0;
  for(const p of s.projects){
    // The existing BFF contract denies sensitive Health progress and
    // intentionally excludes documents, raw scores and identity details.
    if(p.compass==="HEALTH")continue;
    total+=p.customer_todo_count;
    const href="/"+locale+"/my-services/"+p.service_project_id;
    if(p.customer_todo_count>0)entries.push({
      id:p.service_project_id+":todo",projectId:p.service_project_id,
      title:locale==="zh"?"有 "+p.customer_todo_count+" 项待办理事项":"You have "+p.customer_todo_count+" action items",
      caption:p.name,href,kind:"ACTION_REQUIRED"
    });
    if(p.next_milestone!==null)entries.push({
      id:p.service_project_id+":milestone",projectId:p.service_project_id,
      title:p.next_milestone.title,caption:p.name,href,kind:"MILESTONE"
    });
  }
  return {entries:entries.slice(0,40),asOf:s.as_of,
    expiresAt:Date.parse(s.expires_at),projectsCount:s.projects.length,todoTotal:total};
}

/** Deterministic, read-only task organizer. Never a model call or advice. */
export function nextStepFromAuthorizedSummary(source:AuthorizedPanelData|null,locale:PortalLocale):string|null {
  if(!source||source.expiresAt<=Date.now())return null;
  const first=source.entries.find(e=>e.kind==="ACTION_REQUIRED")??source.entries[0];
  if(!first)return locale==="zh"
    ?"当前已核验服务摘要中没有待办或下一节点。请在「我的服务」中查看最新状态。"
    :"There are no pending actions or milestones in the verified summary. Check My Services for updates.";
  return locale==="zh"
    ?`根据当前已授权的项目摘要，「${first.caption}」需要关注：${first.title}。请进入「我的服务」核对，日期和正式决定以顾问确认内容为准。`
    :`Your authorized project summary shows “${first.caption}”: ${first.title}. Open My Services to verify the next step and any adviser-confirmed dates.`;
}
