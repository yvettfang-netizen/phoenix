import Link from "next/link";
import styles from "./about-trust.module.css";

type Locale = "zh" | "en";

const domains = [
  ["education", "教育", "Education", "从香港升学到国际教育，协助家庭理解教育体系、课程选择、申请路径与长期成长方向。", "Explore Hong Kong and international education, curriculum choices, admissions pathways and long-term development."],
  ["identity", "身份", "Identity", "了解香港身份政策、全球居留选择及跨境生活安排的适用条件和重要节点。", "Understand eligibility, policy changes and key milestones for Hong Kong status, global residency and cross-border living."],
  ["health", "健康", "Health", "提供跨境医疗资源信息、预约及非临床服务协调。", "Access information on cross-border care, appointment coordination and non-clinical support."],
  ["wealth", "财富", "Wealth", "梳理家庭保障、财富规划与代际传承目标，按需要协调专业资源。", "Clarify family protection, wealth and succession goals, and coordinate professional resources where appropriate."],
] as const;

const stages = [
  ["了解家庭目标", "Understand the family’s goals", "了解家庭成员需求、现有条件、时间安排及长期目标。", "Clarify each family member’s needs, circumstances, timeline and long-term priorities."],
  ["明确专业路径", "Define a suitable path", "依据实际情况和可核验资料，比较适用选择，明确范围和风险。", "Compare relevant options using verifiable information, then define the scope and risks."],
  ["协调专业服务", "Coordinate professional services", "按确认方案协调服务。需要专业资格的事项由具备适当资格的人士或机构依法负责。", "Coordinate the agreed services. Matters requiring professional qualifications are handled by appropriately qualified people or institutions."],
  ["跟进重要节点", "Follow up on milestones", "按照服务约定跟进材料、进度及必要的后续事项。", "Follow up on documents, milestones and next steps within the agreed scope."],
] as const;

const trust = [
  ["真实的信息", "Verifiable information", "以可核验资料为依据，明确适用条件、时间及限制。", "Use verifiable sources and explain eligibility, timing and limitations."],
  ["清晰的服务边界", "Clear service boundaries", "正式服务前明确工作范围、费用、责任与交付节点。", "Agree on scope, fees, responsibilities and milestones before formal work begins."],
  ["尊重资料与隐私", "Respect for information and privacy", "资料收集、使用、共享及保存以适用隐私政策、服务协议和系统授权为准。", "Collection, use, sharing and retention follow the applicable privacy policy, service agreement and permissions."],
  ["审慎的专业协作", "Responsible professional coordination", "凤启提供规划、信息支持和协调。录取、身份审批、医疗诊疗、法律税务意见及投资结果由相应机构或具备资格的专业人士依法决定，不承诺结果。", "Phoenix Nova provides planning, information and coordination. Admissions, residency decisions, clinical care, legal or tax advice and investment outcomes are determined by the relevant institutions or qualified professionals. Outcomes are not guaranteed."],
] as const;

const ecosystem = [
  ["凤启罗盘", "Phoenix Compass", "介绍已开放 · 部分评估受控", "Overview available · selected assessments restricted", "从四个领域梳理家庭目标及选择。", "Explore family goals across four professional domains."],
  ["凤启家序", "Family OS", "受控预览", "Controlled preview", "支持长期服务协作与重要信息管理，实际功能以授权和开放范围为准。", "Designed for ongoing coordination and information management, subject to authorisation and availability."],
  ["凤启学苑", "Phoenix Academy", "课程介绍已开放", "Course information available", "围绕教育成长、课程与持续学习提供专业支持。", "An education ecosystem for courses, growth and continuing learning."],
  ["ASKWISE™", "ASKWISE™", "规划与探索", "In exploration", "探索智能学习辅助、思维训练及学习反馈。", "Explores intelligent learning support, thinking skills and feedback."],
] as const;

export function AboutTrustSections({ locale, wealthHref, principles }: { locale: Locale; wealthHref: string; principles: React.ReactNode }) {
  const zh = locale === "zh";
  const t = (cn: string, en: string) => zh ? cn : en;
  const href = (domain: typeof domains[number][0]) => domain === "wealth" ? wealthHref : `/${locale}/${domain}`;
  const heading = (label: string, title: string, id: string) => <header className={styles.heading}><p>{label}</p><h2 id={id}>{title}</h2></header>;
  return <div className={styles.about}>
    <section className={styles.section} id="professional-services" aria-labelledby="about-domains">
      <div className="shell">
        {heading("FOUR PROFESSIONAL DOMAINS", t("四大专业领域，服务家庭的长期成长。", "Four professional domains for long-term family growth."), "about-domains")}
        <p>{t("教育、身份、健康和财富安排相互关联。我们让不同领域的专业支持围绕共同的家庭目标协作。", "Education, residency, health and wealth decisions often affect one another. We help coordinate professional support around the same family goals.")}</p>
        <ul className={styles.grid}>{domains.map(([id, cn, en, detailCN, detailEN]) => <li key={id} className={styles.card} data-domain={id}><h3><Link href={href(id)}>{t(cn, en)}</Link></h3><p>{t(detailCN, detailEN)}</p></li>)}</ul>
      </div>
    </section>
    {principles}
    <section className={styles.section} aria-labelledby="about-process"><div className="shell">
      {heading("HOW WE WORK", t("从了解需求，到清晰规划，再到持续跟进。", "From understanding needs to planning and follow-up."), "about-process")}
      <ol className={styles.grid}>{stages.map(([cn, en, detailCN, detailEN], i) => <li className={styles.card} key={en}><span className={styles.step}>{String(i + 1).padStart(2, "0")}</span><h3>{t(cn, en)}</h3><p>{t(detailCN, detailEN)}</p></li>)}</ol>
      <p>{t("让每一步都有依据，让每一次沟通更加清晰。", "Ground each step in evidence and keep communication clear.")}</p>
    </div></section>
    <section className={styles.section} aria-labelledby="about-trust"><div className="shell">
      {heading("TRUST & PROFESSIONAL RESPONSIBILITY", t("信任，建立在真实、透明与专业责任之上。", "Trust depends on accuracy, transparency and professional responsibility."), "about-trust")}
      <ul className={styles.grid}>{trust.map(([cn, en, detailCN, detailEN]) => <li className={styles.card} key={en}><h3>{t(cn, en)}</h3><p>{t(detailCN, detailEN)}</p></li>)}</ul>
      <dl className={styles.company}>
        <div><dt>{t("品牌", "Brand")}</dt><dd>Phoenix Nova™｜凤启环球</dd></div>
        <div><dt>{t("公司主体", "Registered company name")}</dt><dd lang="zh-Hans">凤启环球信息科技（深圳）有限公司</dd></div>
        <div style={{ gridColumn: "1 / -1" }}><dt>{t("服务网络", "Our presence")}</dt><dd>{t("香港总部 · 深圳运营 · 北京代表处 · 潮州代表处", "Hong Kong Headquarters · Shenzhen Operations · Beijing Representative Office · Chaozhou Representative Office")}</dd></div>
        <div><dt>{t("定位", "Positioning")}</dt><dd>Global Family Growth Platform</dd></div>
        <div><dt>{t("核心领域", "Professional domains")}</dt><dd>{t("教育｜身份｜健康｜财富", "Education · Identity · Health · Wealth")}</dd></div>
      </dl>
    </div></section>
    <section className={styles.section} aria-labelledby="about-ecosystem"><div className="shell">
      {heading("THE PHOENIX ECOSYSTEM", t("让专业服务与长期成长建立连接。", "Connect professional guidance with long-term growth."), "about-ecosystem")}
      <ul className={styles.grid}>{ecosystem.map(([cn, en, statusCN, statusEN, detailCN, detailEN]) => <li className={styles.card} key={en}><h3>{t(cn, en)}</h3><small>{t(statusCN, statusEN)}</small><p>{t(detailCN, detailEN)}</p></li>)}</ul>
      <div className={styles.contact} id="contact">
        {heading("FOR EVERY BEGINNING.", t("每一次启程，都值得更好的未来。", "Every beginning deserves a better future."), "about-contact")}
        <p>{t("想了解服务方式、各地联络信息或商务合作？欢迎前往独立的联系我们页面。", "For service enquiries, regional contacts or partnerships, visit our dedicated Contact page.")}</p>
        <Link href={`/${locale}/contact`}>{t("联系我们 →", "Contact us →")}</Link>
      </div>
    </div></section>
  </div>;
}

const contactLocations = [
  ["HONG KONG", "香港总部", "Hong Kong Headquarters", "智富家办", "智富家办", "国际资源连接与跨境家庭服务协作。", "International resources and cross-border family service coordination."],
  ["SHENZHEN", "深圳运营", "Shenzhen Operations", "凤启环球信息科技（深圳）有限公司", "凤启环球信息科技（深圳）有限公司", "内地业务运营、数字产品与专业服务协同。", "Mainland operations, digital products and professional service coordination."],
  ["BEIJING", "北京代表处", "Beijing Representative Office", "区域联络与合作", "Regional liaison and collaboration", "连接北京及周边家庭需求与专业资源。", "Connecting local family needs with professional resources."],
  ["CHAOZHOU", "潮州代表处", "Chaozhou Representative Office", "潮汕地区服务联络", "Chaoshan regional liaison", "连接潮汕家庭、在地文化与跨境发展需求。", "Connecting Chaoshan families, local heritage and cross-border needs."],
] as const;

export function ContactSections({ locale, wealthHref }: { locale: Locale; wealthHref: string }) {
  const zh = locale === "zh";
  const t = (cn: string, en: string) => zh ? cn : en;
  const href = (domain: typeof domains[number][0]) => domain === "wealth" ? wealthHref : `/${locale}/${domain}`;
  const heading = (label: string, title: string, id: string) => <header className={styles.heading}><p>{label}</p><h2 id={id}>{title}</h2></header>;
  return <div className={styles.about}>
    <section className={styles.section} aria-labelledby="contact-network"><div className="shell">
      {heading("OUR PRESENCE", t("香港总部 · 深圳运营 · 北京代表处 · 潮州代表处", "Hong Kong Headquarters · Shenzhen Operations · Beijing & Chaozhou Representative Offices"), "contact-network")}
      <p>{t("以香港为国际资源连接枢纽，通过深圳运营及北京、潮州区域联络网络，为家庭与合作伙伴提供持续沟通。", "We connect international resources through Hong Kong, supported by Shenzhen operations and regional liaison in Beijing and Chaozhou.")}</p>
      <ul className={styles.grid}>{contactLocations.map(([city, cn, en, subtitleCN, subtitleEN, detailCN, detailEN], i) => <li className={styles.card} key={city}>
        <small>{String(i + 1).padStart(2, "0")} / {city}</small>
        <h3>{t(cn, en)}</h3>
        <p><strong>{t(subtitleCN, subtitleEN)}</strong></p>
        <p>{t(detailCN, detailEN)}</p>
      </li>)}</ul>
    </div></section>
    <section className={styles.section} aria-labelledby="contact-details"><div className="shell">
      {heading("GET IN TOUCH", t("从一次沟通，开始下一步。", "Start with a conversation."), "contact-details")}
      <div className={styles.contact} id="contact">
        <p>{t("统一联系邮箱", "Central contact email")}</p>
        <a href="mailto:nova@phoenixnova.com.cn">nova@phoenixnova.com.cn</a>
        <address style={{ fontStyle: "normal" }}>
          <p>{t("深圳办公地址：深圳市罗湖区和平路金田大厦2201-2210", "Shenzhen office: Rooms 2201–2210, Jintian Building, Heping Road, Luohu District, Shenzhen, China")}</p>
        </address>
        <p>{t("香港、北京及潮州的详细地址和电话暂未在本页公布，请先通过统一邮箱联系。", "Addresses and phone numbers for Hong Kong, Beijing and Chaozhou are not published here. Please use the central email.")}</p>
      </div>
    </div></section>
    <section className={styles.section} aria-labelledby="contact-services"><div className="shell">
      {heading("SERVICE ENQUIRIES", t("选择需要了解的服务领域。", "Explore the right service area."), "contact-services")}
      <p>{t("以下链接仅提供咨询准备信息，不会自动提交资料或预约。", "These links provide consultation preparation information only; they do not submit an enquiry or book an appointment.")}</p>
      <ul className={styles.grid}>{domains.map(([id, cn, en]) => <li key={id} className={styles.card} data-domain={id}>
        <h3><Link href={href(id).split("#")[0] + "#consultation"}>{t(cn, en)}</Link></h3>
      </li>)}</ul>
      <p><Link href={`/${locale}/about`}>{t("了解凤启环球 →", "About Phoenix Nova →")}</Link></p>
    </div></section>
  </div>;
}
