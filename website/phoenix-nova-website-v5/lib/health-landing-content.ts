export type HealthLocale = "zh" | "en";
export type HealthCopy = readonly [string, string];

export type HealthEntry = {
  id: "family" | "medical" | "partner";
  label: HealthCopy;
  title: HealthCopy;
  body: HealthCopy;
  points: readonly HealthCopy[];
  cta: HealthCopy;
};

export const healthHero = {
  zh: {
    eyebrow: "全球健康与跨境医疗",
    title: "全家人的健康，是更远未来的起点。",
    subtitle: "连接大湾区优质医疗资源，让跨境就医更便捷、更从容。",
    body: "凤启环球面向海外华人、国际人士及中国内地家庭，连接香港、深圳及粤港澳大湾区的医疗资源，协助客户了解不同医疗机构的专科服务、诊疗安排与费用选择。从医疗预约、语言沟通，到跨境行程、在地支持及保险理赔协助，我们希望让每一次重要的医疗安排都更加清晰、省心。",
  },
  en: {
    eyebrow: "GLOBAL HEALTH & CROSS-BORDER MEDICAL SERVICES",
    title: "Your Family's Health, the Start of a Brighter Tomorrow.",
    subtitle: "Access healthcare options across Hong Kong, Shenzhen and the Greater Bay Area with greater clarity and confidence.",
    body: "Phoenix Nova™ helps families in China and abroad explore specialist care, understand hospital arrangements and coordinate appointments, language support, travel and insurance claims administration.",
  },
} as const;

export const healthEntries: readonly HealthEntry[] = [
  {
    id: "family",
    label: ["家庭健康规划", "Family health planning"],
    title: ["家庭健康规划", "Family health planning"],
    body: ["从家庭健康事务、成员授权到长期服务进度，先把需要安排的事项放进同一张清晰地图。", "Bring family health arrangements, member permissions and long-term service progress into one clear map."],
    points: [["家庭健康安排", "Family arrangements"], ["健康罗盘", "Health Compass"], ["长期服务规划", "Long-term planning"], ["家庭成员授权", "Member permissions"]],
    cta: ["进入家庭健康规划", "Enter family health planning"],
  },
  {
    id: "medical",
    label: ["大湾区跨境医疗服务", "Greater Bay Area cross-border care"],
    title: ["大湾区跨境医疗服务", "Greater Bay Area cross-border care"],
    body: ["了解香港及深圳等大湾区城市的就医信息与协调路径，海外及内地家庭均可直接开始沟通。", "Explore care information and coordination pathways across Hong Kong, Shenzhen and other Greater Bay Area cities."],
    points: [["香港机构信息与协调", "Hong Kong information & coordination"], ["大湾区内地城市安排", "Mainland GBA arrangements"], ["海外客户就医准备", "Overseas care preparation"], ["预约与服务条件核实", "Appointment and scope checks"]],
    cta: ["了解跨境医疗服务", "Explore cross-border care"],
  },
  {
    id: "partner",
    label: ["医疗服务合作伙伴", "Medical service partners"],
    title: ["医疗服务合作伙伴", "Medical service partners"],
    body: ["面向获准合作的保险、医疗协调及专业机构，介绍合作边界与受控工作台状态。", "For authorised insurance, healthcare coordination and professional partners, with clear scope and controlled workspace status."],
    points: [["香港保险从业机构", "Hong Kong insurance organisations"], ["海外医疗服务机构", "Overseas healthcare services"], ["医疗协调合作机构", "Medical coordination partners"], ["受控工作台预览", "Controlled workspace preview"]],
    cta: ["了解合作方式", "Explore partnership"],
  },
] as const;

export const healthStrengths: readonly { icon: "globe" | "leaf" | "users" | "shield"; title: HealthCopy; body: HealthCopy }[] = [
  { icon: "globe", title: ["国际医疗资源", "International care resources"], body: ["从正规渠道出发，按目的地核实医疗机构、就诊流程与服务条件。", "Start with official channels and verify institutions, care pathways and service conditions by destination."] },
  { icon: "leaf", title: ["全生命周期规划", "Planning across life stages"], body: ["关注家庭不同阶段的健康事务安排，让准备与协调持续衔接。", "Support health arrangements through changing family stages, connecting preparation with ongoing coordination."] },
  { icon: "users", title: ["专业协调陪伴", "Professional coordination"], body: ["协助整理预约、语言支持、行程与后续事项，降低跨境沟通负担。", "Coordinate appointments, language support, travel arrangements and follow-up to ease cross-border communication."] },
  { icon: "shield", title: ["家庭健康支持", "Family-centred support"], body: ["尊重每位家庭成员的意愿与授权，让需要协作的事务更清晰。", "Respect each family member's preferences and permissions, bringing clarity to shared arrangements."] },
] as const;

export const healthServices: readonly { image: string; title: HealthCopy; subtitle: HealthCopy; body: HealthCopy; alt: HealthCopy }[] = [
  { image: "photo1", title: ["医疗机构与预约协调", "Provider and appointment coordination"], subtitle: ["就医前评估协调", "Pre-visit coordination"], body: ["根据客户的就医需求，协助了解香港、深圳及大湾区相关医疗机构的专科资源、接诊流程与预约要求。", "Based on your care needs, explore specialist resources, intake processes and appointment requirements across Hong Kong, Shenzhen and the Greater Bay Area."], alt: ["医疗机构与预约协调场景示意", "Illustrative provider and appointment coordination scene"] },
  { image: "photo2", title: ["医疗翻译与患者导航", "Medical interpretation and patient navigation"], subtitle: ["专业医疗翻译 · 国际患者导航", "Medical interpretation · International patient navigation"], body: ["根据需要协调中文、英文医疗沟通、资料翻译及就诊流程支持，帮助患者与医护人员更顺畅地交流。", "Coordinate Chinese and English medical communication, document translation and visit navigation as needed, helping patients and clinicians communicate more smoothly."], alt: ["医疗翻译与患者导航场景示意", "Illustrative interpretation and patient navigation scene"] },
  { image: "photo3", title: ["跨境就医安排", "Cross-border care arrangements"], subtitle: ["国际患者导航", "International patient navigation"], body: ["围绕医疗预约、跨境行程、就诊准备及目的地安排，协调所需的非临床支持。", "Coordinate non-clinical support around appointments, cross-border travel, visit preparation and destination arrangements."], alt: ["跨境就医安排场景示意", "Illustrative cross-border care arrangement scene"] },
  { image: "photo4", title: ["在地服务支持", "On-the-ground support"], subtitle: ["在地就医礼宾", "Local care concierge"], body: ["根据约定范围协调交通、住宿、陪诊及家属生活支持，改善跨境就医期间的服务体验。", "Coordinate transport, accommodation, accompaniment and family support within the agreed scope to improve the care journey experience."], alt: ["在地服务支持场景示意", "Illustrative on-the-ground support scene"] },
  { image: "photo5", title: ["后续跟进与保险理赔协助", "Follow-up and insurance claims assistance"], subtitle: ["国际保险理赔协助", "International insurance claims assistance"], body: ["协助复诊安排、后续行政沟通、保险材料整理及理赔流程跟进。", "Assist with follow-up visit arrangements, administrative communications, insurance document preparation and claims process follow-up."], alt: ["医疗文件整理与保险理赔行政场景示意", "Illustrative medical document and claims administration scene"] },
] as const;

export const gbaValues: readonly { title: HealthCopy; body: HealthCopy }[] = [
  { title: ["深港医疗专家资源", "Hong Kong and Shenzhen specialist resources"], body: ["连接香港与内地医疗专业资源，根据实际就医需求，协助了解相应专科、医生及医疗机构的服务安排。具体医生资格、专科和出诊情况以医院实际确认。", "Connect with healthcare resources in Hong Kong and mainland cities, helping you explore relevant specialties, doctors and provider arrangements. Qualifications, specialties and schedules are subject to provider confirmation."] },
  { title: ["国际化语言服务", "International language support"], body: ["部分大湾区私立医疗机构可能提供普通话、粤语及英语沟通支持；医院自有语言能力与凤启另行协调的翻译服务分别确认。", "Some private providers in the Greater Bay Area may offer Mandarin, Cantonese and English support. Provider language capabilities and separately coordinated interpretation are confirmed independently."] },
  { title: ["更具竞争力的医疗费用", "Potentially competitive medical costs"], body: ["深圳部分私立医疗项目相较香港及英国同类私立服务，可能具备费用竞争力。具体报价须结合专科、检查、治疗方案和病房类别，以医院实际确认。", "Some private care in Shenzhen may offer competitive costs compared with similar private services in Hong Kong or the UK. Estimates depend on specialty, tests, treatment and room category and must be confirmed by the provider."] },
  { title: ["舒适宽敞的住院环境", "Comfortable inpatient environments"], body: ["部分国际化私立医院可能提供独立病房、家庭陪护空间及更注重私密性的住院环境；房型、设施和护理安排以医院实际确认。", "Some international private hospitals may offer private rooms, family spaces and a greater focus on privacy. Room types, facilities and care arrangements are subject to provider confirmation."] },
  { title: ["更便捷的预约安排", "More convenient appointment planning"], body: ["通过提前沟通、了解医院接诊安排及预约要求，协助客户提高就医准备效率；不得理解为零等待或保证接诊。", "By discussing provider arrangements and requirements early, we help improve preparation efficiency. This does not mean zero waiting or guaranteed acceptance."] },
  { title: ["保险理赔与后续服务", "Insurance claims and follow-up support"], body: ["协助核对保单资料要求、预授权流程、理赔申请和补件事项，提供约定范围内的后续行政协调；保险结果由保险机构确认。", "Help check policy requirements, pre-authorisation, claims and follow-up documents within an agreed administrative scope. Insurers decide coverage and payment."] },
] as const;

export const healthJourney: readonly { title: HealthCopy; body: HealthCopy }[] = [
  { title: ["初步咨询与需求整理", "Initial conversation and needs mapping"], body: ["沟通当前所在地区、目的地、时间、语言与陪同需要，先确认协调支持是否适合。", "Discuss current region, destination, timing, language and accompaniment needs to confirm whether coordination fits."] },
  { title: ["医疗机构信息及资料准备", "Provider information and preparation"], body: ["核实公开机构信息、科室路径与资料要求；患者资料须经单独授权并通过受控渠道处理。", "Verify public provider information, departments and document requirements. Patient information requires separate authorisation and controlled handling."] },
  { title: ["预约与费用条件确认", "Appointment and fee conditions"], body: ["分别核对机构报价、协调费用、预约条件及取消条款，确认范围后再安排。", "Check provider estimates, coordination fees, appointment conditions and cancellation terms separately before arrangements proceed."] },
  { title: ["跨境行程与就诊安排", "Cross-border travel and visit arrangements"], body: ["按确认范围协调香港或大湾区城市的行程、预约、翻译与非临床支持。", "Coordinate travel, appointments, interpretation and non-clinical support in Hong Kong or Greater Bay Area cities within the confirmed scope."] },
  { title: ["在地协调与服务支持", "On-the-ground coordination and support"], body: ["协助患者及同行家人理解现场流程；接诊、检查与治疗判断由医疗机构负责。", "Help patients and accompanying family understand on-site steps. Institutions make acceptance, examination and treatment decisions."] },
  { title: ["后续跟进与保险理赔行政协助", "Follow-up and claims administration"], body: ["整理后续待办、理赔行政清单与沟通节点；保险公司确认承保和赔付，医疗机构确认复诊安排。", "Organise follow-up tasks, claims administration and communication points. Insurers confirm coverage and payment; providers confirm follow-up care."] },
] as const;

export const familyStages: readonly { title: HealthCopy; body: HealthCopy; image: string }[] = [
  { title: ["儿童青少年", "Children and teenagers"], body: ["围绕成长阶段，梳理家庭陪同、正规咨询渠道与日常健康事务安排。", "Organise family accompaniment, official channels and everyday arrangements through the growing years."], image: "lifePhoto1" },
  { title: ["成年家庭", "Adult families"], body: ["协调预约、家庭事务分工与资料授权，为不同生活阶段做好准备。", "Coordinate appointments, shared responsibilities and permissions through changing family stages."], image: "lifePhoto2" },
  { title: ["长者照护", "Older family members"], body: ["尊重长者意愿，提前商量陪同、备用协助与持续跟进。", "Respect older relatives' wishes while discussing accompaniment, backup support and continued follow-up."], image: "lifePhoto3" },
] as const;

export const healthRegions: readonly HealthCopy[] = [["香港", "Hong Kong"], ["深圳及大湾区内地城市", "Shenzhen and mainland Greater Bay Area cities"], ["英国及其他海外地区", "The UK and other overseas regions"]] as const;

export const healthFaqs: readonly { question: HealthCopy; answer: HealthCopy }[] = [
  { question: ["凤启是否提供医疗诊断和治疗？", "Does Phoenix Nova provide diagnosis or treatment?"], answer: ["不提供。Phoenix Nova™ 提供非临床协调与礼宾支持，医学判断、诊断、治疗、处方及紧急医疗服务由合资格医疗机构和专业人员负责。", "No. Phoenix Nova™ provides non-clinical coordination and concierge support. Qualified medical institutions and professionals provide clinical judgement, diagnosis, treatment, prescriptions and emergency care."] },
  { question: ["海外客户可以如何赴大湾区就医？", "How can overseas clients explore care in the Greater Bay Area?"], answer: ["可先沟通当前所在地、目的地、时间、语言及陪同需要，再逐项核实机构要求、预约条件及行程安排。具体接诊与入境事项须向相应机构和主管部门确认。", "Start by discussing your current region, destination, timing, language and accompaniment needs, then verify provider requirements, appointment conditions and travel arrangements. Acceptance and entry matters must be confirmed with the relevant institutions and authorities."] },
  { question: ["中国内地家庭可以使用哪些协调服务？", "What coordination can families in mainland China explore?"], answer: ["可了解跨地区预约协调、语言支持、资料准备、在地陪同及后续行政跟进。服务内容、费用和可用性须按实际需求确认。", "Families in mainland China can explore cross-region appointment coordination, language support, preparation, local accompaniment and follow-up administration. Scope, fees and availability are confirmed case by case."] },
  { question: ["香港与内地医院的费用如何确认？", "How are Hong Kong and mainland provider costs confirmed?"], answer: ["医疗机构的报价、检查治疗费用、协调服务费、交通住宿及保险费用分别确认，估算不等于最终账单。", "Provider estimates, medical charges, coordination fees, travel, accommodation and insurance costs are confirmed separately. Estimates are not final bills."] },
  { question: ["是否能够更快安排预约？", "Can an appointment be arranged faster?"], answer: ["不作保证。我们可协助了解可用时段和预约要求，但接诊、排期和医疗优先级由医疗机构决定。", "No outcome is guaranteed. We can help clarify availability and requirements, while providers decide acceptance, scheduling and clinical priority."] },
  { question: ["有保险的客户需要提前准备什么？", "What should insured clients prepare?"], answer: ["可先向保险机构核实保障范围、预授权、直付及所需资料。请勿在本公开页面提交保单、病历或身份证件。", "Verify coverage, pre-authorisation, direct billing and required documents with the insurer. Do not submit policies, records or identity documents on this public page."] },
  { question: ["可以申请保险理赔协助吗？", "Can I explore insurance claims assistance?"], answer: ["可以了解约定范围内的行政协助，包括资料清单、预授权和补件沟通。承保、赔付金额及处理时限由保险机构依据保单和资料决定。", "You can explore administrative support within an agreed scope, including document lists, pre-authorisation and follow-up communications. Insurers decide coverage, payment amounts and processing times under the policy and evidence."] },
  { question: ["如何保护个人病历及医疗资料？", "How are medical records and personal information protected?"], answer: ["本页面不接收病历或医疗文件。未来如需处理敏感资料，必须单独取得患者级授权并通过受控服务端、权限和审计机制处理。", "This page does not receive medical records or files. Any future sensitive-data handling requires patient-level authorisation and controlled server-side access and audit mechanisms."] },
  { question: ["家庭中心能够查看什么？", "What can Family Center show?"], answer: ["家庭中心是受控入口，可按授权显示健康规划、服务申请状态、预约、协调任务及后续提醒。原始病历、理赔文件和原始问卷答案不会自动进入普通家庭时间轴。", "Family Center is a controlled entry that may show authorised planning, service status, appointments, coordination tasks and reminders. Raw records, claims files and raw questionnaire answers are not automatically added to a general family timeline."] },
  { question: ["正式医疗服务如何确认及付款？", "How are formal services confirmed and paid?"], answer: ["正式服务须由可信渠道确认服务范围、合同、费用、付款对象、取消和退款安排。医院预约与收费、医学决定及保险赔付结果分别由相应机构确认。", "Formal services require a trusted channel to confirm scope, contract, fees, payees, cancellation and refund terms. Providers confirm appointments and medical charges, clinical decisions and insurance outcomes are determined by the relevant institutions."] },
] as const;

export function healthText(copy: HealthCopy, locale: HealthLocale) {
  return copy[locale === "zh" ? 0 : 1];
}
