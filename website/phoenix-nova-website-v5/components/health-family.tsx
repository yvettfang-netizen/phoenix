import Link from "next/link";
import { SiteHeader, SiteFooter } from "./v5-site";
import { HealthConsultation } from "./health-consultation";
import { dimensions, text } from "@/lib/health-compass";
import { healthPreviewEnabled } from "@/lib/health-compass-gate";
import shared from "./health-landing.module.css";
import styles from "./health-family.module.css";

const directionCopy = [
  ["了解如何查找正规医疗咨询渠道，核实不同地区的就医流程及所需资料。", "Learn where to find professional medical consultation channels and verify care procedures and required documents across regions."],
  ["明确家庭内部的事务分工，建立对已确认预约及后续事项的记录和提醒方式。", "Clarify responsibilities within the family and establish records and reminders for confirmed appointments and follow-up tasks."],
  ["了解医疗资料的正规索取渠道，重视个人隐私、协助授权及撤回机制。", "Understand official channels for requesting medical records, with attention to privacy, permission to assist and withdrawal of that permission."],
  ["提前商量陪同、生活协助与备用安排，让家庭成员之间的协调更加有序。", "Discuss accompaniment, daily-life assistance and backup arrangements in advance, so family members can coordinate more smoothly."],
  ["整理现有保障信息，了解费用、报销及理赔事项应向哪些机构核实。", "Organise existing coverage information and identify the institutions that can verify costs, reimbursements and claims."],
  ["把需要处理的事项记录下来，建立适合家庭的提醒与定期回顾方式。", "Record tasks that need attention and develop reminders and regular reviews that suit your family."],
] as const;

export function HealthFamily({ locale }: { locale: "zh" | "en" }) {
  const t = (zh:string,en:string) => locale === "zh" ? zh : en;
  const enabled = healthPreviewEnabled();
  const assessment = (id: string, hero = false) => {
    const label = hero ? t("开始家庭健康规划", "Start family health planning") : t("开始14题评估", "Start the 14-question Compass");
    return enabled
      ? <Link className={shared.primary} prefetch={false} data-testid={id} href={`/${locale}/compass/health`}>{label} ↗</Link>
      : <div className={styles.unavailable} data-testid={`${id}-closed`}><button className={shared.primary} disabled type="button">{label}</button><small>{t("评估尚未开放，保持受控状态；您仍可了解规划方向与咨询准备。", "The assessment is not open yet and remains controlled. Explore planning and consultation preparation below.")}</small></div>;
  };
  return <div className={`${shared.page} ${styles.family}`} lang={locale === "zh" ? "zh-Hans" : "en"} data-health-family>
    <a className={shared.skip} href="#family-main">{t("跳至主要内容", "Skip to main content")}</a>
    <SiteHeader locale={locale} page="health/family" brandLocale={locale} />
    <main id="family-main">
      <nav className={shared.subnav} aria-label={t("家庭健康规划导航", "Family health navigation")}><div className={shared.wrap}><Link href={`/${locale}/health`}>{t("全球健康", "HEALTH")}</Link><span>/</span><span>{t("家庭健康规划", "FAMILY PLANNING")}</span><a href="#family-consultation">{t("规划咨询准备", "Plan a conversation")} ↗</a></div></nav>
      <section className={`${shared.wrap} ${styles.hero}`}>
        <div>
          <p className={shared.eyebrow}>{t("PHOENIX NOVA™ / 家庭健康规划", "PHOENIX NOVA™ / FAMILY HEALTH PLANNING")}</p>
          <p className={styles.pageName}>{t("家庭健康规划", "Family Health Planning")}</p>
          <h1>{t("家人的健康安排，\n值得更从容的规划。", "Your family's health arrangements\ndeserve a more considered plan.")}</h1>
          <p className={styles.lead}>{t("每个家庭，都有需要被认真对待的健康事务。", "Every family has health-related matters that deserve thoughtful attention.")}</p>
          <p className={styles.lead}>{t("从了解正规就医渠道，到整理预约、资料授权、家庭陪同与后续跟进，Phoenix Nova™ 希望帮助您把分散的安排梳理得更加清晰。", "From understanding official care channels to organising appointments, record permissions, family accompaniment and follow-up, Phoenix Nova™ aims to help bring clarity to scattered arrangements.")}</p>
          <p className={styles.lead}>{t("无需填写疾病信息，也不必上传医疗报告。", "No disease information or medical reports are needed.")}</p>
          <p className={styles.lead}>{t("从一次简单的 Health Compass 评估开始，了解哪些事务已有安排，哪些仍值得进一步协调。", "Begin with a simple Health Compass assessment to see which matters are already arranged and which may benefit from further coordination.")}</p>
          <div className={styles.actions}>{assessment("family-hero-assessment", true)}<a className={shared.secondary} href="#family-assessment">{t("了解 Health Compass", "Learn about Health Compass")} ↗</a></div>
        </div>
        <div className={styles.visual}><div className={styles.visualPhoto} role="img" aria-label={t("笔记本与眼镜的规划场景示意", "Illustrative notebook and glasses for planning")} /><div className={styles.visualNote}><span>{t("清晰 · 协调 · 持续", "CLARITY · COORDINATION · CONTINUITY")}</span><p>{t("看清安排，\n让关心有处安放。", "Make room for care.\nGive the next step a place.")}</p><small>{t("场景示意图，不代表客户或合作关系", "Illustrative stock image, no client or partner affiliation")}</small></div></div>
      </section>
      <section className={styles.directionsSection}><div className={`${shared.wrap} ${shared.section}`}>
        <div className={shared.sectionHeading}><p>{t("01 / 六个规划方向", "01 / SIX PLANNING DIRECTIONS")}</p><h2>{t("健康规划，不止于一次就医", "Health planning goes beyond a single medical visit")}</h2></div>
        <p className={shared.intro}>{t("真正有序的家庭健康事务管理，不仅在需要就医时发挥作用，也体现在日常的准备与协调之中。", "Well-organised family health arrangements matter when care is needed, and in everyday preparation and coordination.")}</p>
        <p className={shared.intro}>{t("我们从六个方向帮助您梳理：", "We help you explore six directions:")}</p>
        <div className={styles.directions}>{dimensions.map((dimension,index)=><article key={dimension.id}><span>0{index+1}</span><h3>{text(dimension.title,locale)}</h3><p>{text(directionCopy[index],locale)}</p></article>)}</div>
      </div></section>
      <section className={`${shared.section} ${shared.wrap} ${styles.assessment}`} id="family-assessment">
        <div>
          <div className={shared.sectionHeading}><p>{t("02 / 健康罗盘", "02 / ONE HEALTH COMPASS")}</p><h2>{t("一份14题的家庭健康事务梳理", "Fourteen questions to organise family health arrangements")}</h2></div>
          <p>{t("Health Compass 不评价您的身体健康状况，也不会给出医学风险分数。", "Health Compass does not assess your health or provide a medical risk score.")}</p>
          <p>{t("通过14个可跳过的问题，帮助您回顾已有安排，并形成六个维度的文字整理结果。", "Through 14 skippable questions, it helps you review existing arrangements and presents a written summary across six dimensions.")}</p>
          <p>{t("您还可以自主选择最多三项后续行动，复制或导出个人行动单。", "You can also choose up to three next actions and copy or export your personal action list.")}</p>
        </div>
        <div className={styles.assessmentPanel}><span>14 / 6 / 3</span><h3>{t("一套评估，两重服务价值。", "One Compass. Two kinds of support.")}</h3><p>{t("家庭长期安排 · 国际医疗需求梳理", "Long-term family arrangements · International care needs")}</p>{assessment("family-assessment")}<small>{t("问卷答案不会自动上传、传送给顾问或写入客户管理系统。刷新、离开或清空会丢失回答。", "Questionnaire answers are not automatically uploaded, sent to advisors or written to CRM. Refreshing, leaving or clearing resets the session.")}</small></div>
      </section>
      <section className={styles.audienceSection}><div className={`${shared.section} ${shared.wrap} ${styles.split}`}><div className={shared.sectionHeading}><p>{t("03 / 适合人群", "03 / WHO IT IS FOR")}</p><h2>{t("不同的家庭阶段，\n相同的安心期待。", "Different family stages.\nA shared need for clarity.")}</h2></div><ul>{[["希望梳理家庭健康事务与分工的成年使用者","Adults organising family health-related tasks and responsibilities"],["需要协调长辈陪同与备用协助的家庭","Families discussing accompaniment and backup support for older relatives"],["跨地区生活、希望了解正规就医渠道的家庭","Cross-region families seeking official care information channels"],["希望理清资料授权、保障信息与后续待办的人士","People clarifying permissions, coverage information and follow-up tasks"]].map(([zh,en],i)=><li key={en}><span>0{i+1}</span>{t(zh,en)}</li>)}</ul></div></section>
      <section className={styles.integratedSection} id="integrated-support">
        <div className={`${shared.section} ${shared.wrap} ${styles.split}`}>
          <div>
            <div className={shared.sectionHeading}><p>{t("04 / 长期支持", "04 / BOTH, TOGETHER")}</p><h2>{t("让家庭健康事务，\n有序地持续下去", "Keep family health arrangements\nmoving forward with clarity")}</h2></div>
            <p>{t("对于需要进一步协助的家庭，Phoenix Nova™ 也提供国际医疗服务信息与咨询入口，包括跨境就医协调、医疗翻译、陪同及保险理赔行政协助等。", "For families seeking further support, Phoenix Nova™ also offers international medical service information and consultation entry points, including cross-border care coordination, medical interpretation, accompaniment and insurance claims administration assistance.")}</p>
            <p>{t("是否申请咨询，由您自主决定。评估答案不会自动发送给顾问。", "Consultation is your choice. Assessment answers are not automatically sent to an advisor.")}</p>
          </div>
          <div className={styles.serviceBridge}><small>{t("全球健康服务", "GLOBAL HEALTH SERVICES")}</small><h3>{t("有明确的国际就医需要？", "Already have an international care need?")}</h3><p>{t("无需先完成14题，也可直接了解服务和自愿咨询。", "Explore services and voluntary consultation without completing the 14 questions.")}</p><Link className={shared.primary} href={`/${locale}/health#services`}>{t("了解国际医疗服务", "Explore international medical services")} ↗</Link><Link className={shared.secondary} href={`/${locale}/health#consultation`}>{t("申请服务咨询", "Request a service consultation")} ↗</Link><p className={shared.micro}>{t("当前进入独立咨询准备演示，尚未发送申请；不附带问卷答案，不自动预约。", "This opens an independent preparation demo. No request is sent, no answers accompany the link and no appointment is booked.")}</p></div>
        </div>
      </section>
      <section className={`${shared.section} ${shared.wrap} ${styles.split}`} id="family-consultation"><div><div className={shared.sectionHeading}><p>{t("05 / 咨询准备", "05 / YOUR NEXT CONVERSATION")}</p><h2>{t("让家庭的下一步，\n有条理，也有温度。", "A thoughtful conversation.\nA practical next step.")}</h2></div><p>{t("独立的家庭规划咨询准备入口。无论是否参加评估，都可自行选择希望了解的方向。问卷答案不会传送到此入口。", "An independent preparation step for family planning support. Choose a direction whether or not you take the assessment. Questionnaire answers are never transferred here.")}</p><p className={shared.micro}>{t("前端演示 · 未接通正式顾问或提交系统", "Frontend demo · No advisor or submission system connected")}</p></div><HealthConsultation locale={locale} family /></section>
      <div className={`${shared.wrap} ${styles.disclaimer}`}><p>{t("重要说明：Health Compass 是健康事务安排工具，不构成医疗诊断、治疗建议、保险建议或就医资格判断。紧急情况请联系当地紧急医疗服务。", "Important: Health Compass is a tool for organising health-related arrangements. It does not provide medical diagnosis, treatment or insurance advice, or determine eligibility for care. In an emergency, contact local emergency medical services.")}</p></div>
    </main><SiteFooter locale={locale} brandLocale={locale} />
  </div>;
}
