import Link from "next/link";
import { Globe2, Leaf, UsersRound, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "./v5-site";
import { HealthConsultation } from "./health-consultation";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";
import styles from "./health-landing.module.css";

const services = [
  ["就医前评估协调", "Pre-visit coordination", "协助整理就医目标与预约所需事项，协调专业医疗机构评估；医疗判断由执业医护人员作出。", "Clarify visit goals and appointment requirements, and coordinate assessment by a medical institution. Clinical decisions remain with licensed professionals."],
  ["专业医疗翻译", "Medical interpretation", "协调就诊沟通、医疗文件翻译与语言支持，帮助双方准确理解；翻译不替代医生解释与知情同意。", "Coordinate appointment interpretation, document translation and language support. Interpretation supports, rather than replaces, clinical explanation and informed consent."],
  ["国际患者导航", "International patient navigation", "梳理跨境预约流程、科室路径与行程节点，协助联系机构，减少陌生环境中的沟通负担。", "Navigate cross-border appointments, departments and travel milestones, with help contacting institutions and understanding the next step."],
  ["在地就医礼宾", "Local care concierge", "按约定范围协调在地陪同、交通与就诊行程，为患者及同行家人提供细致的非临床支持。", "Coordinate local accompaniment, transport and visit logistics within the agreed scope, with thoughtful non-clinical support for the family."],
  ["国际保险理赔协助", "Insurance claims assistance", "协助了解材料要求、整理行政清单并跟进沟通；保障解释、承保及理赔决定由保险机构负责。", "Help clarify document requirements, organise administrative checklists and follow up on communications. Coverage and claims decisions remain with the insurer."],
] as const;
const strengths = [
  ["国际医疗资源", "International care resources", "从正规渠道出发，按目的地核实医疗机构、就诊流程与服务条件。", "Start with official channels and verify institutions, care pathways and service availability by destination."],
  ["全生命周期规划", "Planning across life stages", "关注家庭不同阶段的健康事务安排，让准备与协调持续衔接。", "Support health-related arrangements through changing family stages, connecting preparation with ongoing coordination."],
  ["专业协调陪伴", "Professional coordination", "协助整理预约、语言支持、行程与后续事项，降低跨境沟通负担。", "Coordinate appointments, language support, travel arrangements and follow-up to ease cross-border communication."],
  ["家庭健康支持", "Family-centred support", "尊重每位家庭成员的意愿与授权，让需要协作的事务更清晰。", "Respect each family member's preferences and permissions, bringing clarity to shared arrangements."],
] as const;
const strengthIcons = [Globe2, Leaf, UsersRound, ShieldCheck];
const lifeStages = [
  ["儿童青少年", "Children & teenagers", "围绕成长阶段，梳理家庭陪同、正规咨询渠道与日常健康事务安排。", "Organise family accompaniment, official consultation channels and everyday arrangements through the growing years."],
  ["成年家庭", "Adult families", "协调预约、家庭事务分工与资料授权，为不同生活阶段做好准备。", "Coordinate appointments, shared responsibilities and permissions through changing family stages."],
  ["长者照护", "Older family members", "尊重长者意愿，提前商量陪同、备用协助与持续跟进。", "Respect older relatives' wishes while discussing accompaniment, backup support and continued follow-up."],
] as const;
const reasons = [
  ["跨境医疗资源协调", "Cross-border coordination", "按目的地核实机构与流程，帮助家庭了解正规就医渠道。", "Verify institutions and processes by destination to help families understand official care channels."],
  ["清晰的服务流程", "A clear service process", "从了解需求到确认服务范围与授权，每一步都有明确的沟通节点。", "Clear communication milestones from understanding needs to confirming scope and permissions."],
  ["专业沟通与资料准备", "Communication & preparation", "协助整理预约要求、语言支持和行政清单；临床判断由专业人员负责。", "Help prepare appointments, language support and administrative checklists. Clinical decisions remain with professionals."],
  ["持续的服务跟进", "Continued support", "关注后续待办、家庭协作与安排回顾，让沟通有清晰的下一步。", "Keep follow-up tasks, family coordination and regular reviews in view, with a clear next step."],
] as const;
const faqs = [
  ["凤启是否提供诊断或治疗？", "Does Phoenix Nova diagnose or treat?", "我们提供非临床的医疗协调及礼宾支持，不提供诊断、治疗、处方或紧急医疗服务。医疗判断及治疗由相应执业医疗机构和专业人员负责。如有紧急情况，请联系所在地急救服务。", "We provide non-clinical coordination and concierge support, not diagnosis, treatment, prescriptions or emergency care. Licensed institutions and professionals make clinical decisions. For an emergency, contact local emergency services."],
  ["预约如何开始？", "How does an appointment begin?", "先了解目的地、时间与服务需要，再核对机构要求、可用时段及授权。最终预约以医疗机构确认为准；本页演示入口不发送预约申请。", "Begin with destination, timing and support needs, then confirm institutional requirements, availability and authorisation. An appointment is final only when confirmed by the institution. This page does not send booking requests."],
  ["费用如何确认？", "How are fees confirmed?", "服务范围、协调费用、第三方费用及适用的取消安排，应在确认服务前书面说明。医院诊疗、交通住宿和保险费用可能单独计费；本页不作报价或价格承诺。", "Scope, coordination fees, third-party charges and applicable cancellation terms should be set out in writing before confirmation. Medical, travel, accommodation and insurance charges may be separate. This page does not quote prices."],
  ["如何保护个人及医疗资料？", "How is information protected?", "本页咨询演示不收集个人信息或病历。Health Compass 仅在浏览器当前会话内整理回答，不自动同步 CRM。未来如需处理医疗资料，必须另行取得患者授权并通过受控渠道。", "This consultation demo collects no personal details or medical records. Health Compass keeps answers in the current browser session and does not automatically sync them to a CRM. Any future medical-data handling requires separate patient authorisation and controlled channels."],
  ["理赔协助是否保证赔付？", "Does claims assistance guarantee payment?", "不保证。我们仅提供约定范围内的行政协助。是否承保、适用条款、赔付金额及处理时限由保险机构依据保单和资料决定。", "No. Support is administrative and limited to the agreed scope. Coverage, policy terms, payment amounts and processing times are determined by the insurer from the policy and evidence."],
] as const;

export function HealthLanding({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  const t = (a: string, b: string) => zh ? a : b;
  const enabled = healthPreviewEnabled();
  const heading = (no: string, eyebrow: string, title: string, id?: string) => <div className={styles.sectionHeading}><p><span>{no}</span> / {eyebrow}</p><h2 id={id}>{title}</h2></div>;
  return <div className={styles.page} lang={zh ? "zh-Hans" : "en"} data-health-landing>
    <a className={styles.skip} href="#health-main">{t("跳至主要内容", "Skip to main content")}</a>
    <SiteHeader locale={locale} page="health" />
    <main id="health-main">
      <nav className={styles.subnav} aria-label={t("Health 页面导航", "Health page navigation")}><div className={styles.wrap}><Link href={`/${locale}/compass`}>PHOENIX COMPASS</Link><span> / </span><span>HEALTH</span><a href="#consultation">{t("咨询准备", "Plan a conversation")} ↗</a></div></nav>
      <section className={styles.hero} aria-labelledby="health-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>PHOENIX NOVA™ GLOBAL HEALTH SERVICES</p>
          <p className={styles.brandName}>{t("凤启环球｜家庭健康规划与国际医疗服务", "Family health planning · International medical services")}</p>
          <h1 id="health-title">{t("全家人的健康，\n是更远未来的起点。", "Your family's health\nis the start of a longer future.")}</h1>
          <p className={styles.heroMotto}>For Every Beginning.<br/>A Healthier Tomorrow.</p><p className={styles.lead}>{t("从家庭日常健康事务的梳理，到跨境就医时的专业协调，Phoenix Nova™ 陪伴您把重要安排看得更清楚、准备得更从容。", "From everyday family health arrangements to professional coordination for cross-border care, Phoenix Nova™ helps you see important next steps more clearly and prepare with greater confidence.")}</p>
          <div className={styles.actions}><Link className={styles.primary} href={`/${locale}/health/family`}>{t("家庭健康规划", "Family health planning")} <span aria-hidden="true">↗</span></Link><a className={styles.secondary} href="#services">{t("国际医疗服务", "International medical services")} <span aria-hidden="true">↗</span></a></div>
          <p className={styles.micro}>{t("非临床协调支持 · 服务及预约须另行确认", "Non-clinical coordination · Services and appointments subject to confirmation")}</p>
        </div>
        <div className={styles.heroImage} role="img" aria-label={t("山水、香港城市与家庭融合的艺术场景示意", "Illustrative ink-wash landscape, Hong Kong harbour and family scene")}><div className={styles.imageCaption}><span>FAMILY HEALTH · GLOBAL CARE</span><p>{t("把关心化为有序安排。", "Let thoughtful care take shape.")}</p></div></div>
      </section>
      <div className={styles.promise}><div className={styles.wrap}><span>{t("以家庭需要为起点", "Start with your family")}</span><span>{t("以专业机构为依托", "Connect with professionals")}</span><span>{t("以清晰授权为前提", "Proceed with clear authorisation")}</span></div></div>
      <section className={styles.strengthSection} aria-labelledby="health-strengths-title" data-testid="health-strengths"><div className={`${styles.section} ${styles.wrap}`}>
        {heading("01", "OUR APPROACH", t("以家庭为中心，\n把每一步安排得更清楚。", "Family at the centre.\nEvery next step made clearer."), "health-strengths-title")}
        <div className={styles.strengths}>{strengths.map(([cn,en,bodyCn,bodyEn],i)=>{const Icon = strengthIcons[i]; return <article key={en}><span className={styles.strengthIcon} aria-hidden="true"><Icon size={32} strokeWidth={1.3} /></span><h3>{t(cn,en)}</h3><p>{t(bodyCn,bodyEn)}</p></article>;})}</div>
      </div></section>
      <section className={`${styles.section} ${styles.wrap}`} id="services">
        {heading("02", "OUR SERVICES", t("我们的服务", "Our services"))}
        <p className={styles.intro}>{t("把复杂的跨境就医安排，拆解为清晰、可沟通的每一步。", "Make a complex cross-border care journey easier to understand, discuss and arrange.")}</p>
        <div className={styles.services}>{services.map(([cn,en,descCn,descEn], i) => <article key={en}>
          <div className={`${styles.serviceImage} ${styles[`photo${i + 1}`]}`} role="img" aria-label={t(`${cn}场景示意`, `Illustrative ${en.toLowerCase()} scene`)} />
          <div className={styles.serviceBody}><span className={styles.number}>0{i+1}</span><p className={styles.serviceEnglish}>{en}</p><h3>{t(cn,en)}</h3><p>{t(descCn,descEn)}</p><a href="#consultation">{t("了解与咨询", "Explore this service")} <span aria-hidden="true">↗</span></a></div>
        </article>)}</div>
        <p className={styles.micro}>{t("图片仅作艺术及生活场景示意，不代表凤启客户、所属医疗机构或合作关系。", "Illustrative stock and AI-generated imagery does not identify Phoenix Nova clients, affiliated institutions or partnerships.")}</p>
      </section>
      <section className={`${styles.section} ${styles.wrap}`} id="why-phoenix">
        {heading("03", "WHY CHOOSE PHOENIX NOVA", t("为什么选择 Phoenix Nova", "Why choose Phoenix Nova"))}
        <div className={styles.reasons}>{reasons.map(([cn,en,bodyCn,bodyEn],i)=><article key={en}><div className={`${styles.reasonPhoto} ${styles[`reasonPhoto${i+1}`]}`} role="img" aria-label={t("服务协调场景示意", "Illustrative coordination scene")} /><div><h3>{t(cn,en)}</h3><p>{t(bodyCn,bodyEn)}</p></div></article>)}</div>
      </section>
      <section className={styles.lifeSection} id="family-planning" data-testid="health-life-stages"><div className={`${styles.section} ${styles.wrap}`}>
        {heading("04", "FAMILY HEALTH PLANNING", t("家庭健康规划", "Family health planning"))}
        <p className={styles.intro}>{t("每个家庭的节奏不同。我们从日常事务、家庭协作与授权安排出发，帮助您建立适合自己的规划方式。", "Every family moves at its own pace. Start with everyday arrangements, shared responsibilities and permissions to shape a planning approach that suits yours.")}</p>
        <div className={styles.lifeStages}>{lifeStages.map(([cn,en,bodyCn,bodyEn],i)=><article key={en}><div className={`${styles.lifePhoto} ${styles[`lifePhoto${i+1}`]}`} role="img" aria-label={t(`${cn}生活场景示意`, `Illustrative ${en.toLowerCase()} lifestyle scene`)} /><div className={styles.lifeBody}><span>0{i+1} / FAMILY JOURNEY</span><h3>{t(cn,en)}</h3><p>{t(bodyCn,bodyEn)}</p><Link href={`/${locale}/health/family`}>{t("了解规划", "Explore planning")} ↗</Link></div></article>)}</div>
        <Link className={styles.lifeLink} href={`/${locale}/health/family`}>{t("进入家庭健康规划", "Explore family health planning")} <span aria-hidden="true">↗</span></Link>
      </div></section>
      <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="health-goals" data-testid="health-goals">
        <div className={styles.sectionHeading}><p>CHOOSE YOUR STARTING POINT</p><h2 id="health-goals">{t("从您的需要开始。", "Start with what matters to you.")}</h2></div>
        <div className={styles.goalEntries}>
          <Link href={`/${locale}/health/family`}><small>01 / FAMILY HEALTH</small><h3>{t("家庭健康规划", "Family health planning")}</h3><p>{t("把就医渠道、事务分工、资料授权与持续跟进，放进同一张长期安排地图。", "Bring care channels, shared responsibilities, permissions and follow-up into one long-term arrangement map.")}</p><span>{t("了解六大规划方向", "Explore six planning directions")} ↗</span></Link>
          <a href="#services"><small>02 / GLOBAL HEALTH SERVICES</small><h3>{t("国际医疗服务", "International medical services")}</h3><p>{t("直接了解就医协调、翻译、导航、礼宾及理赔行政支持，无需先完成评估。", "Explore coordination, interpretation, navigation, concierge and claims support directly. No assessment is required.")}</p><span>{t("查看服务与自愿咨询", "Explore services and voluntary consultation")} ↗</span></a>
          <Link href={`/${locale}/health/family#integrated-support`}><small>03 / BOTH, TOGETHER</small><h3>{t("两者兼顾", "Both, together")}</h3><p>{t("先梳理家庭日常安排，再按实际需要了解跨境医疗支持；始终只用同一套14题。", "Organise everyday family arrangements and explore cross-border support when needed, with the same 14-question Compass.")}</p><span>{t("了解规划与服务如何衔接", "Connect planning with services")} ↗</span></Link>
        </div>
      </section>
      <section className={styles.compassSection} id="health-compass"><div className={`${styles.wrap} ${styles.compassLayout}`}>
        <div>{heading("05", "HEALTH COMPASS", t("先整理需要，\n再从容启程。", "Understand your needs.\nThen plan your next step."))}<p>{t("14题健康安排问卷，帮助整理您希望了解的支持方向。可跳过、返回修改，并在本地整理行动清单；不作诊断、医疗评分或治疗建议。", "A 14-question arrangements questionnaire to organise the support you wish to explore. Skip questions, review answers and prepare a local action list. It provides no diagnosis, medical score or treatment advice.")}</p></div>
        <div className={styles.compassPanel}><span className={styles.compassSymbol} aria-hidden="true">N<br/>│<br/>— ◇ —<br/>│</span><p>EDUCATION · IDENTITY · WEALTH · <strong>HEALTH</strong></p><h3>{t("四大罗盘，平级同行。", "Four equal perspectives.")}</h3>
          {enabled ? <Link className={styles.primary} prefetch={false} data-testid="health-landing-assessment" href={`/${locale}/compass/health`}>{t("进入健康罗盘受控体验", "Open controlled Health Compass preview")} ↗</Link> : <><span className={styles.closed} data-testid="health-landing-closed">{t("健康需求评估 · 尚未开放", "Health needs assessment · Not open yet")}</span><p>{t("评估目前保持受控状态。您可先了解服务或准备咨询。", "The assessment remains controlled. Explore the services or prepare for a conversation first.")}</p></>}
          <small>{t("回答不自动上传，不写入 CRM 或家庭中心。", "Answers are not automatically uploaded or saved to CRM or Family Center.")}</small>
        </div>
      </div></section>
      <details className={styles.moreDetails}><summary>{t("服务地区、安排流程与常见问题", "Regions, arrangements and common questions")} <span aria-hidden="true">＋</span></summary>
      <section className={`${styles.section} ${styles.wrap}`} id="regions">{heading("06", "GLOBAL REACH", t("连接不同地区，\n照顾同一份牵挂。", "Across regions.\nWith your family in mind."))}
        <div className={styles.regions}>{[["香港","Hong Kong","跨境预约与在地支持","Cross-border appointments and local support"],["中国内地","Mainland China","就医行程与语言协调","Visit logistics and language coordination"],["英国","United Kingdom","国际患者路径与安排","International patient pathways"],["其他国际地区","Other destinations","按目的地核实服务条件","Destination-specific availability checks"]].map(([cn,en,a,b],i)=><article key={en}><span>0{i+1} /</span><h3>{t(cn,en)}</h3><p>{t(a,b)}</p><a href="#consultation">{t("了解目的地安排", "Discuss your destination")} ↗</a></article>)}</div>
        <p className={styles.note}>{t("本区域展示用于介绍协调方向，不构成机构合作或服务可用性承诺。具体机构、服务范围与时间安排须逐项核实。", "These regions describe coordination interests, not confirmed institutional partnerships or guaranteed availability. Institutions, scope and timing must be verified individually.")}</p>
      </section>
      <section className={styles.processSection}><div className={`${styles.section} ${styles.wrap}`}>{heading("07", "YOUR JOURNEY", t("每一步，都清晰可依。", "Clarity at every step."))}<ol className={styles.steps}>{[["了解需求","Understand needs"],["协调方案","Coordinate a plan"],["确认服务及授权","Confirm scope & consent"],["医疗安排与跟进","Arrange & follow up"],["后续支持","Continued support"]].map(([cn,en],i)=><li key={en}><span>0{i+1}</span><h3>{t(cn,en)}</h3></li>)}</ol></div></section>
      <section className={`${styles.section} ${styles.wrap} ${styles.audience}`}>{heading("08", "FOR YOUR FAMILY", t("无论身在何处，\n让支持更贴近。", "Wherever life takes you,\nkeep support close."))}<ul>{[["海外华人及跨境家庭","Overseas Chinese and cross-border families"],["国际就医协调需求人士","People seeking international care coordination"],["医疗翻译及陪同需求人士","People needing interpretation or accompaniment"],["国际保险理赔行政协助需求家庭","Families seeking international claims administration support"]].map(([cn,en],i)=><li key={en}><span>0{i+1}</span>{t(cn,en)}</li>)}</ul></section>
      <section className={styles.faqSection}><div className={`${styles.section} ${styles.wrap} ${styles.faqLayout}`}>{heading("09", "QUESTIONS, ANSWERED", t("您关心的，\n先说清楚。", "Your questions.\nClearly answered."))}<div>{faqs.map(([cn,en,a,b])=><details key={en}><summary>{t(cn,en)}<span aria-hidden="true">+</span></summary><p>{t(a,b)}</p></details>)}</div></div></section>
      </details>
      <section className={styles.contactSection} id="consultation"><div className={`${styles.section} ${styles.wrap} ${styles.contact}`}><div>{heading("10", "LET’S BEGIN", t("专业连接，安心同行。", "Expert connections. Thoughtful support."))}<p>{t("从一次清晰的沟通开始，了解适合您的协调支持。", "Start with a clear conversation about the coordination your family needs.")}</p><p className={styles.micro}>{t("当前为前端候选预览，正式咨询渠道尚未接通。", "Frontend candidate preview. A formal enquiry channel is not yet connected.")}</p></div><HealthConsultation locale={locale} /></div></section>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
