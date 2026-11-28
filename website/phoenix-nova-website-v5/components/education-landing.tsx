import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Globe2, UsersRound, Gem, TrendingUp, Route, GraduationCap, BrainCircuit, CalendarDays, ShieldCheck, Layers, Check, LockKeyhole } from "lucide-react";
import { SiteHeader, SiteFooter, type Locale } from "./v5-site";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { EducationConsultation } from "./education-consultation";
import { LearningCourseCatalog } from "./learning-course-catalog";
import { educationServices, educationValues, compassPresentation, learningSteps, type EducationCopy } from "@/lib/education-content";
import styles from "./education-landing.module.css";

const icons = { globe: Globe2, book: BookOpen, users: UsersRound, gem: Gem, growth: TrendingUp };
const Arrow = () => <ArrowUpRight aria-hidden="true" size={17} />;
const educationStages = [
  { route: "education/kindergarten", cn: "幼儿园教育规划", en: "Kindergarten planning", cnBody: "从早期成长与兴趣出发，建立适合家庭的启蒙方向。", enBody: "Start with early development and interests to shape a path that fits the family." },
  { route: "education/primary-schools", cn: "小学教育规划", en: "Primary school planning", cnBody: "了解课程体系、学校环境与孩子的学习节奏。", enBody: "Understand curricula, school environments and the learner’s pace." },
  { route: "education/secondary-schools", cn: "中学教育规划", en: "Secondary school planning", cnBody: "围绕学术基础、兴趣发展与未来选择提前准备。", enBody: "Prepare around academic foundations, interests and future choices." },
  { route: "education/hong-kong-universities", cn: "香港高校规划", en: "Hong Kong university planning", cnBody: "梳理香港高校、专业方向与申请准备的重点。", enBody: "Clarify Hong Kong universities, subject directions and application preparation." },
  { route: "education/subdegrees", cn: "副学士及高等文凭", en: "Sub-degree pathways", cnBody: "探索副学士及高等文凭等衔接路径与成长选择。", enBody: "Explore sub-degree pathways and options for the next stage of growth." },
  { route: "education/postgraduate", cn: "研究生及专业进阶", en: "Postgraduate planning", cnBody: "从学术背景与职业目标出发，规划研究生阶段。", enBody: "Plan postgraduate study from academic context and professional goals." },
  { route: "education/global", cn: "全球升学与流动", en: "Global education pathways", cnBody: "比较不同国家和地区的教育目的地与发展方向。", enBody: "Compare education destinations and development directions across regions." },
  { route: "education/academy", cn: "凤启学苑｜启明堂", en: "Phoenix Academy · Qiming Hall", cnBody: "连接课程、导师与长期学习支持，能力入口待开放。", enBody: "Connect courses, tutors and continuing learning support; access awaits confirmation." },
] as const;
const educationPricingPackages = [
  {
    id: "primary",
    name: ["香港小学入学／插班标准套餐", "Hong Kong Primary School · Standard"],
    price: ["¥39,980", "RMB 39,980"],
    description: ["适合拟赴港读小一或申请小学插班的家庭；按子女资格、学校类别和年级规划。", "For families considering Primary One entry or a transfer; eligibility, school type and year level are reviewed first."],
    features: [
      ["资格、校网及学校类别评估", "Eligibility, school-net and school-type review"],
      ["最多10所学校的选校比较；按适用机制指导申请", "Compare up to 10 schools; application guidance follows each applicable route"],
      ["官津小一派位按教育局制度办理；直资／私立申请按校方规定", "Government/aided Primary One allocation follows EDB rules; DSS/private applications follow individual schools"],
    ],
  },
  {
    id: "research",
    name: ["博士 PhD／DBA 进阶规划", "PhD / DBA · Research Pathways"],
    price: ["评估后书面报价", "Written quote after assessment"],
    description: ["按照研究方向、申请类型及实际交付范围确定服务。", "Fees are tailored to research interests, programme type and deliverables."],
    features: [
      ["研究定位、学术背景与申请路径评估", "Research positioning, academic profile and admissions review"],
      ["导师沟通和材料支持按合同范围执行", "Supervisor outreach and materials support as contracted"],
    ],
  },
] as const;

export function EducationLanding({ locale, catalogPreviewEnabled = false, freeAssessmentEnabled = false }: { locale: Locale; catalogPreviewEnabled?: boolean; freeAssessmentEnabled?: boolean }) {
  const zh = locale === "zh";
  const t = (cn: string, en: string) => zh ? cn : en;
  const copy = (value: EducationCopy) => value[zh ? 0 : 1];
  return <div className={styles.page} lang={zh ? "zh-CN" : "en"} data-education-landing>
    <a className={styles.skipLink} href="#education-main">{t("跳至正文", "Skip to content")}</a>
    <SiteHeader locale={locale} page="education" appearance="v3" />
    <main id="education-main">
      <section className={styles.hero} aria-labelledby="education-title">
        <Image src="/images/education-v3/education-hero.png" alt={t("国际校园中带着书本探索未来的学生示意场景", "An illustrative student exploring an international campus with her books")} className={styles.heroImage} fill priority unoptimized sizes="100vw" />
        <div className={styles.heroInner}><div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t("教育规划", "EDUCATION")}</p><p className={styles.columnLabel}>{t("全球教育规划", "GLOBAL EDUCATION PLANNING")}</p>
          <h1 id="education-title">{t("全球教育规划", "Global Education Planning")}</h1>
          <p className={styles.heroSubtitle}>{t("让每一个孩子，看见更广阔的世界。", "From kindergarten to university, from Hong Kong to the world, plan a growth path that fits each family.")}</p>
          <p className={styles.heroBody}>{t("我们整合全球优质教育资源，结合专业规划与智能工具，为每个家庭提供从升学规划、课程学习到海外发展的全程支持，帮助孩子在不同成长阶段找到适合自己的方向。", "We connect global education resources with professional planning and intelligent tools, supporting families from admissions planning and course learning to overseas development, so every learner can find a direction suited to their stage of growth.")}</p>
          <div className={styles.actions}><Button asChild className={styles.primaryButton}><a href="#education-packages">{t("本科／硕士申请 ¥19,800 起 · 查看套餐", "Undergraduate / master's applications from RMB 19,800 · View packages")}<Arrow /></a></Button><Button type="button" disabled variant="outline" className={styles.secondaryButton} aria-describedby="education-assessment-status">{t("开始教育评估 · 暂未开放", "Start Education Assessment · Not open yet")}<Arrow /></Button><Button asChild variant="outline" className={styles.secondaryButton}><Link href={`/${locale}/education/schools`}>{t("浏览学校与课程", "Browse schools and curricula")}<Arrow /></Link></Button><Button asChild variant="outline" className={styles.secondaryButton}><a href="#consultation">{t("预约专业顾问", "Prepare an advisor consultation")}<Arrow /></a></Button></div>
        </div></div>
        <span className={styles.imageCaption}>{t("品牌场景示意 · 非真实学生或院校合作案例", "Illustrative scene · Not a student case or institutional partnership")}</span>
      </section>

      <section className={styles.stageSection} id="education-pathways" aria-labelledby="pathways-title"><div className={styles.container}>
        <header className={styles.stageHeader}><div><p className={styles.eyebrow}>{t("教育成长路径", "EDUCATION PATHWAYS")}</p><h2 id="pathways-title">{t("按成长阶段，找到适合的教育路径。", "Education pathways for every stage of growth.")}</h2><p className={styles.small}>{t("从早期启蒙到研究生阶段，先了解方向，再选择下一步。", "From early learning to postgraduate study, understand the direction before choosing the next step.")}</p></div></header>
        <div className={styles.stageGrid}>{educationStages.map((stage, index) => <Link key={stage.route} className={styles.stageCard} href={`/${locale}/${stage.route}`}><span className={styles.stageNumber}>0{index + 1}</span><h3>{t(stage.cn, stage.en)}</h3><p>{t(stage.cnBody, stage.enBody)}</p><Arrow /></Link>)}</div>
        <div className={`${styles.actions} ${styles.stageActions}`}><Button type="button" disabled className={styles.primaryButton} aria-describedby="education-assessment-status">{t("开始教育规划评估", "Start Education Assessment")}<Arrow /></Button><Button asChild variant="outline" className={styles.secondaryButton}><Link href={`/${locale}/education/schools`}>{t("浏览学校方向", "Browse school pathways")}<Arrow /></Link></Button><Button asChild variant="outline" className={styles.secondaryButton}><a href="#consultation">{t("准备本地教育咨询", "Prepare a local consultation")}<Arrow /></a></Button></div>
        <p id="education-assessment-status" className={styles.small}>{t("正式教育评估入口尚未开放。您可以浏览教育方向或直接准备咨询，无需先完成评估。", "The official education assessment entry is not open yet. Browse education pathways or prepare a consultation directly without completing an assessment first.")}</p>
      </div></section>

      <section className={styles.valuesSection} aria-labelledby="values-title"><div className={styles.container}><h2 id="values-title" className={styles.srOnly}>{t("让教育规划与成长同行。", "Planning that grows with the learner.")}</h2><div className={styles.values}>{educationValues.map(value => { const Icon = icons[value.icon]; return <article key={value.icon} data-testid="education-value"><Icon aria-hidden="true" strokeWidth={1.2} /><div><h3>{copy(value.title)}</h3><p>{copy(value.body)}</p></div></article>; })}</div></div></section>

      <section className={styles.section} id="education-services" aria-labelledby="services-title"><div className={styles.container}>
        <header className={styles.sectionHeading}><div><p className={styles.eyebrow}>{t("全球教育专业服务", "OUR EDUCATION SERVICES")}</p><h2 id="services-title">{t("一站式全球教育规划服务", "Connected global education planning")}</h2><p>{t("从启蒙到升学，从学业到未来发展，为每个家庭提供全周期教育支持。", "From early learning to admissions and future development, support shaped around each family’s education journey.")}</p></div><a className={styles.textLink} href="#education-compass">{t("先看清方向", "Find your direction")}<Arrow /></a></header>
        <div className={styles.serviceGrid}>{educationServices.map((service, index) => <Card key={service.id} className={styles.serviceCard} data-testid="education-service"><div className={styles.serviceImage}><Image src={service.image} alt={copy(service.alt)} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" /></div><CardContent className={styles.serviceContent}><span className={styles.number}>0{index + 1}</span><h3>{copy(service.title)}</h3><p>{copy(service.body)}</p><details><summary>{t("了解更多", "Learn more")}<Arrow /></summary><div><p>{copy(service.detail)}</p><a href="#consultation">{t("准备教育咨询", "Prepare a consultation")} ↗</a></div></details></CardContent></Card>)}</div>
        <p className={styles.small}>{t("实际服务以约定范围为准，不承诺学校录取、考试成绩或升学结果。", "Actual services depend on agreed scope. Admission, examination scores and education outcomes are not guaranteed.")}</p>
      </div></section>

      <section className={`${styles.section} ${styles.pricingSection}`} id="education-packages" aria-labelledby="education-packages-title"><div className={styles.container}>
        <header className={styles.pricingIntro}>
          <p className={styles.eyebrow}>{t("透明服务收费", "TRANSPARENT SERVICE PRICING")}</p>
          <h2 id="education-packages-title">{t("升学服务套餐与参考价格", "Education service packages & reference fees")}</h2>
          <p>{t("先了解不同服务层级，再根据学业背景、目标院校与实际需求确定方案。统一标准价格对应不同阶段的服务范围，具体以书面方案为准。价格以人民币计。", "Compare service levels first, then select a suitable proposal based on your background, university goals and actual needs. All amounts are in CNY (RMB).")}</p>
        </header>
        <section className={styles.gaokaoSection} aria-labelledby="gaokao-pricing-title" data-testid="gaokao-pricing">
          <div className={styles.gaokaoHero} id="education-package-gaokao-hk-undergraduate" data-testid="education-pricing-package">
            <div><p className={styles.gaokaoKicker}>{t("2027 本科多元升学 · 全国统一收费", "2027 undergraduate pathways · Nationwide standard fees")}</p>
              <h3 id="gaokao-pricing-title">{t("高考之后，不止一条升学路。", "More than one path after Gaokao.")}</h3>
              <p>{t("内地高考报读香港本科 · 香港启航计划 · 香港4所院校申请", "Mainland Gaokao to Hong Kong undergraduate study · Hong Kong Launch · 4 Hong Kong institutions")}</p>
              <a className={styles.gaokaoHeroAction} href="#consultation">{t("了解香港升学方案", "Explore Hong Kong admissions")}<Arrow /></a>
            </div>
            <div className={styles.gaokaoHeroPrice}><span>{t("人民币服务费", "Service fee in RMB")}</span><strong>{t("¥19,800", "RMB 19,800")}</strong><span>{t("起 · 4所院校", "From · 4 institutions")}</span></div>
          </div>
          <div className={styles.gaokaoChoices}>
            <article className={styles.gaokaoPlan} id="education-package-gaokao-dual" data-testid="gaokao-plan-b">
              <p className={styles.gaokaoLabel}>{t("PLAN B · 标准方案", "PLAN B · STANDARD")}</p>
              <h3>{t("双轨升学计划", "Dual Pathways")}</h3><p className={styles.pricingPrice}>{t("¥39,800", "RMB 39,800")}</p>
              <p className={styles.gaokaoCount}>{t("6所院校", "6 institutions")}</p>
              <ul className={styles.pricingFeatures}><li><Check size={16} aria-hidden="true" />{t("香港本科4所", "4 Hong Kong institutions")}</li><li><Check size={16} aria-hidden="true" />{t("内地综合评价招生2所", "2 mainland comprehensive-evaluation institutions")}</li></ul>
              <p>{t("兼顾香港与内地升学机会。", "Combine Hong Kong and mainland admissions pathways.")}</p>
              <a className={styles.pricingAction} href="#consultation">{t("了解双轨方案", "Explore dual pathways")}<Arrow /></a>
            </article>
            <article className={`${styles.gaokaoPlan} ${styles.gaokaoRecommended}`} id="education-package-gaokao-gba" data-testid="gaokao-plan-c">
              <p className={styles.gaokaoLabel}>{t("PLAN C · 重点推荐", "PLAN C · RECOMMENDED")}</p>
              <h3>{t("港澳菁英计划", "Hong Kong–Macao Elite")}</h3><p className={styles.pricingPrice}>{t("¥49,800", "RMB 49,800")}</p>
              <p className={styles.gaokaoCount}>{t("10所院校", "10 institutions")}</p>
              <ul className={styles.pricingFeatures}><li><Check size={16} aria-hidden="true" />{t("香港本科4所", "4 Hong Kong institutions")}</li><li><Check size={16} aria-hidden="true" />{t("澳门本科4所", "4 Macao institutions")}</li><li><Check size={16} aria-hidden="true" />{t("内地综合评价招生2所", "2 mainland comprehensive-evaluation institutions")}</li></ul>
              <p>{t("港澳与内地三轨并行。", "Three pathways across Hong Kong, Macao and mainland China.")}</p>
              <a className={styles.pricingAction} href="#consultation">{t("了解港澳菁英方案", "Explore the Elite plan")}<Arrow /></a>
            </article>
          </div>
          <article className={styles.gaokaoReference} id="education-package-gaokao-global" data-testid="gaokao-plan-d">
            <div><p className={styles.gaokaoLabel}>{t("本科 · 国际申请组合", "UNDERGRADUATE · INTERNATIONAL PACKAGE")}</p><h3>{t("全球菁英计划", "Global Elite")}</h3><p>{t("16所院校：香港4所、澳门4所、英国／美国／澳大利亚任选两国，每国4所；不含内地综评。", "16 institutions: 4 Hong Kong, 4 Macao, plus 4 each in any two of the UK, US and Australia; no mainland comprehensive evaluation.")}</p></div>
            <div className={styles.gaokaoReferencePrice}><span>{t("国际组合服务费", "International package fee")}</span><strong>{t("¥69,800", "RMB 69,800")}</strong></div>
          </article>
          <a className={styles.textLink} href="#education-package-tailored">{t("本科名校定制及特殊招生路径 · ¥100,000起", "Undergraduate bespoke and alternative admissions routes · From RMB 100,000")}<Arrow /></a>
          <p className={styles.small}>{t("本科升学套餐实行全国统一服务收费，含升学定位、材料及文书指导、申请进度、面试及择校指导；按适用情况提供签证与入学指导。院校额度按学校计，具体专业数量与服务范围以书面合同为准。内地综评及各境外院校须先核对报考资格、申请时间及官方招生规则；不保证录取。", "Undergraduate packages have standard nationwide service fees and cover admissions planning, document and essay guidance, application tracking, interview and offer selection guidance, plus visa and enrolment guidance where applicable. Institution quotas are counted by institution; programme limits and deliverables are contracted in writing. Eligibility, deadlines and official admissions rules must be checked for every pathway. Admission is not guaranteed.")}</p>
        </section>
        <section className={styles.gaokaoSection} id="education-masters-pricing" aria-labelledby="masters-pricing-title" data-testid="masters-pricing">
          <div className={styles.gaokaoHero} id="education-package-masters-launch" data-testid="masters-plan-a">
            <div><p className={styles.gaokaoKicker}>{t("2027 硕士升学 · 全国统一收费", "2027 master's admissions · Nationwide standard fees")}</p>
              <h3 id="masters-pricing-title">{t("硕士启航计划", "Master's Launch")}</h3>
              <p>{t("本科双证 · 常规硕士申请 · 最多4所院校、8个专业申请项目", "Standard master's applications for eligible degree holders · up to 4 institutions and 8 programme applications")}</p>
              <div className={styles.mastersRefund} data-testid="masters-refund-a"><span>{t("未获合同约定录取，扣除8,000元服务费", "If no contract-agreed admission is obtained, RMB 8,000 is retained")}</span><b>{t("退还 ¥11,800", "Refund RMB 11,800")}</b></div>
              <a className={styles.gaokaoHeroAction} href="#consultation">{t("了解硕士申请方案", "Explore master's applications")}<Arrow /></a>
            </div>
            <div className={styles.gaokaoHeroPrice}><span>{t("人民币服务费", "Service fee in RMB")}</span><strong>{t("¥19,800", "RMB 19,800")}</strong><span>{t("4所院校 · 8个专业以内", "Up to 4 institutions · 8 programmes")}</span></div>
          </div>
          <div className={styles.gaokaoChoices}>
            <article className={`${styles.gaokaoPlan} ${styles.gaokaoRecommended}`} id="education-package-masters-standard" data-testid="masters-plan-b">
              <p className={styles.gaokaoLabel}>{t("PLAN B · 重点推荐", "PLAN B · RECOMMENDED")}</p>
              <h3>{t("硕士优才计划", "Master's Premium")}</h3><p className={styles.pricingPrice}>{t("¥39,800", "RMB 39,800")}</p>
              <p className={styles.gaokaoCount}>{t("最多6所院校、12个专业申请项目", "Up to 6 institutions and 12 programme applications")}</p>
              <ul className={styles.pricingFeatures}>{[["个性化院校与专业定位", "Tailored institution and programme shortlist"], ["多院校组合申请及定制文书", "Multi-institution applications and tailored documents"], ["专项面试指导与全程申请跟进", "Focused interview guidance and application tracking"], ["录取分析及入学指导", "Offer analysis and enrolment guidance"]].map(([cn,en])=><li key={en}><Check size={16} aria-hidden="true" />{t(cn,en)}</li>)}</ul>
              <div className={styles.mastersRefund} data-testid="masters-refund-b"><span>{t("未获合同约定录取，仅扣除3,000元服务费", "If no contract-agreed admission is obtained, only RMB 3,000 is retained")}</span><b>{t("退还 ¥36,800", "Refund RMB 36,800")}</b></div>
              <a className={styles.pricingAction} href="#consultation">{t("了解优才方案", "Explore the Premium plan")}<Arrow /></a>
            </article>
            <article className={styles.gaokaoPlan} id="education-package-masters-vip" data-testid="masters-plan-c">
              <p className={styles.gaokaoLabel}>{t("PLAN C · 高端进阶", "PLAN C · ELITE")}</p>
              <h3>{t("硕士菁英计划", "Master's Elite")}</h3><p className={styles.pricingPrice}>{t("¥80,000", "RMB 80,000")}</p>
              <p className={styles.gaokaoCount}>{t("高竞争力院校申请", "Competitive university applications")}</p>
              <ul className={styles.pricingFeatures}>{[["名校冲刺策略与深度背景规划", "Competitive admissions strategy and in-depth profile planning"], ["高阶申请文书定制", "Advanced tailored application documents"], ["强化面试辅导与资深顾问跟进", "Enhanced interview guidance and senior adviser follow-up"]].map(([cn,en])=><li key={en}><Check size={16} aria-hidden="true" />{t(cn,en)}</li>)}</ul>
              <div className={styles.mastersRefund} data-testid="masters-refund-c"><span>{t("未获合同约定录取", "If no contract-agreed admission is obtained")}</span><b>{t("服务费全额退还", "Full service-fee refund")}</b></div>
              <a className={styles.pricingAction} href="#consultation">{t("了解菁英方案", "Explore the Elite plan")}<Arrow /></a>
            </article>
          </div>
          <aside className={styles.mastersRiskNote} aria-label={t("凤启升学风险共担机制", "Phoenix Nova admissions risk-sharing")} data-testid="masters-risk-sharing"><h3>{t("凤启升学风险共担机制", "Phoenix Nova admissions risk-sharing")}</h3><p>{t("与家庭共同承担升学申请的不确定性。退款保障仅适用于符合书面合同条件且未获合同约定录取的硕士申请；目标院校、专业、申请周期、条件录取认定、双方配合义务及退款期限须在签约前明确。院校报名费等第三方费用不属于上述服务费退款。退款保障不等于保证录取。", "We share the uncertainty of admissions with families. Refund protection applies to master's applications meeting the written contract terms where no contract-agreed admission is obtained. Agree target institutions and programmes, cycle, treatment of conditional offers, cooperation obligations and refund timelines before signing. Third-party charges such as institutional application fees are outside these service-fee refunds. Refund protection is not a guarantee of admission.")}</p></aside>
          <a className={styles.textLink} href="#education-package-tailored">{t("硕士名校定制及复杂背景申请 · ¥100,000起", "Master’s bespoke and complex applications · From RMB 100,000")}<Arrow /></a>
          <p className={styles.small}>{t("本科双证指毕业证及学位证；境外学历按院校认可的等效资格核验。高端套餐具体专业数量、背景规划范围、交付及退款条款以书面合同为准；实际科研、培训及第三方费用不默认包含。不保证录取。", "Eligibility is checked against each institution's requirements, including equivalent overseas qualifications. Programme counts, profile planning, deliverables and refunds for specialist plans are specified in writing. Research, training and third-party costs are not included by default. Admission is not guaranteed.")}</p>
        </section>
        <section className={styles.gaokaoSection} aria-label={t("本科与硕士名校定制服务", "Shared undergraduate and master's bespoke admissions")} data-testid="shared-signature-pricing">
          <article className={styles.gaokaoReference} id="education-package-tailored" data-testid="masters-plan-d">
            <div><p className={styles.gaokaoLabel}>{t("PLAN D · 本科与硕士共用高端定制", "PLAN D · SHARED UNDERGRADUATE & MASTER’S SIGNATURE")}</p><h3>{t("名校定制服务", "Bespoke Selective Admissions")}</h3><p>{t("本科与硕士全国统一10万元起。适用于顶尖名校、特殊招生路径、高难度跨专业、本科单证及其他复杂学历背景。仅限院校官方认可的申请途径；先核实资格，再制定个案方案及书面报价。不保证录取。", "Nationwide fees from RMB 100,000 for both undergraduate and master’s admissions. For highly selective universities, officially recognised alternative admissions routes, complex subject transitions and non-standard credentials. Eligibility is verified before a tailored written proposal; admission is not guaranteed.")}</p><div className={styles.mastersRefund} data-testid="masters-refund-d"><span>{t("仅硕士：未获合同约定录取且符合合同退款条件", "Master’s only: no contract-agreed admission and written refund conditions met")}</span><b>{t("服务费全额退还", "Full service-fee refund")}</b></div><p className={styles.small}>{t("本科定制退款条款另行书面约定。", "Undergraduate bespoke refund terms are agreed separately in writing.")}</p><a className={styles.textLink} href="#consultation">{t("了解名校定制服务", "Explore bespoke admissions")}<Arrow /></a></div>
            <div className={styles.gaokaoReferencePrice}><span>{t("专项服务参考价", "Indicative specialist fee")}</span><strong>{t("¥100,000起", "From RMB 100,000")}</strong></div>
          </article>
        </section>
        <h3 className={styles.otherPricingTitle}>{t("其他阶段升学服务", "Other education stages")}</h3>
        <div className={styles.pricingGrid}>{educationPricingPackages.map(plan => <article className={styles.pricingCard} key={plan.id} id={`education-package-${plan.id}`} data-testid="education-pricing-package">
          <h3>{copy(plan.name)}</h3>
          <p className={styles.pricingPrice}>{copy(plan.price)}</p>
          <p className={styles.pricingDescription}>{copy(plan.description)}</p>
          <ul className={styles.pricingFeatures}>{plan.features.map(feature => <li key={feature[1]}><Check size={16} aria-hidden="true" />{copy(feature)}</li>)}</ul>
          <a className={styles.pricingAction} href="#consultation">{t("了解适用条件与书面报价", "Ask about eligibility & a written quote")}<Arrow /></a>
        </article>)}</div>
        <section className={styles.feeJourney} id="education-application-fees" aria-labelledby="application-fees-title" data-testid="application-fee-journey">
          <h3 id="application-fees-title">{t("申请窗口 · 前期评估与正式服务", "Application journey · Assessment and admissions services")}</h3>
          <div className={styles.feeJourneyGrid}>
            {[
              ["01 · COMPASS", t("教育罗盘免费初步评估", "Free Compass assessment"), t("免费", "Free"), t("初步 Growth Snapshot，不是付费报告。", "Initial Growth Snapshot, not a paid report.")],
              ["02 · DISCOVERY", t("教育成长探索", "Education Growth Discovery"), t("¥39.9", "RMB 39.9"), t("独立数字化服务，不计入后续申请费。", "Independent digital service; not credited towards application services.")],
              ["03 · REVIEW", t("专业升学评估", "Professional Decision Review"), t("¥980", "RMB 980"), t("授权顾问交付；交付后7天内签约符合条件的申请服务，已付评估费可计入服务费。", "Delivered by an authorised adviser; the paid review fee may count towards an eligible service signed within seven days after delivery.")],
              ["04 · ADMISSIONS", t("正式升学申请服务", "Admissions services"), t("¥19,800起", "From RMB 19,800"), t("本科及硕士按上述套餐，签署书面合同后执行。", "Undergraduate and master's packages above; services follow a written contract.")],
            ].map(([step,title,price,body])=><article key={step}><p className={styles.gaokaoLabel}>{step}</p><h4>{title}</h4><strong>{price}</strong><p>{body}</p></article>)}
          </div>
          <p className={styles.small}>{t("以上并非强制逐项购买。目标明确的家庭也可直接咨询套餐。本页为收费说明，不提供在线购买或支付；院校申请费等第三方费用另计。", "These are not mandatory sequential purchases. Families with clear goals may enquire about a package directly. This page explains fees and does not provide checkout or payment. Institutional application fees and other third-party costs are separate.")}</p>
          <a className={styles.textLink} href="#education-compass">{t("了解教育罗盘", "Explore Education Compass")}<Arrow /></a>
        </section>
        <div className={styles.pricingTerms} aria-label={t("服务收费规则", "Service pricing rules")} data-testid="education-pricing-terms">
          <article><h3>{t("标准服务范围", "Standard service scope")}</h3><p>{t("以1名学生、约定申请周期为单位。K–12标准申请最多10所学校；硕士启航最多4所院校、8个专业申请项目，优才最多6所院校、12个专业申请项目；本科及硕士高端定制按书面约定，高考标准组合按上述院校额度计。具体专业及项目计数以合同为准。", "Standard applications cover one student and one agreed application cycle: up to 10 schools for K–12; up to 4 institutions and 8 programme applications for Master's Launch, or 6 institutions and 12 programme applications for Master's Premium; specialist undergraduate and master's scope is agreed in writing; standard Gaokao packages follow the institution quotas above. The contract defines programme limits and counting rules.")}</p></article>
          <article><h3>{t("评估费用与抵扣", "Assessment fees and credits")}</h3><p>{t("¥39.9教育成长探索为独立服务费，不抵扣。¥980专业评估由授权教育顾问交付；交付后7天内签约符合条件的申请服务，已付评估费可计入后续服务费。", "The RMB 39.9 Education Growth Discovery fee is not credited. A RMB 980 professional review is delivered by an authorised adviser; if an eligible application service is signed within seven days after delivery, the paid review fee may be credited to that service.")}</p></article>
          <article><h3>{t("第三方费用", "Third-party costs")}</h3><p>{t("院校报名及注册费、考试、成绩寄送、翻译公证、签证、留位费、学费和住宿等通常另计；除非正式合同明确约定包含。", "School and university fees, examinations, score reports, translation, notarisation, visas, deposits, tuition and accommodation are generally separate unless the signed contract expressly includes them.")}</p></article>
        </div>
        <p className={styles.pricingDisclaimer}>{t("以上为公开参考服务费及套餐介绍，非自动生成的合同报价。具体院校／专业、申请数量、交付内容、付款与退款条件以书面方案和合同为准。院校申请费、考试费、学费、签证及其他第三方费用通常另计。Phoenix Nova 为独立升学规划服务机构，并非香港院校的官方招生代理；院校自主决定录取结果，本服务不保证录取。", "These are indicative service fees and package descriptions, not an automatically binding quotation. Programme choices, application counts, deliverables, payment and refund terms are defined in the written proposal and contract. University fees, examinations, tuition, visas and other third-party charges are generally separate. Phoenix Nova provides independent admissions guidance and is not an official admissions representative of Hong Kong universities. Institutions decide admissions; admission is not guaranteed.")}</p>
      </div></section>

      <section className={`${styles.section} ${styles.compassSection}`} id="education-compass" aria-labelledby="compass-title"><div className={styles.container}>
        <div className={styles.compassGrid}><div><p className={styles.eyebrow}>{t("教育罗盘", "EDUCATION COMPASS")}</p><h2 id="compass-title">{t("先看清方向，再规划成长。", "Understand First. Plan for Growth.")}</h2><p className={styles.lead}>{t("每个孩子的背景、兴趣与成长目标都不同。", "Every learner has a different background, interests and ambitions.")}</p><p>{t("通过教育罗盘，我们帮助家庭梳理学生的学业背景、升学目标、学习需求及未来发展方向，初步识别适合的教育规划路径。", "Education Compass helps families organise academic context, education goals, learning needs and future direction to identify initial planning pathways.")}</p><p>{t("从了解现状到明确目标，让每一步教育选择更加清晰。", "From understanding the present to clarifying goals, make each education choice more considered.")}</p>{!freeAssessmentEnabled && <span className={styles.status} data-testid="education-compass-controlled">{t("教育评估暂未开放", "Education assessment is not open yet")}</span>}</div>
          <div className={styles.pathGraphic} aria-label={t("教育需求展示归纳，不是正式问卷维度", "Presentation themes, not formal questionnaire dimensions")}><div className={styles.pathCore}><Route size={34} strokeWidth={1.1} aria-hidden="true" /><span>{zh ? <>教育<br />罗盘</> : <>EDUCATION<br />COMPASS</>}</span></div><ol>{compassPresentation.map((dimension, i) => <li key={dimension[1]}><span>0{i + 1}</span><strong>{copy(dimension)}</strong></li>)}</ol><p>{t("页面展示归纳 · 不改变正式问卷维度与规则", "Presentation themes · Formal dimensions and rules remain unchanged")}</p></div>
        </div>
        <div className={styles.compassBottom}><div className={styles.actions}>{freeAssessmentEnabled ? <Button asChild className={styles.primaryButton}><a href={`/${locale}/education/free-assessment`}>{t("开始免费初评", "Start free assessment (Chinese)")}<Arrow /></a></Button> : <Button type="button" disabled className={styles.primaryButton} aria-describedby="compass-availability">{t("开始教育规划评估", "Start education planning assessment")}<Arrow /></Button>}<Button asChild variant="outline" className={styles.secondaryButton}><a href="#consultation">{t("预约教育规划咨询", "Prepare an education consultation")}<Arrow /></a></Button></div><p id="compass-availability" className={styles.small}>{freeAssessmentEnabled ? t("可匿名填写并即时查看成长快照。", "Complete the assessment anonymously and view the snapshot immediately.") : t("正式问卷已有独立实现，本官网尚未接通获准公开的评估入口。您可以直接准备咨询，无需先完成问卷。", "A separate questionnaire implementation exists; an approved public assessment entry is not connected to this website. You can prepare a consultation directly, without completing an assessment.")}</p></div>
        <p className={styles.privacy}><ShieldCheck size={22} aria-hidden="true" />{t("本评估用于了解学生及家庭的教育规划需求，提供初步方向参考，不构成学校录取保证或正式升学结果承诺。个人资料及评估信息将按照适用的隐私政策和授权范围处理。", "This assessment is intended to understand students’ and families’ education planning needs and provide initial direction. It does not guarantee school admission or formal education outcomes. Personal and assessment information will be handled under applicable privacy policies and within the scope of authorisation.")}</p>
        <div className={styles.nextSteps}><strong>{t("了解方向后，自主选择下一步", "Your direction. Your next step.")}</strong><p>{t("香港升学 · 海外升学 · 学术与课程提升 · 凤启学苑课程与导师 · ASKWISE 学习支持 · 专业教育顾问", "Hong Kong admissions · Global admissions · Academic support · Academy courses & tutors · ASKWISE learning support · Professional consultation")}</p><small>{t("以上为服务选择示意，不是评估结果或自动推荐。评估、咨询授权及服务交接分别处理，不自动发送答案。", "These are possible service choices, not assessment results or automatic recommendations. Assessment, consultation consent and service handoff are separate; answers are not sent automatically.")}</small></div>
      </div></section>

      <section className={`${styles.section} ${styles.academySection}`} id="academy" aria-labelledby="academy-title"><div className={styles.container}>
        {catalogPreviewEnabled ? <LearningCourseCatalog locale={locale} /> : null}
        <div className={styles.productGrid}><div className={styles.productCopy}><p className={styles.eyebrow}>{t("凤启学苑｜启明堂", "PHOENIX ACADEMY · QIMING HALL")}</p><h2 id="academy-title">{t("全球家庭的教育与成长平台", "Learning and growth for global families")}</h2><p className={styles.lead}>{t("融合课程学习、专业导师与智能工具，为全球家庭提供持续的学习与成长支持。", "Bringing courses, professional tutors and intelligent tools together for continuing learning and growth.")}</p><ul className={styles.capabilities}>{[["国际教育与升学规划", "International education & admissions planning"], ["专业导师与一对一教学", "Professional tutors & one-to-one teaching"], ["课程学习及学术能力提升", "Courses & academic development"], ["学习进度、成长记录及长期跟进", "Learning progress, growth records & continuing support"]].map(([cn,en]) => <li key={en}><Check size={17} aria-hidden="true" />{t(cn,en)}</li>)}</ul><a className={styles.textLink} href="#consultation">{t("了解课程与导师支持", "Explore courses & tutor support")}<Arrow /></a></div><div className={styles.academyImage}><Image src="/images/education-v3/education-academy.png" alt={t("现代学习空间中进行远程课程的示意场景", "An illustrative remote lesson in a modern learning space")} fill unoptimized sizes="(max-width: 800px) 100vw, 50vw" /><span className={styles.imageTag}><GraduationCap aria-hidden="true" />{t("凤启学苑｜启明堂", "Phoenix Academy · Qiming Hall")}<small>{t("课程 · 导师 · 成长", "Courses · Tutors · Growth")}</small></span></div></div>
        <div className={styles.booking} id="academy-booking"><div><CalendarDays size={30} strokeWidth={1.2} aria-hidden="true" /><h3>{t("学苑约课管理系统", "Academy booking & teaching operations")}</h3><p>{t("凤启学苑的教学运营能力，不是独立品牌。以下为能力介绍，公开平台尚未开放。", "An Academy teaching-operations capability, not a separate brand. This is a capability preview; the public platform is not open.")}</p></div><div><ul className={styles.tags}>{[["课程预约", "Booking"], ["课程排期", "Scheduling"], ["导师管理", "Tutor coordination"], ["学员管理", "Student coordination"], ["学习进度", "Progress"], ["课程记录", "Lesson records"], ["教学跟进", "Teaching follow-up"]].map(([cn,en]) => <li key={en}>{t(cn,en)}</li>)}</ul><div className={styles.portalStates}><span><LockKeyhole size={16} aria-hidden="true" />{t("学员入口 · 待开放", "Student entry · Not open")}</span><span><LockKeyhole size={16} aria-hidden="true" />{t("导师入口 · 待开放", "Tutor entry · Not open")}</span></div></div></div>
      </div></section>

      <section className={`${styles.section} ${styles.askwiseSection}`} id="askwise" aria-labelledby="askwise-title"><div className={styles.container}>
        <div className={styles.askwiseGrid}><div className={styles.learningGraphic} aria-hidden="true"><span className={styles.learningOrbit} /><div className={styles.brain}><BrainCircuit size={72} strokeWidth={.9} /><strong>ASKWISE</strong><span>{t("学习 · 反思 · 成长", "LEARN · REFLECT · GROW")}</span></div><span className={styles.orbitLabel}>{t("01 · 理解", "01 · UNDERSTAND")}</span><span className={styles.orbitLabel}>{t("02 · 练习", "02 · PRACTISE")}</span><span className={styles.orbitLabel}>{t("03 · 反思", "03 · REFLECT")}</span></div><div><p className={styles.eyebrow}>{t("ASKWISE™ · 智能学习伙伴", "ASKWISE™ · AI-POWERED LEARNING COMPANION")}</p><h2 id="askwise-title">{t("让学习更有方向", "Learning with a clearer direction")}</h2><p className={styles.lead}>{t("AI 不只是回答问题，而是帮助学生形成完整的学习闭环。", "AI support goes beyond answering a question, helping learners follow a complete learning cycle.")}</p><p>{t("学习诊断、结构化任务、AI 作业辅助与反馈、错因分析、针对性练习，以及学习进度与掌握度验证。", "Learning diagnosis, structured tasks, AI-assisted homework feedback, error analysis, focused practice, and progress and mastery checks.")}</p><span className={styles.status}>{t("产品能力介绍 · 正式公开入口待确认", "Product introduction · Public access awaits confirmation")}</span><p className={styles.small}>{t("本页不启动学习任务、不读取作业或学习档案，也不更改现有 ASKWISE 规则。", "This page does not start learning tasks, read homework or learner records, or change existing ASKWISE rules.")}</p></div></div>
        <ol className={styles.learningSteps}>{learningSteps.map((step, index) => <li key={step[1]} data-testid="learning-step"><span>0{index + 1}</span><strong>{copy(step)}</strong></li>)}</ol>
        <div className={styles.productRoles}><div><Route aria-hidden="true" /><strong>{t("教育罗盘", "Education Compass")}</strong><p>{t("教育需求评估与规划方向识别", "Assess education needs and identify planning directions")}</p></div><div><GraduationCap aria-hidden="true" /><strong>{t("凤启学苑｜启明堂", "Phoenix Academy · Qiming Hall")}</strong><p>{t("专业教育、课程及导师教学服务", "Professional education, courses and tutor teaching")}</p></div><div><BrainCircuit aria-hidden="true" /><strong>ASKWISE</strong><p>{t("AI 智能学习、作业反馈与能力提升", "AI learning, homework feedback and skill development")}</p></div></div>
      </div></section>

      <section className={styles.globalSection} aria-labelledby="global-title"><Image src="/images/identity-v3/identity-world.png" alt="" fill unoptimized sizes="100vw" /><div className={styles.container}><div className={styles.globalCopy}><p className={styles.eyebrow}>{t("全球教育连接", "GLOBAL EDUCATION CONNECTIONS")}</p><h2 id="global-title">{t("连接全球优质教育资源。", "Connect with a wider world of education.")}</h2><h3>{t("为下一代打开更广阔的成长空间。", "A wider space for the next generation to grow.")}</h3><p>{t("以学生目标为起点，了解不同教育目的地、课程体系与成长路径。", "Explore destinations, curricula and growth pathways through the lens of the learner’s goals.")}</p><ul className={styles.destinations}>{[["香港", "Hong Kong"], ["英国", "United Kingdom"], ["美国", "United States"], ["加拿大", "Canada"], ["澳大利亚", "Australia"], ["新加坡", "Singapore"]].map(([cn,en]) => <li key={en}>{t(cn,en)}</li>)}</ul><p className={styles.small}>{t("目的地仅为教育规划方向，不代表当地办公室、院校合作、服务资质或录取保证。具体项目与申请信息须向官方渠道核实。", "Destinations illustrate planning directions, not local offices, institutional partnerships, service qualifications or admission guarantees. Verify programme and application details through official channels.")}</p><a className={styles.textLink} href="#consultation">{t("探索教育规划方向", "Explore education planning")}<Arrow /></a></div></div></section>

      <section className={`${styles.section} ${styles.familySection}`} id="family-growth" aria-labelledby="family-title"><div className={`${styles.container} ${styles.familyGrid}`}><div><p className={styles.eyebrow}>{t("学习 · 家庭 · 长期成长", "LEARNING · FAMILY · LONG-TERM GROWTH")}</p><h2 id="family-title">{t("教育不仅是一次升学，\n更是一段长期成长。", "Education is a journey,\nnot a single admission.")}</h2><p>{t("点亮每一段成长，通向更广阔的未来。", "For Every Learner. A Brighter Tomorrow.")}</p><p>{t("连接学生长期学习档案、家庭教育规划、课程记录、成长反馈与升学衔接。凤启家序是统一的家庭服务端；本页展示未来服务关系，不自动接入或同步学生资料。", "Connect learner records, family education planning, courses, feedback and education transitions. Family OS is the unified family service interface. This page explains the intended relationship without connecting or synchronising learner information.")}</p><Link className={styles.textLink} href={`/${locale}/family-center`}>{t("了解凤启家序 · 受控入口", "Family OS · Controlled entry")}<Arrow /></Link></div><div className={styles.growthPlan}><Layers size={32} strokeWidth={1.2} aria-hidden="true" /><h3>{t("成长蓝图", "Growth Blueprint")}</h3><p>{t("从规划方向到行动蓝图，再连接自主选择的学习支持。", "From planning direction to an action blueprint, then to learning support you choose.")}</p><ol><li>{t("教育罗盘", "Education Compass")}</li><li>{t("成长蓝图", "Growth Blueprint")}</li><li>{t("凤启学苑｜启明堂 · ASKWISE", "Phoenix Academy · Qiming Hall · ASKWISE")}</li><li>{t("凤启家序", "Family OS")}</li></ol><p className={styles.privacy}><ShieldCheck aria-hidden="true" size={22} />{t("家庭管理员身份不等于所有学生敏感数据的访问权。查看及交接须核实学生、监护人授权及服务端权限。", "Family administrator status does not grant access to all sensitive student data. Access and handoff require appropriate student or guardian authorisation and server-side permissions.")}</p></div></div></section>

      <section className={`${styles.section} ${styles.consultationSection}`} id="consultation" aria-labelledby="consultation-title"><div className={`${styles.container} ${styles.consultationGrid}`}><div><p className={styles.eyebrow}>{t("下一段成长", "YOUR NEXT BEGINNING")}</p><h2 id="consultation-title">{t("为孩子的下一阶段，\n找到更清晰的方向。", "A clearer direction\nfor the next stage.")}</h2><p>{t("让每个家庭看清方向，让每段成长都有支持。", "Help every family find direction, and every stage of growth find support.")}</p><p>{t("您可以直接准备咨询，无需先完成评估。服务选择、咨询授权与后续交接分别处理，由您自主决定。", "Prepare a consultation directly without completing an assessment first. Service choice, consultation consent and any subsequent handoff are separate and voluntary.")}</p><p className={styles.consultationBoundary}><ShieldCheck aria-hidden="true" size={24} />{t("正式咨询渠道尚未接通。本区只生成本地准备清单，不提交预约、不读取评估答案、不创建客户或学生记录。", "The official consultation channel is not connected. This section only displays a local preparation checklist. It does not book, read assessment answers, or create client or student records.")}</p><Link prefetch={false} href={"/" + locale + "/consultation/education"}>{locale === "zh" ? "提交服务咨询" : "Submit an enquiry"}</Link></div><EducationConsultation locale={locale} /></div></section>
      <aside className={styles.brandPromise}><div className={styles.container}><span>{t("承东方之源，启全球新程。", "Rooted in the East. Opening a global chapter.")}</span><span>For Every Beginning.</span><span>{t("每一次启程，都值得更好的未来。", "Every beginning deserves a better future.")}</span></div></aside>
    </main>
    <SiteFooter locale={locale} appearance="v3" consultationPath="/education#consultation" />
  </div>;
}
