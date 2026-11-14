export type InsightLocale = "zh" | "en";
export type ChannelId = "education" | "identity" | "wealth" | "health" | "perspectives";
export type Bi = { zh: string; en: string };
export const phrase = (locale: InsightLocale, value: Bi) => value[locale];

export const channels: { id: ChannelId; title: Bi; subtitle: Bi; description: Bi; image: string }[] = [
  { id: "education", title: { zh: "香港升学", en: "Hong Kong Education" }, subtitle: { zh: "教育洞察", en: "Education insights" }, description: { zh: "以官方申请渠道为起点，梳理不同背景家庭的升学路径。", en: "Explore admissions pathways from official sources and the questions that matter to each family." }, image: "/images/education-v3/education-hero.png" },
  { id: "identity", title: { zh: "身份政策", en: "Identity & Immigration" }, subtitle: { zh: "移居与居留", en: "Mobility & residence" }, description: { zh: "区分政策原文、申请条件与家庭规划判断。", en: "Separate official policy, eligibility and family planning considerations." }, image: "/images/identity-v3/identity-hong-kong.png" },
  { id: "wealth", title: { zh: "财富传承", en: "Wealth & Legacy" }, subtitle: { zh: "资产与保障", en: "Assets & protection" }, description: { zh: "理解监管变化，整理家庭长期保障与传承问题。", en: "Understand regulatory change and long-term family protection questions." }, image: "/images/wealth-v3/family-harbour.png" },
  { id: "health", title: { zh: "健康与医疗", en: "Global Health" }, subtitle: { zh: "跨境与保障", en: "Cross-border care" }, description: { zh: "核对医疗机构信息、费用与患者授权边界。", en: "Check provider information, charges and patient authorization boundaries." }, image: "/images/health-v21-navigation.jpg" },
  { id: "perspectives", title: { zh: "全球视野", en: "Global Perspectives" }, subtitle: { zh: "趋势与实践", en: "Trends & practice" }, description: { zh: "把教育、身份、财富和健康放回家庭决策的同一张地图。", en: "Connect education, identity, wealth and health in one family decision map." }, image: "/images/identity-v3/identity-world.png" },
];

export type Source = { name: string; url: string; publishedAt?: string; checkedAt: string };
export type ContentBlock =
  | { kind: "heading" | "paragraph" | "quote"; text: Bi }
  | { kind: "list"; items: Bi[] }
  | { kind: "table"; headers: [Bi, Bi]; rows: [Bi, Bi][] }
  | { kind: "image"; src: string; alt: Bi }
  | { kind: "link"; label: Bi; url: string };
export type Article = {
  slug: string; channel: ChannelId; title: Bi; summary: Bi; image: string; tags: Bi[];
  source: Source; keyPoints: Bi[]; facts: Bi[]; analysis: Bi[]; actions: Bi[];
  related: ChannelId[]; topic: string; featured?: boolean; contentBlocks?: ContentBlock[];
  status: "editorial-preview"; author: Bi; reviewer: null; publishedAt: null; updatedAt: null;
};
const checkedAt = "2026-11-14";
const source = (name: string, url: string, publishedAt?: string): Source => ({ name, url, publishedAt, checkedAt });
const bi = (zh: string, en: string): Bi => ({ zh, en });
export const articles: Article[] = [
  {
    slug: "hong-kong-undergraduate-application-routes", channel: "education", featured: true,
    title: bi("香港本科申请：先确认 JUPAS 与非联招路径", "Hong Kong undergraduate admissions: start with the right route"),
    summary: bi("从考试背景、院校要求和官方申请入口入手，先建立准确的申请路径清单。", "Start with qualifications, university requirements and official application routes before building a timeline."),
    image: "/images/identity-v3/identity-hong-kong.png", tags: [bi("本科申请", "Undergraduate"), bi("JUPAS", "JUPAS")],
    source: source("JUPAS — Official admissions system", "https://www.jupas.edu.hk/en/"),
    keyPoints: [bi("先确定自己的学历背景对应哪种入学渠道。", "Match your qualification to the appropriate admissions route first."), bi("课程要求和截止日期应以院校当届公布的信息为准。", "Use each university’s current-cycle requirements and deadlines."), bi("家庭时间表应留出材料准备与独立核验的时间。", "Allow time for documents and independent verification.")],
    facts: [bi("JUPAS 提供香港本地大学本科联招信息与申请入口。", "JUPAS provides official information and application access for relevant undergraduate programmes in Hong Kong."), bi("香港大学同时列出联招与国际学历申请入口。", "The University of Hong Kong publishes separate JUPAS and international-qualification routes.")],
    analysis: [bi("同一学校可能有不同申请渠道；以学历类别而非家庭居住地单独判断，是更稳妥的起点。", "One university may have several admissions routes. Qualification type is a safer starting point than residence alone.")],
    actions: [bi("记录现有学历、目标专业和拟申请年度；再逐校核对最新条件。", "List current qualifications, target programmes and intended intake; then verify current requirements university by university.")],
    contentBlocks: [
      { kind: "heading", text: bi("两条入口如何初步区分", "A first comparison of two routes") },
      { kind: "table", headers: [bi("入口", "Route"), bi("优先核对", "Check first")], rows: [[bi("JUPAS 联招", "JUPAS"), bi("联招资格与课程页面", "JUPAS eligibility and programme pages")], [bi("国际学历申请", "International qualifications"), bi("院校当届的学历要求与申请渠道", "Current institution requirements and application route")]] },
      { kind: "quote", text: bi("先确定路径，再建立时间表。", "Find the right route before building the timetable.") },
      { kind: "image", src: "/images/education-v3/education-hero.png", alt: bi("校园与学生场景示意", "Illustrative campus and students") },
      { kind: "link", label: bi("核对港大国际学历申请说明", "Check HKU international qualification guidance"), url: "https://admissions.hku.hk/apply/international-qualifications" },
    ],
    related: ["education"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "hku-jupas-route-checklist", channel: "education",
    title: bi("香港大学联招申请：如何核对课程要求", "HKU JUPAS: checking programme requirements"),
    summary: bi("以港大官方联招页面为例，建立课程、学科要求及申请节点的核对清单。", "Use HKU’s official JUPAS pages to check programme and subject requirements."),
    image: "/images/education-v3/education-hero.png", tags: [bi("本科申请", "Undergraduate"), bi("DSE", "DSE")],
    source: source("HKU Admissions — JUPAS", "https://admissions.hku.hk/apply/jupas"),
    keyPoints: [bi("先核对课程，再核对学科及语言要求。", "Check programmes before subject and language requirements.")],
    facts: [bi("港大设置联招申请说明页面。", "HKU publishes a dedicated JUPAS admissions page.")],
    analysis: [bi("热门专业和通用门槛不能替代具体课程要求。", "General entry thresholds cannot replace programme-specific requirements.")],
    actions: [bi("保存目标课程官方页面和核验日期。", "Save official programme links and the date checked.")],
    related: ["education"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "hku-international-qualifications", channel: "education",
    title: bi("国际学历申请香港大学：从资格路径开始", "Applying to HKU with international qualifications"),
    summary: bi("IB、A-Level 等背景家庭应先查看院校的国际学历申请路径。", "Families with IB, A-Level and other qualifications should check the university’s international route."),
    image: "/images/education-v3/education-academy.png", tags: [bi("非联招", "Non-JUPAS"), bi("IB", "IB"), bi("A-Level", "A-Level")],
    source: source("HKU Admissions — International Qualifications", "https://admissions.hku.hk/apply/international-qualifications"),
    keyPoints: [bi("申请入口取决于资格类别与院校规则。", "The route depends on the qualification and university rules.")],
    facts: [bi("港大公开国际学历申请指引。", "HKU publishes guidance for international qualifications.")],
    analysis: [bi("应逐校核对等值要求及语言证明。", "Check equivalencies and language evidence with each institution.")],
    actions: [bi("制作目标院校、学历、课程要求对照表。", "Create a comparison of institutions, qualifications and programme requirements.")],
    related: ["education"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "non-local-student-enrolment-ceiling", channel: "education",
    title: bi("香港非本地生名额上限：政策与个人录取分开看", "Hong Kong non-local enrolment ceiling: policy versus admission"),
    summary: bi("政策空间变化并不等于个别课程录取保证；先核对适用范围。", "A changed policy ceiling is not an individual admission guarantee; check scope first."),
    image: "/images/education-v3/education-tutoring.png", tags: [bi("招生政策", "Admissions policy"), bi("研究生申请", "Postgraduate")],
    source: source("Hong Kong Government Press Release", "https://www.info.gov.hk/gia/general/202509/17/P2025091700566.htm", "2025-09-17"),
    keyPoints: [bi("政策对象、院校类型和入学年度必须分开核对。", "Check affected programmes, institutions and academic year separately.")],
    facts: [bi("政府公布提高教资会资助专上院校非本地生上限的安排。", "The government announced an increase to the non-local student enrolment ceiling at UGC-funded institutions.")],
    analysis: [bi("名额上限是系统层面的政策，不是申请人的录取资格。", "An enrolment ceiling is a system-level policy, not applicant eligibility.")],
    actions: [bi("向目标课程核对实际招生办法与当届要求。", "Verify actual admission arrangements with the target programme.")],
    related: ["education"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "education-route-family-checklist", channel: "education",
    title: bi("家庭升学规划：一页梳理申请路径", "A one-page family admissions checklist"),
    summary: bi("把资格、学校、课程、时间和支持需求整理为可讨论的清单。", "Put qualifications, institutions, courses, timing and support needs on one page."),
    image: "/images/identity-v3/identity-family.png", tags: [bi("专题研究", "Research"), bi("国际升学", "International")],
    source: source("Education Bureau, Hong Kong", "https://www.edb.gov.hk/en/"),
    keyPoints: [bi("不同升学阶段需要不同官方信息。", "Different stages require different official sources.")],
    facts: [bi("教育局提供香港教育体系及学校相关公开信息。", "The Education Bureau publishes information about Hong Kong’s education system and schools.")],
    analysis: [bi("在选择机构前先明确家庭希望解决的问题。", "Clarify the family’s question before choosing a provider.")],
    actions: [bi("建立资料来源清单并记录更新日期。", "Create a source list and record update dates.")],
    related: ["education", "identity"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "education-source-verification", channel: "education",
    title: bi("升学信息怎么核验：官网、招生处与申请系统", "How to verify admissions information"),
    summary: bi("用学校与官方申请系统交叉核对课程、截止日期及文件要求。", "Cross-check programmes, deadlines and documents with institutions and official systems."),
    image: "/images/education-v3/education-hero.png", tags: [bi("院校动态", "University updates"), bi("专题研究", "Research")],
    source: source("JUPAS — Official admissions system", "https://www.jupas.edu.hk/en/"),
    keyPoints: [bi("截图和社交转发不能代替实时官方页面。", "Screenshots and social posts cannot replace live official pages.")],
    facts: [bi("联招系统集中提供参与院校的申请资讯。", "JUPAS provides application information for participating institutions.")],
    analysis: [bi("把来源与核验日期放进家庭的共同清单。", "Keep sources and check dates in a shared family checklist.")],
    actions: [bi("临近递交时再次核对各项要求。", "Recheck each requirement close to submission.")],
    related: ["education"], topic: "hong-kong-education", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "hong-kong-talent-scheme-guidance", channel: "identity",
    title: bi("香港人才入境安排：先看入境处现行指引", "Hong Kong talent pathways: start with current Immigration guidance"),
    summary: bi("政策更新应与个人资格分开理解；申请前核对具体计划。", "Read policy updates separately from individual eligibility and check the current scheme."),
    image: "/images/identity-v3/identity-cross-border.png", tags: [bi("身份政策", "Identity policy")],
    source: source("Hong Kong Immigration Department", "https://www.immd.gov.hk/eng/"),
    keyPoints: [bi("政策发布与个人获批是不同事项。", "Policy publication and individual approval are different matters.")],
    facts: [bi("入境事务处提供各类入境计划的官方指引。", "The Immigration Department provides official guidance on entry schemes.")],
    analysis: [bi("家庭成员安排和后续居留节点需要单独核对。", "Dependants and later residence milestones need separate checks.")],
    actions: [bi("记录拟申请计划、现行要求与待核实问题。", "Record the proposed scheme, current requirements and open questions.")],
    related: ["identity"], topic: "identity-global", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "insurance-regulatory-information", channel: "wealth",
    title: bi("香港保险监管资料：如何区分监管制度与个人保障", "Hong Kong insurance regulation versus personal cover"),
    summary: bi("认识风险为本资本制度，但家庭保障与理赔仍须查看具体保单。", "Understand risk-based capital rules while checking actual policy terms for cover and claims."),
    image: "/images/wealth-v3/family-harbour.png", tags: [bi("保障规划", "Protection")],
    source: source("Insurance Authority — Risk-based Capital Regime", "https://www.ia.org.hk/en/supervision/reg_insurers_lloyd/an_overview_of_the_risk_based_capital_regime.html"),
    keyPoints: [bi("监管规则不等同个人保单保障内容。", "Regulatory rules are not personal policy benefits.")],
    facts: [bi("香港保监局介绍风险为本资本制度。", "The Insurance Authority explains Hong Kong’s risk-based capital regime.")],
    analysis: [bi("家庭讨论保障时，应以保险合同与持牌专业人士解释为准。", "A family protection review should use the contract and qualified professional guidance.")],
    actions: [bi("整理保单与待核实问题，不公开上传个人财务资料。", "List policies and questions without uploading personal financial records publicly.")],
    related: ["wealth"], topic: "family-wealth", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "public-hospital-charge-check", channel: "health",
    title: bi("香港公营医疗收费：核对适用时间与身份类别", "Hong Kong public healthcare charges: check date and eligibility"),
    summary: bi("查看医管局发布的收费信息，并向医疗机构确认个人适用情况。", "Check Hospital Authority notices and confirm individual applicability with the provider."),
    image: "/images/health-v21-communication.jpg", tags: [bi("医疗费用", "Healthcare charges")],
    source: source("Hong Kong Government — Hospital Authority announcement", "https://www.info.gov.hk/gia/general/202503/25/P2025032500462p.htm", "2025-03-25"),
    keyPoints: [bi("收费时间与适用人群应以机构最新说明为准。", "Use the provider’s latest effective dates and eligibility information.")],
    facts: [bi("医管局曾公布公营医疗收费调整安排。", "The Hospital Authority published arrangements for public healthcare charge changes.")],
    analysis: [bi("海外家庭赴港前应确认身份类别、预约和费用。", "Overseas families should confirm eligibility, appointment routes and charges before travel.")],
    actions: [bi("向医疗机构与保险方分别确认责任与收费。", "Confirm costs and responsibilities separately with providers and insurers.")],
    related: ["health"], topic: "international-health", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
  {
    slug: "cross-domain-family-planning", channel: "perspectives",
    title: bi("跨境家庭规划：把四类决策放在同一张图上", "Cross-border family planning across four domains"),
    summary: bi("教育、身份、财富和医疗涉及不同机构；先整理事实与授权边界。", "Education, identity, wealth and health involve different authorities; organize facts and permissions."),
    image: "/images/identity-v3/identity-world.png", tags: [bi("全球视野", "Global perspectives")],
    source: source("Hong Kong Government information portal", "https://www.gov.hk/en/"),
    keyPoints: [bi("为各领域分别建立权威来源。", "Keep authoritative sources for each domain.")],
    facts: [bi("香港政府一站通提供多个公共服务与政策信息入口。", "GovHK provides entry points for multiple public services and policy information.")],
    analysis: [bi("家庭行动计划可以共享事项进度，但敏感医疗和财务资料必须分开授权。", "A family action plan may share task progress, while sensitive health and financial data need separate authorization.")],
    actions: [bi("先列决策、负责人、来源和下一次复核日期。", "List decisions, owners, sources and next review dates.")],
    related: ["education", "identity", "wealth", "health"], topic: "family-global", status: "editorial-preview", author: bi("凤启洞察编辑部", "Phoenix Insights Editorial"), reviewer: null, publishedAt: null, updatedAt: null,
  },
];
export const policies = [
  { channel: "education" as const, title: bi("非本地生招生上限调整", "Non-local student enrolment ceiling"), authority: bi("香港特别行政区政府", "HKSAR Government"), source: source("Government Press Release", "https://www.info.gov.hk/gia/general/202509/17/P2025091700566.htm", "2025-09-17"), effectiveLabel: bi("2026/27 学年起", "From academic year 2026/27"), effectiveAt: null, status: "已生效" as const, analysis: bi("适用名额与个人申请结果应分开核对。", "Check institutional ceilings separately from individual admissions.") },
  { channel: "identity" as const, title: bi("人才入境安排优化", "Talent admission measures"), authority: bi("香港特别行政区政府", "HKSAR Government"), source: source("Government Press Release", "https://www.info.gov.hk/gia/general/202411/01/P2024110100288.htm", "2024-11-01"), effectiveLabel: bi("以入境处现行指引为准", "Check current Immigration guidance"), effectiveAt: null, status: "已发布" as const, analysis: bi("申请资格和文件要求需按具体计划核对。", "Eligibility and documents depend on the specific scheme.") },
  { channel: "wealth" as const, title: bi("保险业风险为本资本制度", "Risk-based Capital Regime"), authority: bi("香港保险业监管局", "Insurance Authority"), source: source("Insurance Authority", "https://www.ia.org.hk/en/supervision/reg_insurers_lloyd/an_overview_of_the_risk_based_capital_regime.html"), effectiveLabel: bi("2024-07-01", "2024-07-01"), effectiveAt: "2024-07-01", status: "已生效" as const, analysis: bi("监管制度并非具体保单的理赔承诺。", "Regulation is not a claim promise under a particular policy.") },
  { channel: "health" as const, title: bi("公营医疗收费调整", "Public healthcare charges"), authority: bi("医院管理局", "Hospital Authority"), source: source("Government Press Release", "https://www.info.gov.hk/gia/general/202503/25/P2025032500462p.htm", "2025-03-25"), effectiveLabel: bi("2026-01-01", "2026-01-01"), effectiveAt: "2026-01-01", status: "已生效" as const, analysis: bi("就医前向机构确认实际收费与适用类别。", "Confirm actual charges and eligibility with the provider.") },
];
export const topics = [
  { slug: "hong-kong-education", title: bi("香港教育与全球升学", "Hong Kong education and global study"), image: "/images/education-v3/education-hero.png" },
  { slug: "identity-global", title: bi("香港身份与全球布局", "Hong Kong identity and global planning"), image: "/images/identity-v3/identity-global.png" },
  { slug: "family-wealth", title: bi("家庭财富与传承", "Family wealth and legacy"), image: "/images/wealth-v3/family-harbour.png" },
  { slug: "international-health", title: bi("国际医疗与健康规划", "International healthcare and health planning"), image: "/images/health-v2-landscape.png" },
];
export const faqs = [
  { question: bi("香港本科申请可以只看一个统一入口吗？", "Is there one route for all Hong Kong undergraduate applications?"), answer: bi("不能。应按学历背景核对 JUPAS、院校国际学历或其他适用入口。", "No. Check JUPAS, international qualifications and institution-specific routes according to your background."), channel: "education" as const },
  { question: bi("政策发布是否代表个人一定符合申请条件？", "Does a published policy mean I qualify?"), answer: bi("不代表。以主管机构的现行条件及个人情况核对。", "No. Check current authority rules against individual circumstances."), channel: "identity" as const },
  { question: bi("保险监管变化是否意味着保单保障变化？", "Does an insurance regulation change my cover?"), answer: bi("不一定。具体保障与理赔以合同、保险机构及持牌人士说明为准。", "Not necessarily. Check the contract, insurer and qualified adviser."), channel: "wealth" as const },
  { question: bi("跨境就医前需要准备什么？", "What should I prepare before cross-border care?"), answer: bi("先向医疗机构确认预约、费用及资料授权；医疗判断由合资格专业人员负责。", "Confirm appointments, fees and records authorization with the provider. Clinical decisions belong to qualified professionals."), channel: "health" as const },
];
export function searchArticles(input: { channel?: ChannelId; query?: string; tag?: string; page?: number; pageSize?: number }) {
  const q = (input.query ?? "").trim().toLocaleLowerCase();
  const tag = (input.tag ?? "").trim().toLocaleLowerCase();
  const filtered = articles.filter(a => (!input.channel || a.channel === input.channel) && (!q || [a.title.zh, a.title.en, a.summary.zh, a.summary.en, a.channel, ...a.tags.flatMap(t => [t.zh, t.en])].some(v => v.toLocaleLowerCase().includes(q))) && (!tag || a.tags.some(t => [t.zh, t.en].some(v => v.toLocaleLowerCase() === tag))));
  const pageSize = Math.min(20, Math.max(1, input.pageSize ?? 5));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.isFinite(input.page) ? Math.floor(input.page!) : 1));
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pages };
}
export const channelById = (id: string) => channels.find(c => c.id === id);
export const articleBySlug = (slug: string) => articles.find(a => a.slug === slug);
