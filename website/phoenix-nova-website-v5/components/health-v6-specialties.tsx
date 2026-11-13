"use client";

import { useRef, useState } from "react";
import styles from "./health-v6-specialties.module.css";

type Locale = "zh" | "en";
type Copy = readonly [string, string];

const copy = (value: Copy, locale: Locale) => value[locale === "zh" ? 0 : 1];

type Specialty = {
  id: string;
  title: Copy;
  eyebrow: Copy;
  topics: readonly Copy[];
  questions: readonly Copy[];
  care: Copy;
  stay: Copy;
  travel: Copy;
  insurance: readonly Copy[];
};

const specialties: readonly Specialty[] = [
  {
    id: "orthopedics",
    title: ["骨科与关节中心", "Orthopaedics & Joints"],
    eyebrow: ["咨询主题 · 需机构确认", "Conversation topics · Provider confirmation required"],
    topics: [
      ["颈椎与腰椎相关评估", "Neck and lower-back assessment"],
      ["关节置换相关咨询", "Joint-replacement questions"],
      ["脊柱微创相关咨询", "Minimally invasive spine questions"],
      ["非手术及康复资源协调", "Non-surgical and rehabilitation resources"],
    ],
    questions: [
      ["需要哪些影像、既往记录或面对面评估？", "Which imaging, prior records or in-person assessment are needed?"],
      ["哪些医生、机构和技术由目标机构当前提供？", "Which clinicians, providers and techniques are currently available from the target provider?"],
    ],
    care: ["具体诊疗、手术适应证、替代方案与风险由合资格医生评估；本页不判断适合哪项治疗。", "A qualified clinician assesses suitability, alternatives and risks. This page does not determine which treatment is appropriate."],
    stay: ["住院或日间安排、观察要求与护理计划须由实际机构按个案确认。", "Inpatient or day-case arrangements, observation and care plans must be confirmed case by case by the provider."],
    travel: ["返港或继续行程的时间须以医生、机构和跨境安排确认；不要以页面内容预订不可退款行程。", "Travel or return timing must be confirmed by the clinician, provider and cross-border plan; do not book non-refundable travel from this page."],
    insurance: [
      ["目标项目是否属于具体保单保障范围？", "Is the proposed item covered under the specific policy?"],
      ["是否需要转介、预先批核或指定医院？", "Is a referral, pre-authorisation or designated provider required?"],
    ],
  },
  {
    id: "oncology",
    title: ["肿瘤精准治疗", "Oncology Care Questions"],
    eyebrow: ["咨询主题 · 不构成治疗建议", "Conversation topics · Not treatment advice"],
    topics: [
      ["肿瘤诊断与检查路径", "Diagnostic and testing pathways"],
      ["放疗、化疗相关咨询", "Radiotherapy and chemotherapy questions"],
      ["介入治疗相关咨询", "Interventional-care questions"],
      ["多学科诊疗资源协调", "Multidisciplinary-care resource coordination"],
    ],
    questions: [
      ["目标机构需要哪些病理、影像或检验资料？", "Which pathology, imaging or laboratory records does the target provider require?"],
      ["如何确认参与评估的专科团队和现行方案？", "How can the current specialty team and proposed pathway be confirmed?"],
    ],
    care: ["检查结果、分期、治疗选择、风险和预后均由医疗团队解释；本页不提供患者级判断。", "The medical team explains results, staging, options, risks and outlook. This page provides no patient-level judgement."],
    stay: ["治疗周期、住院或日间安排与监测要求由机构按个案说明，页面不提供统一天数。", "Treatment cycles, inpatient or day-case arrangements and monitoring are explained case by case; no standard duration is stated here."],
    travel: ["跨境往返应等医疗团队确认就诊、观察和复诊安排后再规划。", "Plan cross-border travel only after the care team confirms visits, observation and follow-up arrangements."],
    insurance: [
      ["具体药物、检查或治疗是否需要预先批核？", "Do specific medicines, tests or care require pre-authorisation?"],
      ["保单如何定义指定机构、除外责任和理赔文件？", "How does the policy define designated providers, exclusions and claim documents?"],
    ],
  },
  {
    id: "breast",
    title: ["乳腺与女性健康", "Breast & Women's Health"],
    eyebrow: ["咨询主题 · 需医生确认", "Conversation topics · Clinician confirmation required"],
    topics: [
      ["乳腺微创旋切相关咨询", "Vacuum-assisted breast procedure questions"],
      ["乳腺手术相关咨询", "Breast-surgery questions"],
      ["保乳与重建选择的沟通准备", "Communication about breast-conserving and reconstructive options"],
      ["后续康复资源协调", "Follow-up rehabilitation resources"],
    ],
    questions: [
      ["目标机构如何确认检查、影像和病理要求？", "How does the target provider confirm imaging, tests and pathology requirements?"],
      ["哪些选择由医生根据个案情况讨论？", "Which options should the clinician discuss for the individual case?"],
    ],
    care: ["微创、手术、保乳、重建及康复是否适合，须由实际医生评估和说明。", "The treating clinician must assess and explain whether minimally invasive care, surgery, conservation, reconstruction or rehabilitation is suitable."],
    stay: ["日间或住院路径、观察时长和护理安排均待目标机构确认。", "Day-case or inpatient pathways, observation and care arrangements remain subject to target-provider confirmation."],
    travel: ["恢复与复诊安排由医生确认后，才可讨论返港及陪同计划。", "Discuss return travel and support only after the clinician confirms recovery and follow-up arrangements."],
    insurance: [
      ["检查、日间手术或住院项目的保障条件是什么？", "What coverage conditions apply to tests, day surgery or inpatient care?"],
      ["是否需要转介、预先批核和指定医生或医院？", "Are referral, pre-authorisation or designated clinicians/providers required?"],
    ],
  },
  {
    id: "gi-endoscopy",
    title: ["胃肠内窥镜", "Gastrointestinal Endoscopy"],
    eyebrow: ["咨询主题 · 由机构核实", "Conversation topics · Provider verification required"],
    topics: [
      ["胃镜与肠镜相关咨询", "Gastroscopy and colonoscopy questions"],
      ["息肉切除相关咨询", "Polyp-removal questions"],
      ["日间手术路径沟通", "Day-case pathway discussion"],
      ["麻醉评估及术后观察准备", "Anaesthesia assessment and post-procedure observation preparation"],
    ],
    questions: [
      ["检查前准备、禁食和用药要求由谁确认？", "Who confirms preparation, fasting and medication requirements?"],
      ["麻醉、观察、报告和复诊的具体安排是什么？", "What are the arrangements for anaesthesia, observation, reports and follow-up?"],
    ],
    care: ["是否检查、取样或处理息肉，以及麻醉方式，均由医疗机构根据个案决定。", "The provider decides whether examination, sampling or polyp management is appropriate and which anaesthesia approach applies."],
    stay: ["日间或住院安排、观察要求和离院条件须按机构流程确认；不提供统一时间承诺。", "Day-case or inpatient arrangements, observation and discharge conditions follow provider protocol; no uniform timing is promised."],
    travel: ["返港时间须经医生确认，并考虑报告、观察、陪同和突发安排。", "Return timing must be confirmed by the clinician, considering reports, observation, support and contingencies."],
    insurance: [
      ["无痛、取样、息肉处理及麻醉分别如何核实保障？", "How are coverage terms checked for sedation, sampling, polyp management and anaesthesia?"],
      ["理赔需要哪些由机构出具的文件和期限？", "Which provider-issued documents and deadlines apply to a claim?"],
    ],
  },
] as const;

const faqItems: readonly { question: Copy; answer: Copy }[] = [
  { question: ["香港商业保险能否报销深圳就医费用？", "Can Hong Kong commercial insurance reimburse care in Shenzhen?"], answer: ["不能仅按品牌判断。须提供具体保单和版本，由保险公司及目标机构核实保障地区、指定网络、预先批核和理赔条件。", "A brand name is not enough. The insurer and target provider must check the specific policy and version, territory, network, pre-authorisation and claim terms."] },
  { question: ["大型手术是否需要预先批核？", "Do major procedures require pre-authorisation?"], answer: ["可能因保单、项目、机构和保险公司而异。请以保险公司书面规则和目标机构要求为准。", "It may depend on the policy, item, provider and insurer. Follow the insurer's written rules and the target provider's requirements."] },
  { question: ["无痛胃肠镜和息肉切除能否理赔？", "Can sedated endoscopy and polyp removal be claimed?"], answer: ["需按具体项目、麻醉、医学必要性、保单除外责任及文件要求逐项核实，不构成理赔保证。", "Check the item, anaesthesia, medical-necessity, exclusions and document requirements case by case. No claim outcome is promised."] },
  { question: ["乳腺微创旋切是否属于日间手术？", "Is a vacuum-assisted breast procedure day surgery?"], answer: ["路径由实际机构和医生按个案决定，保险分类也须向保险公司确认。", "The provider and clinician decide the pathway case by case; the insurer must confirm the policy classification."] },
  { question: ["宏利保单需要什么额外资料？", "What extra information might a Manulife policy require?"], answer: ["不能从品牌名称推断规则。请提供具体计划、条款版本，由保险公司确认所需文件和期限；本页不接收保单或病历。", "Rules cannot be inferred from the brand name. Confirm required documents and deadlines with the insurer for the specific plan and version; this page does not receive policies or medical records."] },
  { question: ["医院是否能提供中英文医疗记录？", "Can a hospital provide Chinese and English medical records?"], answer: ["语言版本和翻译方式须向目标机构确认；凤启不代表任何机构承诺双语记录。", "Confirm language versions and translation arrangements with the target provider; Phoenix does not promise bilingual records from any provider."] },
  { question: ["如何确认医疗耗材及关节假体来源？", "How can implant or medical-supply provenance be checked?"], answer: ["请向实际医疗机构索取可核实的品牌、型号和来源信息，并由医生解释是否适用。", "Ask the provider for verifiable brand, model and provenance information, and ask the clinician whether it is appropriate."] },
  { question: ["长者是否可以安排粤语陪诊？", "Can Cantonese accompaniment be arranged for an older person?"], answer: ["是否可用、由谁提供及费用如何计算均待逐项确认，不代表已有人员或语言能力。", "Availability, provider and fees require individual confirmation; this does not represent an existing person or language capability."] },
  { question: ["如何预约深圳医院？", "How can a Shenzhen hospital be booked?"], answer: ["先从目标机构的官方入口核对预约条件、资料、时间和取消规则；公开页面不构成预约成功。", "Use the target provider's official entry to check conditions, documents, timing and cancellation rules; this page does not confirm a booking."] },
  { question: ["就医后如何安排返港？", "How should return travel be planned after care?"], answer: ["应在医生和机构确认观察、复诊及文件安排后，再向交通和跨境主管渠道核实。", "After the clinician and provider confirm observation, follow-up and documents, verify transport and cross-border requirements through the proper authorities."] },
  { question: ["如何申请理赔协助？", "How can claims assistance be requested?"], answer: ["当前入口仅作准备演示，不提交申请。未来服务范围、同意和资料渠道须分别确认，保险公司决定理赔。", "The current entry is a preparation demo and submits no claim. Future scope, consent and document channels require separate confirmation; the insurer decides claims."] },
  { question: ["患者隐私与家庭成员访问权限如何管理？", "How are patient privacy and family access managed?"], answer: ["患者级授权、服务端鉴权及最小权限必须先建立并核验；本页面不收集病历、证件或保险文件。", "Patient-level authorisation, server-side checks and least privilege must be established and verified first; this page collects no medical, identity or insurance files."] },
] as const;

export function HealthV6Specialties({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeSpecialty = specialties[active];
  const move = (next: number) => {
    const index = (next + specialties.length) % specialties.length;
    setActive(index);
    refs.current[index]?.focus();
  };
  return <div className={styles.specialties} data-testid="health-v6-specialties">
    <div className={styles.tabs} role="tablist" aria-label={locale === "zh" ? "重点专科主题" : "Priority specialty topics"}>
      {specialties.map((item, index) => <button
        key={item.id}
        ref={node => { refs.current[index] = node; }}
        className={`${styles.tab} ${index === active ? styles.tabActive : ""}`}
        type="button"
        role="tab"
        id={`health-v6-tab-${item.id}`}
        aria-selected={index === active}
        aria-controls="health-v6-specialty-panel"
        tabIndex={index === active ? 0 : -1}
        data-testid={`health-v6-specialty-tab-${item.id}`}
        onClick={() => setActive(index)}
        onKeyDown={event => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(index + 1); }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(index - 1); }
          if (event.key === "Home") { event.preventDefault(); move(0); }
          if (event.key === "End") { event.preventDefault(); move(specialties.length - 1); }
        }}
      >{copy(item.title, locale)}</button>)}
    </div>
    <article className={styles.panel} role="tabpanel" id="health-v6-specialty-panel" aria-labelledby={`health-v6-tab-${activeSpecialty.id}`} data-testid="health-v6-specialty-panel" tabIndex={0}>
      <p className={styles.status}>{copy(activeSpecialty.eyebrow, locale)}</p>
      <h3>{copy(activeSpecialty.title, locale)}</h3>
      <div className={styles.columns}>
        <section><h4>{locale === "zh" ? "可讨论的医疗项目" : "Topics to discuss"}</h4><ul>{activeSpecialty.topics.map(item => <li key={item[1]}>{copy(item, locale)}</li>)}</ul></section>
        <section><h4>{locale === "zh" ? "向医生核实的问题" : "Questions for the clinician"}</h4><ul>{activeSpecialty.questions.map(item => <li key={item[1]}>{copy(item, locale)}</li>)}</ul></section>
        <section><h4>{locale === "zh" ? "诊疗方式与适用性" : "Care and suitability"}</h4><p>{copy(activeSpecialty.care, locale)}</p></section>
        <section><h4>{locale === "zh" ? "住院或日间安排" : "Inpatient or day-case planning"}</h4><p>{copy(activeSpecialty.stay, locale)}</p></section>
        <section><h4>{locale === "zh" ? "出院与返程" : "Discharge and travel"}</h4><p>{copy(activeSpecialty.travel, locale)}</p></section>
        <section><h4>{locale === "zh" ? "保险核实重点" : "Insurance checks"}</h4><ul>{activeSpecialty.insurance.map(item => <li key={item[1]}>{copy(item, locale)}</li>)}</ul></section>
      </div>
      <p className={styles.boundary}>{locale === "zh" ? "以上为沟通准备主题，不是诊断、治疗建议、医院能力声明或接诊承诺。" : "These are conversation topics, not diagnosis, treatment advice, provider-capability claims or acceptance promises."}</p>
    </article>
  </div>;
}

export function HealthV6Faq({ locale }: { locale: Locale }) {
  return <div className={styles.faq} data-testid="health-v6-faq">
    {faqItems.map((item, index) => <details key={item.question[1]} data-testid={`health-v6-faq-${index + 1}`}>
      <summary>{copy(item.question, locale)}<span aria-hidden="true">＋</span></summary>
      <p>{copy(item.answer, locale)}</p>
    </details>)}
    <p className={styles.faqNote}>{locale === "zh" ? "FAQ 仅帮助准备问题；具体医疗、保险和跨境安排须向有权机构逐项核实。" : "The FAQ helps prepare questions; verify medical, insurance and cross-border arrangements with the responsible institutions."}</p>
  </div>;
}

