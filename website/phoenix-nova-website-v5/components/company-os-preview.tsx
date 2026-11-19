import Link from "next/link";
import { BrandMark } from "./brand-mark";
import styles from "./company-os-preview.module.css";

export function CompanyOsPreview({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  const workspaces = [
    {
      id: "founder",
      name: zh ? "创始人驾驶舱" : "Founder Dashboard",
      label: "FOUNDER",
      description: zh ? "从全局看清经营进展，抓住需要亲自处理的关键事项。" : "See company-wide progress and the decisions that need your attention.",
      items: zh ? ["观澜台与今日三件事", "客户、渠道与服务交付摘要", "重大事项审批与风险提示"] : ["Overview and today's three priorities", "Client, channel and delivery summaries", "Key approvals and risk notices"],
      status: zh ? "待接入经营摘要与管理授权" : "Operational summaries and management access pending",
    },
    {
      id: "staff",
      name: zh ? "员工工作台" : "Staff Workspace",
      label: "STAFF",
      description: zh ? "围绕负责的客户和项目，完成交接、审核与交付。" : "Coordinate handoffs, reviews and delivery for assigned clients and projects.",
      items: zh ? ["我的客户与服务项目", "材料审核、任务与截止日期", "顾问协作与服务交接"] : ["Assigned clients and service projects", "Material reviews, tasks and deadlines", "Adviser collaboration and handoffs"],
      status: zh ? "现有服务工作台可供本机合成验收" : "Existing service workbench available for local synthetic review",
    },
    {
      id: "partner",
      name: zh ? "合作伙伴工作台" : "Partner Workspace",
      label: "PARTNER",
      description: zh ? "跟进自己负责的推荐与服务协作，及时连接总部支持。" : "Follow assigned referrals and service coordination with support from headquarters.",
      items: zh ? ["机构成员与下级合作伙伴", "学生邀请与获授权的服务进度", "渠道跟进、转介与约定结算摘要"] : ["Organisation members and partner relationships", "Student invitations and authorised service status", "Follow-ups, referrals and agreed settlement summaries"],
      status: zh ? "待接入机构账户与具体资源授权" : "Organisation accounts and resource-specific access pending",
    },
  ];

  return <main className={styles.shell} data-company-os-preview>
    <header className={styles.header}>
      <BrandMark href={`/${locale}`} />
      <nav aria-label={zh ? "平台入口" : "Platform links"}>
        <Link href={`/${locale}/family-center`}>{zh ? "家庭成长系统" : "Family OS"}</Link>
        <Link href={`/${zh ? "en" : "zh"}/company-os`} lang={zh ? "en" : "zh"}>{zh ? "EN" : "中文"}</Link>
      </nav>
    </header>
    <section className={styles.intro}>
      <p className={styles.eyebrow}>PHOENIX COMPANY OS™</p>
      <h1>{zh ? "凤启企业运营系统" : "One place to coordinate your work"}</h1>
      <p>{zh ? "让每个团队成员看见自己的责任与下一步。" : "Give every team member a clear view of their responsibilities and next steps."}</p>
      <div className={styles.notice} role="note">
        <strong>{zh ? "本机设计预览" : "Local design preview"}</strong>
        <span>{zh ? "以下为三个工作区的拟定结构。机构登录、角色授权与经营数据尚未接入；本页不展示客户资料。" : "These are proposed workspace structures. Organisation sign-in, role access and operational data are not connected. No client records are displayed here."}</span>
      </div>
    </section>
    <section className={styles.grid} aria-label={zh ? "工作区规划" : "Workspace plans"}>
      {workspaces.map((workspace) => <article key={workspace.id} className={styles.card}>
        <p className={styles.eyebrow}>{workspace.label}</p>
        <h2>{workspace.name}</h2>
        <p>{workspace.description}</p>
        <ul>{workspace.items.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className={styles.cardEnd}>
          <p className={styles.status}>{workspace.status}</p>
          {workspace.id === "staff" && <Link className={styles.action} href={`/${locale}/my-services`}>{zh ? "查看服务工作台候选" : "Review the service workbench candidate"}<span aria-hidden="true"> ↗</span></Link>}
        </div>
      </article>)}
    </section>
    <footer className={styles.footer}>
      <p>{zh ? "Family OS 连接家庭与学生；Company OS 连接总部、员工与合作伙伴。" : "Family OS connects families and students; Company OS connects headquarters, staff and partners."}</p>
      <Link href={`/${locale}`}>{zh ? "返回凤启首页" : "Back to Phoenix Nova"}</Link>
    </footer>
  </main>;
}
