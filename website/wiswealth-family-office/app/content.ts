export type ServicePage = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  audience: string[];
  questions: string[];
  scope: string[];
  boundary: string;
};

export const servicePages: ServicePage[] = [
  {
    slug: "identity-hong-kong",
    eyebrow: "Identity & Hong Kong",
    title: "身份与香港发展",
    intro: "把身份选择、家庭居住、事业发展与真实经营放在同一条时间线上，形成可解释、可执行、可复盘的香港发展路径。",
    audience: ["正在评估香港身份或续签路径的家庭", "需要协调香港事业与家庭居住安排的人士", "希望建立真实经营与长期记录的企业主"],
    questions: ["身份安排与家庭长期目标是否一致？", "香港事业、居住与子女教育应如何排序？", "现有经营事实能否形成持续、可核验的记录？"],
    scope: ["家庭目标与身份路径梳理", "香港发展时间线与关键节点", "真实经营资料框架与专业方协同", "教育、保障及财富安排的联动检查"],
    boundary: "涉及入境、法律、税务或公司合规的具体意见，由相应专业机构独立评估和提供；智富家办不承诺审批结果。",
  },
  {
    slug: "education",
    eyebrow: "Education Planning",
    title: "跨境教育规划",
    intro: "教育选择不是一次申请，而是家庭身份、预算、居住地点与孩子成长节奏共同决定的长期安排。",
    audience: ["正在规划香港或海外升学的家庭", "需要协调身份与子女教育时间线的家庭", "希望为下一代建立长期成长路径的家长"],
    questions: ["孩子真正适合怎样的教育环境？", "家庭身份与教育申请时间是否匹配？", "教育投入如何与家庭现金流和长期目标协调？"],
    scope: ["家庭教育目标与时间线梳理", "跨境教育路径比较", "身份、居住与教育节点联动", "对接凤启环球或独立教育专业团队"],
    boundary: "智富家办负责家庭层面的教育时间线与资源协同；具体院校申请及教学服务由 Phoenix Nova™ 凤启环球或相应教育团队独立承接。",
  },
  {
    slug: "health-protection",
    eyebrow: "Health & Protection",
    title: "健康与家庭保障",
    intro: "以家庭成员、生命周期和跨境生活方式为起点，识别医疗、保障与健康管理之间的缺口。",
    audience: ["需要检查家庭保障结构的跨境家庭", "关注香港医疗与健康资源的人士", "希望提前安排长期健康支持的家庭"],
    questions: ["现有保障是否覆盖家庭真正承担不起的风险？", "不同地区的医疗资源如何衔接？", "健康管理与家庭现金流如何保持长期可持续？"],
    scope: ["家庭保障需求盘点", "跨境医疗资源协同", "健康管理路径与预算安排", "持牌保险及医疗专业方转介"],
    boundary: "保险产品意见由持牌人士提供，医疗诊断与治疗由合资格医疗机构负责；智富家办不替代保险建议或医疗意见。",
  },
  {
    slug: "wealth-legacy",
    eyebrow: "Wealth & Legacy",
    title: "财富与家族传承",
    intro: "财富规划不只关注增长，更关注家庭安全、流动性、风险隔离、选择空间与代际秩序。",
    audience: ["拥有跨境资产或事业安排的家庭", "正在考虑海外置业、信托或传承的人士", "希望建立家庭财富决策框架的企业主"],
    questions: ["家庭资产是否与未来责任和现金流匹配？", "不同地区的资产、税务与传承安排如何协同？", "哪些事项需要法律、税务或持牌金融机构参与？"],
    scope: ["家庭资产与现金流全景梳理", "风险隔离与流动性检查", "传承目标及家庭治理讨论", "法律、税务、信托及持牌机构协同"],
    boundary: "涉及投资、证券、基金、保险、信托、法律或税务的具体意见与执行，由相应持牌或合资格专业机构独立提供。",
  },
];

export type InsightArticle = {
  slug: string;
  pillar: "家庭规划" | "身份发展" | "健康保障" | "财富传承";
  title: string;
  summary: string;
  directAnswer: string;
  sections: Array<{ heading: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
  ownerBrand: "WisWealth" | "Phoenix Nova";
  sourceBrand: string;
  reuseMode: "original" | "brand-adapted";
  allowedBrands: Array<"WisWealth" | "Phoenix Nova">;
  kylinReviewStatus: "pending" | "passed" | "not-required";
  riskLevel: "general" | "professional-review";
  reviewedBy: string;
  lastVerified: string;
  status: "published" | "draft";
  relatedService: string;
};

export const insightArticles: InsightArticle[] = [
  {
    slug: "one-family-one-planning-map",
    pillar: "家庭规划",
    title: "为什么跨境家庭要把身份、教育、健康与财富放在同一张图上？",
    summary: "四项决定相互影响，分开处理容易造成时间、现金流与家庭目标之间的冲突。",
    directAnswer: "因为身份决定家庭可以在哪里生活，教育影响下一代的时间线，健康决定长期承载力，而财富为所有选择提供资源。真正有效的家庭规划，需要先看到它们之间的关系，再决定先后顺序。",
    sections: [
      { heading: "先看关系，而不是先选产品", body: "家庭面对的往往不是一个孤立问题。一次身份选择可能改变居住安排、教育节奏和资产配置；一项教育决定也可能带来长期现金流与陪伴方式的变化。" },
      { heading: "建立共同时间线", body: "把家庭成员、重要年份、身份节点、教育阶段、健康责任和资金需求放到同一时间线上，才能识别真正的优先级与冲突点。" },
      { heading: "让每个专业方看到同一目标", body: "法律、税务、教育、保险与医疗专业方各自解决不同问题。家庭需要一张共同路线图，确保专业意见最终服务于同一组长期目标。" },
    ],
    faqs: [
      { question: "家庭规划一定要一次完成吗？", answer: "不需要。先建立全景与优先级，再按家庭阶段逐步推进，并定期复盘。" },
      { question: "智富家办会直接提供所有专业服务吗？", answer: "不会。需要持牌或专业资格的事项，由相应机构独立提供意见和执行。" },
    ],
    ownerBrand: "Phoenix Nova",
    sourceBrand: "Phoenix Nova™ 共享家庭成长方法论",
    reuseMode: "brand-adapted",
    allowedBrands: ["WisWealth"],
    kylinReviewStatus: "pending",
    riskLevel: "general",
    reviewedBy: "WisWealth 品牌与边界审核",
    lastVerified: "2026-08-27",
    status: "published",
    relatedService: "identity-hong-kong",
  },
  {
    slug: "evidence-before-conclusion",
    pillar: "身份发展",
    title: "香港发展规划中，为什么真实记录比单一叙述更重要？",
    summary: "长期、连续且能够核验的事实记录，才可能支持清晰可信的家庭与事业安排。",
    directAnswer: "跨境发展涉及居住、事业、家庭与专业合规等多个层面。与其依赖临时解释，更重要的是从一开始保留真实、连续、能够相互印证的记录，并在需要时交由专业方评估。",
    sections: [
      { heading: "记录必须来自真实活动", body: "合同、沟通、办公、交易、人员与财务记录应与实际发生的业务一致，不能为了某个结果临时拼接。" },
      { heading: "连续性比数量更重要", body: "零散资料并不等于完整证据。清晰的时间线、事项之间的逻辑关系和持续更新，通常比单次集中准备更有价值。" },
      { heading: "结论交给相应专业方", body: "资料整理可以帮助家庭理解现状，但入境、法律、税务及公司合规判断仍应由相应专业机构独立完成。" },
    ],
    faqs: [{ question: "资料越多越好吗？", answer: "不是。重点是真实、相关、连续并能够解释家庭或事业发展的事实。" }],
    ownerBrand: "WisWealth",
    sourceBrand: "WisWealth 身份与香港发展方法论",
    reuseMode: "original",
    allowedBrands: ["WisWealth"],
    kylinReviewStatus: "not-required",
    riskLevel: "professional-review",
    reviewedBy: "WisWealth 内容边界审核",
    lastVerified: "2026-08-27",
    status: "published",
    relatedService: "identity-hong-kong",
  },
  {
    slug: "protection-before-product",
    pillar: "健康保障",
    title: "家庭保障规划，为什么不应该从某一份产品开始？",
    summary: "保障规划应先识别家庭责任和无法承受的风险，再由持牌人士匹配具体工具。",
    directAnswer: "不同家庭的成员结构、收入来源、负债、居住地区与医疗需求都不同。先买产品再寻找理由，容易造成保障重复或真正风险仍未覆盖。",
    sections: [
      { heading: "先识别家庭责任", body: "需要先了解谁依赖家庭收入、哪些医疗或照护成本最难承受，以及风险发生时现金流能维持多久。" },
      { heading: "再检查现有安排", body: "现有保障、公司福利、社会保障与可动用资产应放在一起评估，找出缺口，而不是简单追求更多产品。" },
      { heading: "最后才是工具选择", body: "具体保险建议与产品销售必须由持牌人士提供；医疗事项则由合资格医疗机构负责。" },
    ],
    faqs: [{ question: "智富家办是否直接推荐保险产品？", answer: "智富负责梳理家庭需求并协同资源；具体产品意见由持牌人士提供。" }],
    ownerBrand: "WisWealth",
    sourceBrand: "WisWealth 健康与家庭保障方法论",
    reuseMode: "original",
    allowedBrands: ["WisWealth"],
    kylinReviewStatus: "not-required",
    riskLevel: "professional-review",
    reviewedBy: "WisWealth 内容边界审核",
    lastVerified: "2026-08-27",
    status: "published",
    relatedService: "health-protection",
  },
  {
    slug: "legacy-is-an-order",
    pillar: "财富传承",
    title: "家族传承首先要传递的，为什么是一套秩序？",
    summary: "资产只是传承的一部分，决策规则、家庭责任与沟通机制决定长期价值能否延续。",
    directAnswer: "如果家庭成员不知道资产的目的、责任与决策方式，再复杂的工具也难以形成稳定传承。传承规划应先澄清家庭希望延续什么，再讨论结构与工具。",
    sections: [
      { heading: "先定义家庭长期目标", body: "家庭需要明确希望保护哪些成员、支持哪些成长目标，以及哪些价值与责任希望延续。" },
      { heading: "建立可理解的决策规则", body: "谁参与重大决定、信息如何共享、不同阶段如何复盘，都会影响家庭财富能否保持秩序。" },
      { heading: "工具必须服从目标", body: "信托、保险、公司或其他结构只解决特定问题，具体安排需要法律、税务及持牌专业机构参与。" },
    ],
    faqs: [{ question: "资产不多也需要考虑传承吗？", answer: "传承不仅是资产规模问题，也包括家庭责任、信息整理、受益安排与下一代教育。" }],
    ownerBrand: "WisWealth",
    sourceBrand: "WisWealth 财富与家族传承方法论",
    reuseMode: "original",
    allowedBrands: ["WisWealth"],
    kylinReviewStatus: "not-required",
    riskLevel: "professional-review",
    reviewedBy: "WisWealth 内容边界审核",
    lastVerified: "2026-08-27",
    status: "published",
    relatedService: "wealth-legacy",
  },
];

export const publishedInsights = insightArticles.filter(
  (article) =>
    article.status === "published" &&
    article.all