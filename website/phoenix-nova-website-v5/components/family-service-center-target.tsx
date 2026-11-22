"use client";

import {useState} from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, BookOpen, CalendarCheck, CheckCircle2, ClipboardList,
  FileCheck2, LockKeyhole, MessageCircle, ShieldCheck, Sparkles,
  UserRoundCheck, Eye, EyeOff, RotateCcw
} from "lucide-react";
import {
  availableNotices, availableTasks, canSeeLearnerData, previewAssistantAnswer,
  targetCase, type PreviewRole, type PreviewTab,
  type AssistantIntent, type PreviewLocale
} from "@/lib/family-service-center-target";
import "./family-service-center-target.css";

type Props={locale:PreviewLocale};
const chooseRole=[{id:"student",zh:"学生本人",en:"Student"},{id:"guardian",zh:"已核验家长",en:"Verified guardian"},{id:"unassigned",zh:"未授权访问者",en:"Unassigned visitor"}] as const;
const nav=[
  {id:"services",zh:"我的服务",en:"My Services",icon:ClipboardList},
  {id:"access",zh:"共享与监护",en:"Access & Guardianship",icon:ShieldCheck},
  {id:"inbox",zh:"通知中心",en:"Notifications",icon:Bell},
  {id:"assistant",zh:"家庭助理",en:"Family Assistant",icon:Sparkles}
] as const;
const prompts=[
  {id:"today",zh:"今天优先做什么？",en:"What should I do first?"},
  {id:"materials",zh:"还有什么材料要准备？",en:"Which materials are outstanding?"},
  {id:"milestone",zh:"下一个重要节点？",en:"What's the next milestone?"}
] as const;

export function FamilyServiceCenterTarget({locale}:Props){
  const en=locale==="en";
  const t=(zh:string,english:string)=>en?english:zh;
  const [tab,setTab]=useState<PreviewTab>("services");
  const [role,setRole]=useState<PreviewRole>("guardian");
  const [consentActive,setConsentActive]=useState(true);
  const [readNotices,setReadNotices]=useState<string[]>([]);
  const [answer,setAnswer]=useState<string|null>(null);
  const [intent,setIntent]=useState<AssistantIntent>("today");
  const [query,setQuery]=useState("");
  const allowed=canSeeLearnerData(role,consentActive);
  const tasks=availableTasks(role,consentActive);
  const notices=availableNotices(role,consentActive);
  const unread=notices.filter(n=>!readNotices.includes(n.id)).length;
  const requestIntent=(target:AssistantIntent)=>{
    setIntent(target);
    setAnswer(previewAssistantAnswer(target,role,consentActive,locale));
  };
  const switchRole=(target:PreviewRole)=>{
    setRole(target);setTab("services");setAnswer(null);setQuery("");setReadNotices([]);
  };
  const toggleConsent=()=>{
    setConsentActive(v=>!v);setAnswer(null);setQuery("");setReadNotices([]);
  };
  const handleQuestion=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const v=query.trim();
    if(!v)return;
    const matched:AssistantIntent=/材料|文件|document|material/i.test(v)
      ?"materials":/节点|时间|日期|deadline|milestone|when/i.test(v)?"milestone":"today";
    requestIntent(matched);
  };
  return <div className="fsc" data-family-service-center-target data-mode="synthetic-preview">
    <header className="fsc-header">
      <Link href={"/"+locale} className="fsc-brand" aria-label={t("返回凤启官网","Phoenix Nova home")}>
        <span className="fsc-brand-feather">✦</span>
        <span><strong>PHOENIX NOVA</strong><small>{t("凤启环球 · FAMILY OS","FAMILY OS · GLOBAL GROWTH")}</small></span>
      </Link>
      <div className="fsc-header-right">
        <span className="fsc-preflight">{t("合成演示 · 未连接客户数据库","Synthetic preview · No customer database")}</span>
        <Link href={"/"+(en?"zh":"en")+"/family-service-center-target"} className="fsc-language">
          {en?"中文":"English"}
        </Link>
      </div>
    </header>
    <div className="fsc-frame">
      <aside className="fsc-sidebar">
        <div className="fsc-side-heading"><span>MY FAMILY</span><h2>{t("家庭服务中心","Family Service Center")}</h2><p>{t("从每一次启程，到每一步成长","From every beginning to every milestone")}</p></div>
        <nav aria-label={t("服务中心导航","Service Center Navigation")}>
          {nav.map(n=><button type="button" key={n.id} aria-current={tab===n.id?"page":undefined}
            onClick={()=>{setTab(n.id);setAnswer(null);}}>
            <n.icon size={18}/><span>{en?n.en:n.zh}</span>{n.id==="inbox"&&unread>0?<span className="fsc-nav-count">{unread}</span>:null}
          </button>)}
        </nav>
        <div className="fsc-side-footer"><ShieldCheck size={20}/><p>{t("身份、授权和每一次访问，都应由 Phoenix Core 核验。","Identity and every access decision belong to Phoenix Core.")}</p></div>
      </aside>
      <main className="fsc-main">
        <div className="fsc-page-top"><div><p className="fsc-eyebrow">FOR EVERY BEGINNING.</p><h1>{t("我的家 · 服务中心","My Family · Service Center")}</h1><p className="fsc-lead">{t("你的服务、授权、提醒与成长计划，在同一个地方清晰呈现。","Your services, permissions, updates and next steps in one trusted place.")}</p></div><span className="fsc-mode-pill"><LockKeyhole size={14}/>{t("仅供功能验收","Preview only")}</span></div>
        <section className="fsc-context" aria-label={t("合成身份切换","Synthetic persona controls")}>
          <div><label htmlFor="fsc-role">{t("演示访问身份","Simulated role")}</label><select id="fsc-role" value={role} onChange={e=>switchRole(e.target.value as PreviewRole)}>
            {chooseRole.map(r=><option value={r.id} key={r.id}>{en?r.en:r.zh}</option>)}
          </select></div>
          <p><ShieldCheck size={17}/>{t("角色切换只模拟界面，不授予任何真实权限。","Changing roles only simulates UI; no real permissions are granted.")}</p>
        </section>

        {tab==="services"?<div className="fsc-section">
          <div className="fsc-highlight"><div><span className="fsc-kicker">{t("今天的重点","YOUR NEXT STEP")}</span><h2>{allowed?t("确认申请材料清单", "Confirm the document checklist"):t("受保护的服务摘要","Protected service summary")}</h2><p>{allowed?t("已授权服务显示的下一步。项目与日期均为合成示例。","Next action from an authorized synthetic case. All data is fictional."):t("当前角色无权查看该学生的服务资料。","This role is not entitled to view the learner's service data.")}</p></div><div className="fsc-orb"><CalendarCheck size={34}/></div></div>
          {allowed?<><div className="fsc-metrics">
            <div><span>{t("服务中项目","Active services")}</span><strong>01</strong></div>
            <div><span>{t("待处理事项","Action items")}</span><strong>{tasks.filter(v=>v.status!=="complete").length.toString().padStart(2,"0")}</strong></div>
            <div><span>{t("未读通知","Unread alerts")}</span><strong>{unread.toString().padStart(2,"0")}</strong></div>
          </div>
          <div className="fsc-card fsc-project">
            <div className="fsc-card-header"><span className="fsc-kicker">{t("我的服务 · EDUCATION","MY SERVICE · EDUCATION")}</span><span className="fsc-status"><span className="fsc-dot"/>{t("进行中 · 合成","In progress · synthetic")}</span></div>
            <div className="fsc-project-title"><div><h3>{targetCase.title[locale]}</h3><p>{targetCase.stage[locale]} · {targetCase.advisor[locale]}</p></div><BookOpen size={30}/></div>
            <div className="fsc-stage"><div className="fsc-stage-meter"><span/></div><div><span>{t("已建档","Profile")}</span><span>{t("材料准备","Documents")}</span><span>{t("顾问审核","Review")}</span><span>{t("结果跟进","Follow-up")}</span></div></div>
            <p className="fsc-source"><FileCheck2 size={16}/>{t("数据来源：合成 Service Project；仅展示结构和交互，不连接正式 API。","Source: synthetic Service Project. Layout and interactions only; no production API.")}</p>
          </div>
          <div className="fsc-two"><div className="fsc-card">
            <div className="fsc-card-header"><h3>{t("我的待办","Action items")}</h3><span className="fsc-subtle">{t("源于模拟项目","Sample project")}</span></div>
            {tasks.map((task)=><div className="fsc-task" key={task.id}><span className={"fsc-check fsc-"+task.status}>{task.status==="complete"?<CheckCircle2 size={18}/>:<span/>}</span><div><strong>{task.label[locale]}</strong><small>{task.due[locale]}</small></div><span className="fsc-task-label">{task.status==="complete"?t("已完成","Complete"):task.status==="review"?t("待确认","To confirm"):t("待办理","To do")}</span></div>)}
          </div><div className="fsc-card fsc-guidance">
            <div className="fsc-card-header"><h3>{t("安心守护","Your family, protected")}</h3><ShieldCheck size={22}/></div>
            <p>{t("监护关系与资料授权分开管理。即使是家长，也只能在有效授权范围内访问。","Guardianship and consent are separate. Parents see only what a valid grant permits.")}</p>
            <button type="button" className="fsc-inline" onClick={()=>setTab("access")}>{t("查看共享与监护","Review permissions")}<ArrowRight size={15}/></button>
          </div></div>
          </>:<div className="fsc-empty"><EyeOff size={34}/><h3>{t("无法显示此学生的服务资料","No authorized learner data")}</h3><p>{t("该角色未获授权，或监护授权已模拟撤回。重新选择学生本人可测试正常路径。","This role lacks access, or the guardian's synthetic grant was revoked. Select Student to inspect an allowed path.")}</p></div>}
        </div>:null}

        {tab==="access"?<div className="fsc-section">
          <div className="fsc-section-head"><div><span className="fsc-kicker">{t("权限控制","PERMISSION CONTROL")}</span><h2>{t("共享、监护与授权","Sharing & Guardianship")}</h2></div><ShieldCheck size={28}/></div>
          <p className="fsc-intro">{t("真实使用时，监护资料需人工核验；Consent 由 Canonical 按受益人、用途、资料类别及有效期独立检查。","Production requires verified guardianship and server-side Consent scoped to subject, purpose, data class and expiry.")}</p>
          <div className="fsc-two">
            <div className="fsc-card"><span className="fsc-kicker">{t("监护关系","GUARDIANSHIP")}</span><h3>{t("合成监护人 B","Synthetic Guardian B")}</h3><p className="fsc-description">{t("相对于合成学生 A 的监护关系已验证（仅演示数据）。","Verified relationship to Synthetic Student A (demo only).")}</p><div className="fsc-permission-row"><UserRoundCheck size={19}/><span>{t("关系状态","Relationship")}</span><strong>{t("已核验 · 合成","Verified · demo")}</strong></div><div className="fsc-permission-row"><CalendarCheck size={19}/><span>{t("期限","Validity")}</span><strong>{t("由真实服务核验","Requires live check")}</strong></div></div>
            <div className="fsc-card"><span className="fsc-kicker">{t("学习资料查看授权","LEARNING DATA CONSENT")}</span><h3>{consentActive?t("授权有效（模拟）","Access active (demo)"):t("授权已撤回（模拟）","Access revoked (demo)")}</h3><p className="fsc-description">{t("仅允许查看此合成学生的教育服务摘要；不包括医疗、财富或其他成年成员资料。","Only this synthetic learner's education service summary; excludes health, wealth and other adults.")}</p><div className="fsc-permission-row"><Eye size={19}/><span>{t("授权对象","Grantee")}</span><strong>{t("合成监护人 B","Synthetic Guardian B")}</strong></div><button type="button" className={consentActive?"fsc-danger":"fsc-outline"} onClick={toggleConsent}>{consentActive?t("模拟撤回访问权","Simulate revocation"):t("重置演示授权","Reset demo grant")}</button></div>
          </div>
          <div className="fsc-access-notice"><LockKeyhole size={20}/><p>{t("此操作只更新当前浏览器内的合成演示状态，刷新即重置。它不会修改 consent.grants、发送通知或创建真实授权。","This changes only the current page's synthetic state, resets on refresh and never modifies consent.grants, sends notices or creates real permissions.")}</p></div>
        </div>:null}

        {tab==="inbox"?<div className="fsc-section">
          <div className="fsc-section-head"><div><span className="fsc-kicker">{t("提醒与下一步","NOTIFICATIONS")}</span><h2>{t("通知中心","Notification Center")}</h2></div><Bell size={28}/></div>
          <p className="fsc-intro">{t("只展示当前角色允许看到的合成通知。真实消息发送、邮箱和微信推送尚未接入。","Only synthetic notices in this role's scope. No email, WeChat or push delivery is connected.")}</p>
          <div className="fsc-card fsc-inbox">
            {notices.map(n=><div className="fsc-notice" key={n.id}><span className={readNotices.includes(n.id)?"fsc-notice-icon read":"fsc-notice-icon"}><Bell size={18}/></span><div><strong>{n.title[locale]}</strong><p>{n.summary[locale]}</p><small>{t("来源：合成通知规则","Source: synthetic notification rule")}</small></div><button className="fsc-outline" type="button" onClick={()=>setReadNotices(ids=>ids.includes(n.id)?ids.filter(x=>x!==n.id):[...ids,n.id])}>{readNotices.includes(n.id)?t("标为未读","Mark unread"):t("标为已读","Mark read")}</button></div>)}
          </div>
          <p className="fsc-source">{t("所有已读状态仅保存在当前页面内存，不会发送到服务器。","Read state is local to this page and is never sent to the server.")}</p>
        </div>:null}

        {tab==="assistant"?<div className="fsc-section">
          <div className="fsc-section-head"><div><span className="fsc-kicker">{t("家庭智慧助手 · 目标模式","FAMILY ASSISTANT · TARGET MODE")}</span><h2>{t("下一步，我帮你理清","Your next step, made clear")}</h2></div><Sparkles size={28}/></div>
          <p className="fsc-intro">{t("目前为不调用大模型的只读规则演示；正式版须通过服务端身份、Consent 与来源核验。","This is a deterministic read-only demo with no AI model. Production requires server-side identity, Consent and source verification.")}</p>
          <div className="fsc-assistant"><div className="fsc-assistant-welcome"><div className="fsc-assistant-symbol"><Sparkles/></div><div><strong>{t("你好，这里是你的家庭服务助手。","Welcome to your Family Service Assistant.")}</strong><p>{allowed?t("我可以帮你整理当前合成项目的待办和节点。","I can summarize synthetic tasks and milestones."):t("当前角色没有学生服务数据访问权，只能显示权限提示。","This role cannot access learner data; only access guidance is available.")}</p></div></div>
          <div className="fsc-suggestions">{prompts.map(x=><button type="button" key={x.id} onClick={()=>requestIntent(x.id)} aria-pressed={intent===x.id}>{en?x.en:x.zh}<ArrowRight size={14}/></button>)}</div>
          {answer?<div className="fsc-answer" role="status"><MessageCircle size={18}/><p>{answer}</p></div>:null}
          <form onSubmit={handleQuestion} className="fsc-question"><label className="fsc-visually-hidden" htmlFor="fsc-question-input">{t("输入演示问题","Enter a sample question")}</label><input id="fsc-question-input" value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} placeholder={t("例如：我的下一步是什么？","e.g. What's next for my application?")}/><button type="submit">{t("查看只读整理","See summary")}<ArrowRight size={16}/></button></form>
          <small className="fsc-assistant-disclaimer">{t("仅识别“待办 / 材料 / 节点”三类演示意图。不会调用外部 AI、上传信息或修改服务记录。","Only three demo intents: tasks, documents, milestones. No external AI, upload or record changes.")}</small></div>
        </div>:null}
        <footer className="fsc-footer"><span>PHOENIX NOVA™ · FOR EVERY BEGINNING.</span><span>{t("此处为合成数据目标模式，正式上线须另行通过 Founder 审批。","Synthetic target mode; production release requires separate Founder approval.")}</span><button type="button" onClick={()=>{switchRole("guardian");setConsentActive(true);setTab("services");setReadNotices([]);}}><RotateCcw size={14}/>{t("重置演示","Reset preview")}</button></footer>
      </main>
    </div>
  </div>;
}
