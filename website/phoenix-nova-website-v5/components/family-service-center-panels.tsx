"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Bell,ShieldCheck,Sparkles,CalendarClock,ClipboardCheck,RefreshCw,LockKeyhole,ArrowRight} from "lucide-react";
import {deriveAuthorizedPanels,nextStepFromAuthorizedSummary,type AuthorizedPanelData,type PortalLocale} from "@/lib/family-service-center-panels";
import "./family-service-center-panels.css";

type Panel="access"|"updates"|"assistant";
type ViewState="loading"|"ready"|"empty"|"denied"|"unavailable"|"stale";
type Props={locale:PortalLocale;panel:Panel};
const safeStatus=(code:number):ViewState=>code===401||code===403?"denied":"unavailable";

/** One component in the EXISTING Family Center, not another portal or authority.
 * Panel state is cleared on unmount, lost visibility and authorization expiry.
 */
export function FamilyServiceCenterPanels({locale,panel}:Props){
  const en=locale==="en",t=(zh:string,english:string)=>en?english:zh;
  const [state,setState]=useState<ViewState>("loading");
  const [data,setData]=useState<AuthorizedPanelData|null>(null);
  const [retry,setRetry]=useState(0);
  const [showGuidance,setShowGuidance]=useState(false);
  useEffect(()=>{
    // Permission management has no approved customer-facing write/read API yet.
    if(panel==="access"){setData(null);setState("unavailable");return;}
    let active=true;
    const abort=new AbortController();
    let expiry:ReturnType<typeof setTimeout>|undefined;
    const clear=()=>{active=false;abort.abort();if(expiry)clearTimeout(expiry);setData(null);setState("stale");};
    const hidden=()=>{if(document.visibilityState==="hidden")clear();};
    setState("loading");setData(null);setShowGuidance(false);
    window.addEventListener("blur",clear);
    window.addEventListener("pagehide",clear);
    document.addEventListener("visibilitychange",hidden);
    void (async()=>{
      try{
        const response=await fetch("/api/family-services/summary?limit=20",{
          method:"GET",credentials:"same-origin",cache:"no-store",signal:abort.signal,
          headers:{"Accept":"application/json"}
        });
        if(!active)return;
        if(!response.ok){setState(safeStatus(response.status));return;}
        const raw:unknown=await response.json();
        if(!active)return;
        const parsed=deriveAuthorizedPanels(raw,locale);
        if(!parsed||parsed.expiresAt<=Date.now()){setState("unavailable");return;}
        setData(parsed);setState(parsed.entries.length?"ready":"empty");
        expiry=setTimeout(()=>{setData(null);setState("stale");setShowGuidance(false);},
          Math.min(Math.max(parsed.expiresAt-Date.now(),1),45_000));
      }catch{if(active)setState("unavailable");}
    })();
    return ()=>{
      active=false;abort.abort();if(expiry)clearTimeout(expiry);
      window.removeEventListener("blur",clear);
      window.removeEventListener("pagehide",clear);
      document.removeEventListener("visibilitychange",hidden);
    };
  },[panel,locale,retry]);

  const panelTitle=panel==="access"?t("共享与监护","Sharing & Guardianship"):
    panel==="updates"?t("服务通知与待办","Service Updates & To-dos"):t("家庭助理","Family Assistant");
  const panelIcon=panel==="access"?<ShieldCheck size={25}/>:panel==="updates"?<Bell size={25}/>:<Sparkles size={25}/>;
  const summaryVisible=data!==null&&data.expiresAt>Date.now()&&(state==="ready"||state==="empty");
  const guidance=summaryVisible?nextStepFromAuthorizedSummary(data,locale):null;
  return <section className="fsv-panel" data-family-unified-panel={panel}>
    <div className="fsv-heading"><div><small>PHOENIX FAMILY OS · SERVICE CENTER</small><h2>{panelTitle}</h2></div>{panelIcon}</div>
    {panel==="access"?<div className="fsv-two">
      <article className="fsv-card"><ShieldCheck size={24}/><h3>{t("我的资料与授权","My Data & Consent")}</h3>
        <p>{t("家庭成员关系不等于资料共享授权。真实授权必须由 Phoenix Core 核验本人、用途、有效期及撤销状态。","Family relationships do not grant access to private records. Phoenix Core checks the subject, purpose, expiry and revocation of every consent.")}</p>
        <div className="fsv-note"><LockKeyhole size={15}/>{t("真实授权管理尚未开放，页面不会模拟已授权或允许修改 Consent。","Live consent management is not available; this page neither invents access nor edits grants.")}</div>
        <Link href={`/${locale}/account`} className="fsv-link">{t("查看账户与安全","Account & Security")}<ArrowRight size={15}/></Link>
      </article>
      <article className="fsv-card"><ClipboardCheck size={24}/><h3>{t("监护关系核验","Guardianship Verification")}</h3>
        <p>{t("家长只能在获核实的监护身份和相应资料授权下查看未成年人的资料；其他成年成员的信息默认独立保护。","A guardian can access a minor's records only after verification and applicable consent. Other adults' records remain protected.")}</p>
        <div className="fsv-note"><LockKeyhole size={15}/>{t("关系提交与审核入口需完成独立身份验收后启用。","Relationship submission and approval require separate identity acceptance.")}</div>
        <Link href={`/${locale}/contact`} className="fsv-link">{t("联系顾问核验","Contact an Adviser")}<ArrowRight size={15}/></Link>
      </article>
    </div>:<>
      <p className="fsv-intro">{panel==="updates"?
        t("这里汇总现有授权服务项目中的待办及重要节点，不是已投递的站内或微信通知。","This summarizes tasks and milestones from your authorized services. It is not a delivered inbox or messaging history."):
        t("先提供来自已授权项目摘要的确定性待办整理；暂不连接外部 AI，也不读取原始材料。","A deterministic task organizer built from your authorized summary; no external AI calls or original documents are accessed.")}</p>
      {state==="loading"?<p className="fsv-state" role="status">{t("正在核验最新服务权限…","Checking current service authorization…")}</p>:null}
      {state==="denied"?<p className="fsv-state" role="status">{t("当前账户无权读取服务摘要，请重新登录或联系顾问。","This account is not authorized. Please sign in again or contact an adviser.")}</p>:null}
      {state==="unavailable"?<p className="fsv-state" role="status">{t("真实服务数据暂不可用，系统不会展示演示数据。","The live service summary is unavailable. No synthetic customer data will be shown.")}</p>:null}
      {state==="stale"?<p className="fsv-state" role="status">{t("授权信息需重新核验；旧内容已清除。","Authorization needs rechecking; previous data was cleared.")}</p>:null}
      {summaryVisible?<div className="fsv-source"><ShieldCheck size={16}/>{t("来源：已授权 Service Project 摘要 · 更新时间","Source: authorized Service Project summary · as of")}: {data?.asOf}</div>:null}
      {panel==="updates"&&summaryVisible?<div className="fsv-list">
        {data!.entries.length?data!.entries.map(item=><Link href={item.href} className="fsv-entry" key={item.id}>
          {item.kind==="MILESTONE"?<CalendarClock size={21}/>:<ClipboardCheck size={21}/>}
          <div><strong>{item.title}</strong><small>{item.caption} · {item.kind==="MILESTONE"?t("下一节点","Next milestone"):t("待办摘要","Action summary")}</small></div><ArrowRight size={16}/>
        </Link>):<p className="fsv-state">{t("已核验的项目摘要暂无待办或下一节点。","There are no pending tasks or milestones in the verified summary.")}</p>}
      </div>:null}
      {panel==="assistant"&&summaryVisible?<div className="fsv-assistant">
        <div className="fsv-assistant-heading"><Sparkles size={22}/><strong>{t("我的下一步 · 只读整理","My Next Step · Read-only Organizer")}</strong></div>
        <p>{t("仅使用当前已授权项目摘要，不自动修改任务、授权或申请。","Uses only the current authorized service summary. It cannot change tasks, consent or applications.")}</p>
        <button type="button" className="fsv-action" onClick={()=>setShowGuidance(true)}>{t("梳理我的下一步","Summarize my next step")}<ArrowRight size={16}/></button>
        {showGuidance&&guidance?<div className="fsv-guidance" role="status">{guidance}</div>:null}
        <small>{t("这不是 AI 问答；未来接入模型前须完成隐私、Consent 与独立安全审核。","This is not AI chat. A future model gateway requires privacy, consent and independent security review.")}</small>
      </div>:null}
      <button type="button" className="fsv-refresh" onClick={()=>{setData(null);setState("loading");setShowGuidance(false);setRetry(n=>n+1);}}>
        <RefreshCw size={16}/>{t("重新核验","Recheck authorization")}
      </button>
    </>}
  </section>;
}
