import Link from "next/link";
import { Globe2, Leaf, ShieldCheck, UsersRound } from "lucide-react";
import { SiteFooter, SiteHeader } from "./v5-site";
import { HealthConsultation } from "./health-consultation";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";
import {
  familyStages,
  gbaValues,
  healthEntries,
  healthFaqs,
  healthHero,
  healthJourney,
  healthRegions,
  healthServices,
  healthStrengths,
  healthText,
  type HealthCopy,
} from "@/lib/health-landing-content";
import styles from "./health-landing.module.css";

const strengthIcons = { globe: Globe2, leaf: Leaf, users: UsersRound, shield: ShieldCheck } as const;

export function HealthLanding({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  const t = (copy: HealthCopy) => healthText(copy, locale);
  const enabled = healthPreviewEnabled();
  const heading = (number: string, zhEyebrow: string, enEyebrow: string, title: HealthCopy, id?: string) => (
    <div className={styles.sectionHeading}>
      <p><span>{number}</span> / {zh ? zhEyebrow : enEyebrow}</p>
      <h2 id={id}>{t(title)}</h2>
    </div>
  );

  return <div className={styles.page} lang={zh ? "zh-Hans" : "en"} data-health-landing>
    <a className={styles.skip} href="#health-main">{zh ? "跳至主要内容" : "Skip to main content"}</a>
    <SiteHeader locale={locale} page="health" appearance="v3" localized />
    <main id="health-main">
      <nav className={styles.subnav} aria-label={zh ? "健康页面导航" : "Health page navigation"}>
        <div className={styles.wrap}>
          <Link href={`/${locale}/compass`}>{zh ? "凤启罗盘" : "PHOENIX COMPASS"}</Link><span aria-hidden="true"> / </span><span>{zh ? "健康" : "HEALTH"}</span>
          <a href="#consultation">{zh ? "咨询准备" : "Prepare a conversation"} ↗</a>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="health-title">
        <div className={styles.heroImage} role="img" aria-label={zh ? "大湾区现代城市、家庭与服务协调艺术场景" : "Illustrative modern Greater Bay Area city, family and care coordination scene"} />
        <div className={`${styles.heroCopy} ${styles.wrap}`}>
          <p className={styles.eyebrow}>{t(["PHOENIX NOVA™ · 全球健康", "PHOENIX NOVA™ · GLOBAL HEALTH"])}</p>
          <p className={styles.brandName}>{t([healthHero.zh.eyebrow, healthHero.en.eyebrow])}</p>
          <h1 id="health-title">{t([healthHero.zh.title, healthHero.en.title])}</h1>
          <p className={styles.heroSubtitle}>{t([healthHero.zh.subtitle, healthHero.en.subtitle])}</p>
          <p className={styles.lead}>{t([healthHero.zh.body, healthHero.en.body])}</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={`/${locale}/health/family`}>{t(["家庭健康规划", "Family Health Planning"])} <span aria-hidden="true">↗</span></Link>
            <a className={styles.secondary} href="#services">{t(["了解跨境医疗服务", "Explore Cross-Border Medical Services"])} <span aria-hidden="true">↗</span></a>
          </div>
          <p className={styles.micro}>{t(["非临床协调支持 · 服务及预约须另行确认", "Non-clinical coordination · Services and appointments subject to confirmation"])}</p>
        </div>
      </section>

      <section className={styles.entrySection} aria-labelledby="health-entry-title">
        <div className={`${styles.section} ${styles.wrap}`}>
          <div className={styles.sectionHeading}><p><span>01</span> / {zh ? "选择您的起点" : "CHOOSE YOUR STARTING POINT"}</p><h2 id="health-entry-title">{t(["从您的需要开始。", "Start with what matters to you."])}</h2></div>
          <div className={styles.entryGrid}>
            {healthEntries.map(entry => <article className={styles.entryCard} key={entry.id}>
              <p className={styles.eyebrow}>{t(entry.label)}</p>
              <h3>{t(entry.title)}</h3>
              <p>{t(entry.body)}</p>
              <ul>{entry.points.map(point => <li key={point[1]}>{t(point)}</li>)}</ul>
              <Link className={styles.textLink} href={`/${locale}/${t(entry.href)}`}>{t(entry.cta)} <span aria-hidden="true">↗</span></Link>
            </article>)}
          </div>
        </div>
      </section>

      <section className={styles.strengthSection} aria-labelledby="health-strengths-title" data-testid="health-strengths">
        <div className={`${styles.section} ${styles.wrap}`}>
          {heading("02", "核心价值", "OUR APPROACH", ["以家庭为中心，把每一步安排得更清楚。", "Family at the centre. Every next step made clearer."], "health-strengths-title")}
          <div className={styles.strengths}>{healthStrengths.map(strength => { const Icon = strengthIcons[strength.icon]; return <article key={strength.title[1]}><span className={styles.strengthIcon} aria-hidden="true"><Icon size={29} strokeWidth={1.3} /></span><h3>{t(strength.title)}</h3><p>{t(strength.body)}</p></article>; })}</div>
        </div>
      </section>

      <section className={styles.gbaSection} id="why-phoenix" aria-labelledby="gba-values-title">
        <div className={`${styles.section} ${styles.wrap}`}>
          {heading("03", "大湾区医疗服务的选择价值", "WHY CONSIDER GREATER BAY AREA PRIVATE CARE", ["为什么选择大湾区国际化私立医疗？", "Why choose international private healthcare in the Greater Bay Area?"], "gba-values-title")}
          <p className={styles.gbaSubtitle}>{t(["汇聚深港医疗资源，兼顾专业服务、费用选择与舒适体验。", "Bringing together Hong Kong and Shenzhen resources with professional support, cost choices and a more comfortable care experience."])}</p>
          <div className={styles.gbaValues}>{gbaValues.map((value, index) => <article key={value.title[1]}><span>0{index + 1}</span><h3>{t(value.title)}</h3><p>{t(value.body)}</p></article>)}</div>
          <p className={styles.note}>{t(["不承诺更快接诊、固定低价、治疗结果、医院排名或保险赔付。具体机构、价格、时间和可用性须逐项核实。", "We do not promise faster access, fixed lower prices, treatment outcomes, provider rankings or insurance payment. Institutions, costs, timing and availability must be verified individually."])}</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap}`} id="services" aria-labelledby="services-title">
        {heading("04", "五大医疗协调服务", "FIVE COORDINATION SERVICES", ["把跨境就医安排，拆解为清晰、可沟通的每一步。", "Make cross-border care easier to understand, discuss and arrange."], "services-title")}
        <p className={styles.intro}>{t(["从医疗机构信息与预约，到翻译、在地支持及后续理赔行政协助，服务内容按家庭需要和约定范围确认。", "From provider information and appointments to interpretation, local support and claims administration, scope is confirmed around each family's needs."])}</p>
        <div className={styles.services}>{healthServices.map((service, index) => <article key={service.title[1]}>
          <div className={`${styles.serviceImage} ${styles[service.image]}`} role="img" aria-label={t(service.alt)} />
          <div className={styles.serviceBody}><span className={styles.number}>0{index + 1}</span><p className={styles.serviceEnglish}>{t(service.subtitle)}</p><h3>{t(service.title)}</h3><p>{t(service.body)}</p><a href="#consultation">{t(["了解与咨询", "Explore and prepare"])} <span aria-hidden="true">↗</span></a></div>
        </article>)}</div>
        <p className={styles.micro}>{t(["图片仅作场景示意，不代表凤启客户、医疗机构或合作关系。", "Images are illustrative and do not identify Phoenix Nova clients, providers or partnerships."])}</p>
      </section>

      <section className={styles.providerSection} id="providers" aria-labelledby="providers-title">
        <div className={`${styles.section} ${styles.wrap}`}>
          {heading("05", "大湾区医疗机构与资源中心", "GREATER BAY AREA PROVIDER HUB", ["大湾区医疗机构与资源中心", "Greater Bay Area Provider Hub"], "providers-title")}
          <p className={styles.intro}>{t(["按公开资料建立资源索引，逐项核对机构性质、服务范围和官方信息。公开收录不等于凤启签约或推荐。", "An index of public provider information, reviewed item by item for provider status, scope and official sources. A listing does not mean Phoenix Nova partnership or endorsement."])}</p>
          <div className={styles.providerGrid}>
            <article className={styles.providerCard}>
              <span className={styles.providerStatus}>{t(["资料待逐项核验 · 非凤启合作声明", "Information pending verification · Not a Phoenix Nova partnership statement"])}</span>
              <h3>{t(["深圳禾正医院", "Hyzen Hospital Shenzhen"])}</h3>
              <p>{t(["首发资源页面将说明医院公开资料、专科方向、国际患者服务及预约核实路径；具体内容以医院及主管部门最新信息为准。", "The first resource page will outline public provider information, specialties, international patient services and appointment verification. Current details must be confirmed with the provider and competent authorities."])}</p>
              <div className={styles.providerLinks}><Link className={styles.textLink} href={`/${locale}/health/providers/hyzen-hospital`}>{t(["查看禾正医院资源页", "View Hyzen Hospital resource page"])} <span aria-hidden="true">↗</span></Link><Link className={styles.textLink} href={`/${locale}/health/providers`}>{t(["浏览医疗机构中心", "Browse provider hub"])} <span aria-hidden="true">↗</span></Link></div>
            </article>
          </div>
          <p className={styles.note}>{t(["医疗机构、医生执业、英语服务、病房环境、费用、保险及出诊信息均须逐项核实；本页面不构成医疗推荐、接诊承诺或合作关系。", "Provider, clinician, language, room, cost, insurance and schedule information must be verified individually. This page is not a medical recommendation, acceptance guarantee or partnership statement."])}</p>
        </div>
      </section>

      <section className={styles.journeySection} id="cross-border-process" aria-labelledby="journey-title">
        <div className={`${styles.section} ${styles.wrap}`}>
          {heading("06", "跨境医疗六步流程", "SIX STEPS THROUGH CROSS-BORDER CARE", ["从初步咨询，到后续跟进，每一步都有清晰边界。", "From the first conversation to follow-up, every step has a clear boundary."], "journey-title")}
          <p className={styles.intro}>{t(["凤启负责已确认范围内的非临床协调；医疗机构负责接诊、医学判断及治疗；保险机构负责承保与理赔决定。", "Phoenix Nova coordinates non-clinical support within the agreed scope. Providers make clinical decisions; insurers decide coverage and claims."])}</p>
          <ol className={styles.journey}>{healthJourney.map((step, index) => <li key={step.title[1]}><details><summary><span>0{index + 1}</span><span className={styles.stepTitle}>{t(step.title)}</span><span aria-hidden="true">＋</span></summary><p>{t(step.body)}</p></details></li>)}</ol>
          <p className={styles.scopeNote}>{t(["所有费用、授权、取消和退款安排须在正式服务确认前书面核对。公开页面不接收病历、保单或身份证件。", "Confirm fees, authorisation, cancellation and refund terms in writing before formal service confirmation. This public page accepts no medical records, policies or identity documents."])}</p>
        </div>
      </section>

      <section className={styles.lifeSection} id="family-planning" data-testid="health-life-stages" aria-labelledby="family-planning-title">
        <div className={`${styles.section} ${styles.wrap}`}>
          {heading("07", "家庭健康规划", "FAMILY HEALTH PLANNING", ["不同的家庭阶段，相同的安心期待。", "Different family stages. A shared need for clarity."], "family-planning-title")}
          <p className={styles.intro}>{t(["从日常健康事务、家庭协作与成员授权出发，建立适合家庭的长期安排。", "Start with everyday arrangements, family coordination and member permissions to shape a long-term plan."])}</p>
          <div className={styles.lifeStages}>{familyStages.map((stage, index) => <article key={stage.title[1]}><div className={`${styles.lifePhoto} ${styles[stage.image]}`} role="img" aria-label={t([`${stage.title[0]}生活场景示意`, `Illustrative ${stage.title[1].toLowerCase()} lifestyle scene`])} /><div className={styles.lifeBody}><span>0{index + 1} / {zh ? "家庭阶段" : "FAMILY STAGE"}</span><h3>{t(stage.title)}</h3><p>{t(stage.body)}</p><Link href={`/${locale}/health/family`}>{t(["了解规划", "Explore planning"])} ↗</Link></div></article>)}</div>
          <Link className={styles.lifeLink} href={`/${locale}/health/family`}>{t(["进入家庭健康规划", "Enter family health planning"])} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className={styles.compassSection} id="health-compass" aria-labelledby="compass-title">
        <div className={`${styles.wrap} ${styles.compassLayout}`}>
          <div>{heading("08", "健康罗盘", "HEALTH COMPASS", ["先了解家庭需要，再规划下一步。", "Understand your needs. Then plan your next step."], "compass-title")}<p>{t(["通过14题健康安排问卷，帮助家庭整理健康事务、服务协调与支持方向。可跳过、返回修改，并在本地整理行动清单；不作诊断、医疗评分或治疗建议。", "A 14-question arrangements questionnaire to organise health matters, coordination and support directions. Skip, review and prepare a local action list. It provides no diagnosis, medical score or treatment advice."])}</p></div>
          <div className={styles.compassPanel}><span className={styles.compassSymbol} aria-hidden="true">{zh ? "北" : "N"}<br />│<br />— ◇ —<br />│</span><p>{t(["教育 · 身份 · 财富 · 健康", "EDUCATION · IDENTITY · WEALTH · HEALTH"])}</p><h3>{t(["一套评估，连接两类服务价值。", "One Compass. Two kinds of support."])}</h3>{enabled ? <Link className={styles.primary} prefetch={false} data-testid="health-landing-assessment" href={`/${locale}/compass/health`}>{t(["进入健康罗盘受控体验", "Open controlled Health Compass preview"])} ↗</Link> : <><span className={styles.closed} data-testid="health-landing-closed">{t(["健康需求评估 · 尚未开放", "Health needs assessment · Not open yet"])}</span><p>{t(["评估目前保持受控状态。您可先了解服务或准备咨询。", "The assessment remains controlled. Explore the services or prepare for a conversation first."])}</p><div className={styles.closedActions}><a href="#services">{t(["了解跨境医疗服务", "Explore cross-border care"])} ↗</a><a href="#consultation">{t(["准备咨询", "Prepare a consultation"])} ↗</a></div></>}<small>{t(["回答不自动上传，不写入客户管理系统或家庭中心。", "Answers are not automatically uploaded or saved to CRM or Family Center."])}</small></div>
        </div>
      </section>

      <section className={styles.partnerSection} id="partners" aria-labelledby="partner-title">
        <div className={`${styles.section} ${styles.wrap} ${styles.partnerGrid}`}>
          <div>{heading("09", "合作伙伴入口", "PARTNER ACCESS", ["让获准合作，从清晰边界开始。", "Authorised collaboration starts with clear boundaries."], "partner-title")}<p>{t(["合作伙伴工作台面向获准合作机构，未来可在可信身份认证后查看自己的客户、医疗协调个案、任务与结算状态。公开页面不展示合作费用、员工报酬或内部利润数据。", "The partner workspace is for authorised organisations. A future trusted sign-in may show each partner's own clients, coordination cases, tasks and settlement status. Public pages do not show commissions, staff pay or internal profit data."])}</p></div>
          <div className={styles.partnerPanel}><span className={styles.statusDot}>{t(["受控预览", "CONTROLLED PREVIEW"])}</span><h3>{t(["合作伙伴工作台", "Partner workspace"])}</h3><p>{t(["正式登录入口尚未开放，当前不查询客户记录，也不创建合作或结算数据。", "The formal sign-in is not open. This preview does not query client records or create partnership or settlement data."])}</p><button type="button" className={styles.secondary} disabled>{t(["工作台尚未开放", "Workspace not open"])} </button></div>
        </div>
      </section>

      <section className={styles.familyCenterSection} id="family-center" aria-labelledby="family-center-title">
        <div className={`${styles.section} ${styles.wrap} ${styles.familyCenterGrid}`}>
          <div>{heading("10", "家庭中心", "FAMILY CENTER", ["把获准的健康服务进度，放回家庭的长期安排。", "Keep authorised health progress within the family's long-term plan."], "family-center-title")}<p>{t(["凤启家序｜家庭中心是客户家庭的受控入口。按患者级授权，可查看健康规划、服务申请状态、预约、协调任务及后续提醒。", "Phoenix Family OS · Family Center is a controlled family entry. With patient-level authorisation, it may show planning, service status, appointments, coordination tasks and follow-up reminders."])}</p><p className={styles.micro}>{t(["家庭中心当前为受控预览，健康服务尚未接通。原始病历、理赔文件和问卷答案不会自动进入普通家庭时间轴。", "Family Center is currently a controlled preview and Health service connection is not active. Raw records, claims files and questionnaire answers are not automatically added to a general family timeline."])}</p></div>
          <div className={styles.familyCenterPanel}><ShieldCheck aria-hidden="true" size={30} /><h3>{t(["凤启家序｜家庭中心", "Phoenix Family OS · Family Center"])}</h3><p>{t(["真实入口，受控访问。", "Real route, controlled access."])}</p><Link className={styles.primary} href={`/${locale}/family-center`}>{t(["进入家庭中心", "Open Family Center"])} ↗</Link></div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.wrap} ${styles.regionsSection}`} id="regions" aria-labelledby="regions-title">
        {heading("11", "服务地区", "SERVICE REGIONS", ["连接不同地区，照顾同一份牵挂。", "Across regions. With your family in mind."], "regions-title")}
        <div className={styles.regions}>{healthRegions.map((region, index) => <article key={region[1]}><span>0{index + 1} /</span><h3>{t(region)}</h3><p>{t(index === 2 ? ["面向英国及其他海外来源客户，了解香港、深圳及大湾区就医准备；海外来源不等于就医目的地。", "For clients in the UK and other overseas regions exploring care in Hong Kong, Shenzhen and the GBA. Client origin is separate from the care destination."] : ["按目的地核实机构信息、预约条件与协调范围。", "Verify provider information, appointment conditions and scope by destination."])}</p><a href="#consultation">{t(["了解目的地安排", "Discuss your destination"])} ↗</a></article>)}</div>
        <p className={styles.note}>{t(["地区展示用于介绍协调方向，不构成机构合作或服务可用性承诺。", "Regions describe coordination interests, not confirmed partnerships or guaranteed availability."])}</p>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title"><div className={`${styles.section} ${styles.wrap} ${styles.faqLayout}`}>
        {heading("12", "常见问题", "QUESTIONS, ANSWERED", ["您关心的，先说清楚。", "Your questions. Clearly answered."], "faq-title")}
        <div>{healthFaqs.map(faq => <details key={faq.question[1]}><summary>{t(faq.question)}<span aria-hidden="true">+</span></summary><p>{t(faq.answer)}</p></details>)}</div>
      </div></section>

      <section className={styles.contactSection} id="consultation" aria-labelledby="consultation-title"><div className={`${styles.section} ${styles.wrap} ${styles.contact}`}>
        <div>{heading("13", "咨询准备", "PREPARE A CONVERSATION", ["专业连接，安心同行。", "Expert connections. Thoughtful support."], "consultation-title")}<p>{t(["从一次清晰的沟通开始，了解适合家庭的协调支持。", "Start with a clear conversation about the coordination your family needs."])}</p><p className={styles.micro}>{t(["当前为前端候选预览，正式咨询渠道尚未接通。此入口不提交预约、不接收医疗资料。", "Frontend candidate preview. A formal enquiry channel is not connected. This entry does not book or receive medical records."])}</p></div>
        <HealthConsultation locale={locale} />
      </div></section>
    </main>
    <SiteFooter locale={locale} appearance="v3" consultationPath="/health#consultation" localized />
  </div>;
}
