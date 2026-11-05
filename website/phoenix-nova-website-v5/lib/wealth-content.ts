export type Locale = "zh" | "en";
export type Copy = readonly [string, string];

export type WealthArticle = {
  slug: string;
  title: Copy;
  summary: Copy;
  category: Copy;
  region: string;
  sections: readonly { title: Copy; body: Copy }[];
  checklist: readonly Copy[];
};

export type WealthRegion = {
  slug: string;
  name: Copy;
  intro: Copy;
  questions: readonly Copy[];
  image: string;
};

export type WealthService = {
  slug: string;
  title: Copy;
  intro: Copy;
  items: readonly Copy[];
};

export const pick = (copy: Copy, locale: Locale): string =>
  copy[locale === "zh" ? 0 : 1];

export const wealthDimensions = [
  {
    code: "D1",
    name: ["家庭目标与决策协同", "Family goals & decision alignment"],
    description: [
      "目标是否清楚、参与人是否明确、重要决定能否形成并确认。",
      "Whether goals, roles and important decisions are clear and confirmed.",
    ],
  },
  {
    code: "D2",
    name: ["资产负债可视与结构", "Asset, liability visibility & structure"],
    description: [
      "是否能看清家庭、企业、资产、负债、保障与关键资料的整体关系。",
      "Whether the family can see the relationship between household, business, assets, liabilities, protection and key records.",
    ],
  },
  {
    code: "D3",
    name: ["现金流与应急韧性", "Cash flow & emergency resilience"],
    description: [
      "收入中断或重大支出发生时，家庭是否有足够缓冲与替代来源。",
      "Whether the family has enough buffer and alternatives if income stops or a major expense occurs.",
    ],
  },
  {
    code: "D4",
    name: ["保障与风险隔离", "Protection & risk separation"],
    description: [
      "关键成员、企业责任、担保与家庭风险是否被识别并定期复核。",
      "Whether key-person, business, guarantee and household risks are identified and reviewed.",
    ],
  },
  {
    code: "D5",
    name: ["跨境身份与税务协调", "Cross-border identity & tax coordination"],
    description: [
      "多地身份、迁居、账户、保单、公司与申报安排是否相互协调。",
      "Whether identities, moves, accounts, policies, companies and filings across places are coordinated.",
    ],
  },
  {
    code: "D6",
    name: [
      "传承治理与信息连续",
      "Succession governance & information continuity",
    ],
    description: [
      "关键资料、意愿、授权人与接班安排能否在需要时被找到并执行。",
      "Whether key records, wishes, permissions and succession arrangements can be found and used when needed.",
    ],
  },
] as const;

export const wealthServices: readonly WealthService[] = [
  {
    slug: "family-wealth-planning",
    title: ["家庭财富规划", "Family wealth planning"],
    intro: [
      "从家庭目标和人生阶段出发，把需要讨论的事项整理成可持续的规划节奏。",
      "Start with family goals and life stages, then organise the questions into a sustainable planning rhythm.",
    ],
    items: [
      ["家庭财富目标梳理", "Clarify family wealth goals"],
      ["家庭成员及决策角色", "Map family members and decision roles"],
      ["家庭未来重大支出", "Consider future major family expenses"],
      ["家庭财富规划阶段", "Set planning stages for the family"],
      ["家庭年度规划", "Review the family plan each year"],
    ],
  },
  {
    slug: "asset-structure",
    title: ["资产结构与风险管理", "Asset structure & risk management"],
    intro: [
      "以类别、关系和流动性为起点观察结构，避免在早期要求家庭提交精确金额。",
      "Review categories, relationships and liquidity first, without asking families for exact amounts at an early stage.",
    ],
    items: [
      ["家庭资产类别梳理", "Map household asset categories"],
      ["资产集中度观察", "Observe concentration across categories"],
      ["流动性需求", "Consider liquidity needs"],
      ["风险保障安排", "Review protection arrangements"],
      ["长期规划缺口识别", "Identify longer-term planning questions"],
    ],
  },
  {
    slug: "family-protection",
    title: ["家庭保障与长期安排", "Family protection & long-term arrangements"],
    intro: [
      "围绕责任、授权和人生节点整理保障问题；保险只是可能涉及的工具之一。",
      "Organise protection questions around responsibilities, permissions and life events; insurance is only one possible tool.",
    ],
    items: [
      ["家庭保障需求", "Consider family protection needs"],
      ["保险保障结构了解", "Understand the structure of insurance cover"],
      ["家庭成员责任安排", "Clarify family responsibilities"],
      ["重大人生节点", "Prepare for major life events"],
      [
        "长期保障与流动性考虑",
        "Balance long-term protection and liquidity questions",
      ],
    ],
  },
  {
    slug: "family-legacy",
    title: ["家族传承与长期规划", "Family succession & long-term planning"],
    intro: [
      "帮助家庭看见代际目标、资料连续和治理问题，并预留法律及税务专业核实环节。",
      "Help families see intergenerational goals, information continuity and governance questions, with room for legal and tax verification.",
    ],
    items: [
      ["家族成员及代际关系", "Understand family members and generations"],
      [
        "下一代成长及财富教育",
        "Support next-generation development and financial education",
      ],
      ["家族长期目标", "Define long-term family aims"],
      ["家庭财富传递问题", "Explore family wealth transfer questions"],
      [
        "专业法律及税务机构协作",
        "Coordinate questions for legal and tax professionals",
      ],
    ],
  },
  {
    slug: "cross-border-planning",
    title: ["跨境资源与全球布局", "Cross-border resources & global planning"],
    intro: [
      "先理解地区制度差异和家庭实际安排，再把问题交给相应地区的合资格专业人士核实。",
      "Understand regional differences and the family's actual arrangements first, then verify questions with appropriately qualified professionals in each place.",
    ],
    items: [
      [
        "香港及国际金融环境知识",
        "Learn about Hong Kong and international financial environments",
      ],
      ["跨境家庭资产安排问题", "Frame cross-border family asset questions"],
      ["不同地区的制度差异", "Compare institutional differences by region"],
      [
        "国际保险及专业机构协作",
        "Coordinate with international insurers and professionals",
      ],
      ["全球家庭长期规划", "Plan for a globally mobile family over time"],
    ],
  },
] as const;

export const wealthRegions: readonly WealthRegion[] = [
  {
    slug: "hong-kong",
    name: ["香港", "Hong Kong"],
    intro: [
      "从居住、家庭成员、账户与专业服务之间的关系出发，整理需要进一步核实的事项。",
      "Start with the relationships between residence, family members, accounts and professional services, then identify what needs verification.",
    ],
    questions: [
      [
        "家庭目前的居住与身份安排如何衔接？",
        "How do current residence and identity arrangements connect?",
      ],
      [
        "哪些家庭资料需要由授权人共同掌握？",
        "Which family records should authorised people be able to access?",
      ],
      [
        "哪些问题需要香港持牌或合资格专业人士核实？",
        "Which questions need verification by a Hong Kong licensed or qualified professional?",
      ],
    ],
    image: "/images/identity-v3/identity-hong-kong.png",
  },
  {
    slug: "gba",
    name: ["深圳／大湾区", "Shenzhen / Greater Bay Area"],
    intro: [
      "关注跨城市生活、家庭成员分工和企业与家庭边界，先列出事实，再分配专业核实任务。",
      "Consider cross-city living, family roles and the boundary between business and household, separating known facts from professional questions.",
    ],
    questions: [
      [
        "家庭成员是否在不同城市生活、工作或学习？",
        "Do family members live, work or study in different cities?",
      ],
      [
        "企业与家庭责任是否有清晰的资料边界？",
        "Is there a clear records boundary between business and household responsibilities?",
      ],
      [
        "跨境安排需要哪些地区专业人士共同确认？",
        "Which regional professionals need to confirm the cross-border arrangements?",
      ],
    ],
    image: "/images/identity-v3/identity-hong-kong.png",
  },
  {
    slug: "singapore",
    name: ["新加坡", "Singapore"],
    intro: [
      "以家庭生活节奏、教育安排和长期居住问题为线索，形成一份便于专业复核的事项清单。",
      "Use family routines, education arrangements and longer-term residence questions to create a list ready for professional review.",
    ],
    questions: [
      [
        "家庭未来三年的教育与居住节点是什么？",
        "What education and residence milestones matter in the next three years?",
      ],
      [
        "家庭成员和账户的资料由谁负责更新？",
        "Who keeps family-member and account records up to date?",
      ],
      [
        "哪些安排需要当地机构另行说明？",
        "Which arrangements require explanation from local institutions?",
      ],
    ],
    image: "/images/identity-v3/identity-family.png",
  },
  {
    slug: "united-kingdom",
    name: ["英国", "United Kingdom"],
    intro: [
      "把家庭目标、子女教育、居住变化与资料连续放在同一张问题地图中，不预设申请或税务结论。",
      "Place family goals, children's education, residence changes and record continuity on one question map without presuming an application or tax conclusion.",
    ],
    questions: [
      [
        "家庭成员的居住与教育变化会如何影响年度安排？",
        "How might residence and education changes affect the annual plan?",
      ],
      [
        "关键文件和授权信息是否能被家人找到？",
        "Can family members locate key records and permissions?",
      ],
      [
        "需要向哪类英国专业人士提出具体问题？",
        "Which type of UK professional should address the specific questions?",
      ],
    ],
    image: "/images/identity-v3/identity-family.png",
  },
  {
    slug: "united-states",
    name: ["美国", "United States"],
    intro: [
      "从多地身份、家庭现金流和资料治理入手，协助家庭准备跨地区专业沟通所需的背景。",
      "Begin with multi-place identity, family cash flow and record governance so the family can prepare for cross-regional professional conversations.",
    ],
    questions: [
      [
        "家庭的多地身份、居住和申报事项是否已有清单？",
        "Is there a list of the family's identities, residences and filing questions across places?",
      ],
      [
        "重大支出与应急储备由谁共同复核？",
        "Who reviews major expenses and emergency reserves together?",
      ],
      [
        "哪些事项必须由美国及其他地区专业人士分别确认？",
        "Which matters must be confirmed separately by US and other regional professionals?",
      ],
    ],
    image: "/images/identity-v3/identity-family.png",
  },
  {
    slug: "global",
    name: ["全球", "Global"],
    intro: [
      "为跨国或持续流动的家庭建立共同语言，帮助不同地区的顾问围绕同一组家庭问题协作。",
      "Create a shared language for internationally mobile families so advisers in different places can work from the same family questions.",
    ],
    questions: [
      [
        "家庭最重要的长期目标和优先顺序是什么？",
        "What are the family's most important long-term goals and priorities?",
      ],
      [
        "哪些资料需要由多个家庭成员和专业人士持续更新？",
        "Which records need ongoing updates by family members and professionals?",
      ],
      [
        "哪些结论只能在具体地区核实后再作决定？",
        "Which conclusions must wait for verification in the relevant region?",
      ],
    ],
    image: "/images/identity-v3/identity-family.png",
  },
] as const;

export const wealthArticles: readonly WealthArticle[] = [
  {
    slug: "family-goals",
    title: [
      "家庭目标：先把想守护的生活说清楚",
      "Family goals: make the life you want to protect clear",
    ],
    summary: [
      "从家庭成员、重要决定和未来一至三年的优先事项开始，建立共同语言。",
      "Start with family members, important decisions and priorities for the next one to three years.",
    ],
    category: ["目标与决策", "Goals & decisions"],
    region: "global",
    sections: [
      {
        title: ["先谈生活，再谈工具", "Talk about life before tools"],
        body: [
          "财富规划的第一步是确认家庭希望维持或实现什么生活：教育、居住、事业、照护、流动或传承。这里讨论的是目标和优先顺序，不是产品购买。",
          "The first step is to clarify the life the family wants to maintain or build: education, residence, work, care, mobility or succession. This is about priorities, not product purchase.",
        ],
      },
      {
        title: ["让决策角色可见", "Make decision roles visible"],
        body: [
          "记录谁提出目标、谁参与讨论、谁负责执行和谁需要被告知。实际家庭可以先用一页简短记录，定期回看是否仍然适合。",
          "Record who sets goals, joins discussions, executes decisions and needs to be informed. A short family record can be reviewed over time.",
        ],
      },
    ],
    checklist: [
      [
        "未来一至三年最重要的三件事",
        "The three most important priorities for the next one to three years",
      ],
      ["每项目标的时间节点和负责人", "A timing and owner for each priority"],
      ["需要共同确认的决定", "Decisions that need shared confirmation"],
      [
        "尚未想清楚、需要进一步讨论的地方",
        "Questions that still need discussion",
      ],
    ],
  },
  {
    slug: "asset-structure",
    title: [
      "资产结构：先建立看得懂的地图",
      "Asset structure: build a map the family can understand",
    ],
    summary: [
      "按类别和关系梳理家庭、企业、负债、保障及关键资料，不以精确金额作为起点。",
      "Map household, business, liabilities, protection and records by category and relationship, without starting from exact amounts.",
    ],
    category: ["结构与资料", "Structure & records"],
    region: "global",
    sections: [
      {
        title: [
          "类别比金额更适合第一步",
          "Categories are a better first step than amounts",
        ],
        body: [
          "早期可以先标记现金、房产、企业权益、投资、保障、信托或类似安排、负债与担保等类别，避免把敏感数字带入不必要的沟通。",
          "At an early stage, mark categories such as cash, property, business interests, investments, protection, trust-like arrangements, liabilities and guarantees without bringing sensitive figures into unnecessary conversations.",
        ],
      },
      {
        title: ["把资料与责任连起来", "Connect records with responsibility"],
        body: [
          "一张有效的结构清单还应说明资料在哪里、由谁更新、哪些人获授权查看。具体法律所有权、税务处理和资产配置仍需由合资格专业人士核实。",
          "A useful structure list also says where records are kept, who updates them and who is authorised to view them. Legal ownership, tax treatment and asset allocation require qualified professional review.",
        ],
      },
    ],
    checklist: [
      [
        "家庭与企业类别分开记录",
        "Record household and business categories separately",
      ],
      [
        "标记负债、担保和流动性问题",
        "Mark liabilities, guarantees and liquidity questions",
      ],
      ["为关键资料设置更新责任", "Assign an update owner for key records"],
      [
        "列出需要专业核实的结构问题",
        "List structure questions for professional verification",
      ],
    ],
  },
  {
    slug: "emergency-reserve",
    title: [
      "应急储备：让家庭在变化中保留选择",
      "Emergency reserves: keep room to choose when things change",
    ],
    summary: [
      "从必要支出、收入来源和可动用时间范围观察家庭韧性，不作收益或金额保证。",
      "Consider essential expenses, income sources and accessible time horizons without promising returns or a particular amount.",
    ],
    category: ["现金流与韧性", "Cash flow & resilience"],
    region: "global",
    sections: [
      {
        title: [
          "先知道家庭要撑多久",
          "Know how long the family needs to carry on",
        ],
        body: [
          "家庭可以先按日常必要支出估计应急覆盖期，使用区间而不是精确金额。重点是知道哪些支出不能中断、哪些收入来源较集中。",
          "Families can estimate an emergency coverage period against essential expenses using ranges rather than exact amounts. Focus on non-negotiable costs and concentrated income sources.",
        ],
      },
      {
        title: [
          "把应急安排写成行动顺序",
          "Turn emergency planning into an action order",
        ],
        body: [
          "记录谁可以在需要时找到资料、联系机构和确认下一步。具体现金管理、投资或借贷安排应由相关专业人士结合实际情况核实。",
          "Record who can find information, contact institutions and confirm the next step when needed. Specific cash management, investment or borrowing arrangements need professional review.",
        ],
      },
    ],
    checklist: [
      ["日常必要支出按区间估计", "Estimate essential expenses in ranges"],
      [
        "识别单一收入或地区依赖",
        "Identify reliance on one income source or place",
      ],
      [
        "列出可动用资料和授权人",
        "List accessible records and authorised people",
      ],
      [
        "确定需要进一步核实的现金流问题",
        "Identify cash-flow questions for further review",
      ],
    ],
  },
  {
    slug: "protection-review",
    title: [
      "保障复核：先问家庭责任，再看工具",
      "Protection review: start with responsibilities, then consider tools",
    ],
    summary: [
      "围绕关键成员、企业责任、担保与家庭风险建立复核清单，保险不等于完整方案。",
      "Review key people, business responsibilities, guarantees and family risks; insurance alone is not a complete plan.",
    ],
    category: ["保障与风险", "Protection & risk"],
    region: "global",
    sections: [
      {
        title: [
          "保障问题来自责任",
          "Protection questions come from responsibilities",
        ],
        body: [
          "家庭可以先问：谁依赖谁、哪些责任不能中断、哪些风险会跨越家庭与企业边界。这样能帮助专业人士更准确理解需要复核的范围。",
          "Start with who depends on whom, which responsibilities cannot stop, and which risks cross the household-business boundary. This helps professionals understand the review scope.",
        ],
      },
      {
        title: ["工具需要独立核实", "Tools need independent verification"],
        body: [
          "保险、储备、法律安排或其他风险管理工具各有边界。承保、条款、受益安排与理赔结果由相应机构和专业人士依据资料决定。",
          "Insurance, reserves, legal arrangements and other tools each have limits. Insurers and professionals determine cover, terms, beneficiary arrangements and claims outcomes from the evidence.",
        ],
      },
    ],
    checklist: [
      [
        "主要家庭责任与依赖关系",
        "Main family responsibilities and dependencies",
      ],
      [
        "企业责任、担保与风险外溢问题",
        "Business responsibilities, guarantees and spillover risks",
      ],
      ["最近一次系统复核时间", "When the last systematic review took place"],
      [
        "需要由何种专业人士确认的事项",
        "Questions for the relevant professional",
      ],
    ],
  },
  {
    slug: "cross-border",
    title: [
      "跨境安排：把不同地区的问题分开核实",
      "Cross-border planning: verify each regional question separately",
    ],
    summary: [
      "整理居住、身份、账户、企业和申报之间的关系，不把一般知识当成个案结论。",
      "Map the relationship between residence, identity, accounts, business and filings without treating general knowledge as case advice.",
    ],
    category: ["跨境与地区", "Cross-border & regions"],
    region: "global",
    sections: [
      {
        title: ["先画出地区关系", "Map the regional relationships first"],
        body: [
          "列出家庭涉及的国家或地区、居住变化、账户类别和企业关系，再标记哪些事实尚未确认。这个过程帮助家庭向不同地区的专业人士提出清晰问题。",
          "List the countries or regions, residence changes, account categories and business relationships involved, then mark unconfirmed facts. This helps families ask clear questions of professionals in each place.",
        ],
      },
      {
        title: ["专业边界必须保留", "Keep the professional boundary"],
        body: [
          "跨境税务、法律、投资与合规结论不能由网站内容替代。页面只提供问题框架，实际处理需由当地合资格专业人士依据最新资料确认。",
          "Cross-border tax, legal, investment and compliance conclusions cannot be replaced by website content. This page provides a question framework; local qualified professionals must confirm actual treatment.",
        ],
      },
    ],
    checklist: [
      [
        "涉及的国家或地区及时间节点",
        "Countries or regions involved and timing",
      ],
      [
        "居住、身份和账户关系",
        "Relationships among residence, identity and accounts",
      ],
      [
        "企业、保单和资料的所在地区",
        "Regions connected to business, policies and records",
      ],
      [
        "需要分别委托核实的专业问题",
        "Questions requiring separate professional verification",
      ],
    ],
  },
  {
    slug: "succession",
    title: [
      "传承治理：让重要信息能够连续",
      "Succession governance: keep important information continuous",
    ],
    summary: [
      "从资料索引、授权人、代际沟通和接班问题开始，建立可持续更新的家庭治理习惯。",
      "Start with record indexes, authorised people, intergenerational conversations and succession questions.",
    ],
    category: ["传承与治理", "Succession & governance"],
    region: "global",
    sections: [
      {
        title: [
          "信息连续先于文件堆积",
          "Continuity comes before a pile of documents",
        ],
        body: [
          "家庭可以先建立关键资料索引、联系人和行动顺序，明确谁在需要时能够找到信息。页面不接收遗嘱、信托或其他法律文件原件。",
          "Families can first create an index of key records, contacts and action order, identifying who can find information when needed. This page does not accept wills, trusts or other original legal documents.",
        ],
      },
      {
        title: [
          "传承安排需要专业合作",
          "Succession arrangements need professional collaboration",
        ],
        body: [
          "遗嘱、信托、公司治理、税务与受益安排的实际效力，需要由相应地区的法律及税务专业人士单独说明和确认。",
          "The legal effect of wills, trusts, company governance, tax and beneficiary arrangements must be explained and confirmed separately by legal and tax professionals in the relevant region.",
        ],
      },
    ],
    checklist: [
      ["关键资料索引与更新日期", "An index of key records and update dates"],
      ["备用联系人和授权范围", "Backup contacts and permission scope"],
      ["家人需要知道的行动顺序", "An action order the family should know"],
      [
        "需要法律或税务专业核实的安排",
        "Arrangements requiring legal or tax verification",
      ],
    ],
  },
] as const;

export const wealthFaqs: readonly { question: Copy; answer: Copy }[] = [
  {
    question: ["Wealth Compass 是什么？", "What is Wealth Compass?"],
    answer: [
      "Phoenix Wealth Compass™ 是面向家庭的中立财富结构评估与决策支持工具，帮助家庭了解规划清晰度、识别需要优先关注的问题，并形成下一步行动方向。它不是保险、基金、信托或投资产品销售工具。",
      "Phoenix Wealth Compass™ is a neutral family wealth-structure assessment and decision-support tool. It helps families understand planning clarity, identify priorities and shape next actions. It is not a sales tool for insurance, funds, trusts or investments.",
    ],
  },
  {
    question: [
      "页面会不会把我带入保险销售？",
      "Will this page lead me into insurance sales?",
    ],
    answer: [
      "不会。保险只是家庭财富规划可能涉及的工具之一，页面先讨论目标、结构、风险和资料连续。任何保险或其他专业服务都需要独立说明、另行授权和单独确认。",
      "No. Insurance is only one possible tool. The page starts with goals, structure, risks and information continuity. Any insurance or professional service requires separate explanation, authorisation and confirmation.",
    ],
  },
  {
    question: [
      "评估会收集精确资产金额吗？",
      "Will the assessment collect exact asset amounts?",
    ],
    answer: [
      "不会。Wealth Compass V1 不要求提交精确资产、收入、负债或保额，也不接收账号、证件、密码、病历、保单原件或法律文件。金额问题如需讨论，只使用预设区间。",
      "No. Wealth Compass V1 does not ask for exact assets, income, liabilities or cover amounts. It also does not accept account details, identity documents, passwords, medical records, original policies or legal documents. Any amount-related question uses ranges.",
    ],
  },
  {
    question: ["授权为什么要分开？", "Why are permissions separate?"],
    answer: [
      "评估数据处理、AI 辅助整理、顾问联系、特定伙伴共享和营销资讯是五类独立 consent，默认均未勾选。一次授权只对应明确的目的、机构、字段和记录，不能合并或预先代勾。",
      "Assessment processing, AI-assisted drafting, adviser contact, selected-partner sharing and marketing are five separate consents. All default to off. Each permission must name its purpose, organisation, fields and record; permissions cannot be bundled or preselected.",
    ],
  },
  {
    question: [
      "Family OS 会自动看到我的评估吗？",
      "Will Family OS automatically see my assessment?",
    ],
    answer: [
      "不会。进入 Family OS、保存长期记录或产生家庭时间线，需要单独的长期记录授权、明确权限和适用的数据治理流程。评估同意不自动推断长期记录同意。",
      "No. Family OS access, long-term records and family timeline entries require separate longitudinal consent, explicit permissions and applicable data-governance processes. Assessment consent does not imply longitudinal-record consent.",
    ],
  },
  {
    question: [
      "页面上的服务由谁实际提供？",
      "Who actually provides the services?",
    ],
    answer: [
      "Phoenix Nova 提供家庭问题梳理、知识服务和协作入口。法律、税务、投资、保险、信托、医疗或其他专业判断由相应的合资格专业机构和人士独立提供并承担责任。",
      "Phoenix Nova provides family-question framing, knowledge services and collaboration entry points. Legal, tax, investment, insurance, trust, medical and other professional judgments are provided and owned independently by appropriately qualified professionals and institutions.",
    ],
  },
  {
    question: [
      "提交咨询后能保证预约或结果吗？",
      "Does an enquiry guarantee an appointment or outcome?",
    ],
    answer: [
      "不能。咨询入口只用于了解需求和确认下一步，不能保证机构接纳、预约时段、签证、承保、投资结果或任何专业结论。实际服务范围、费用和时间需另行确认。",
      "No. The enquiry entry is for understanding needs and confirming next steps. It cannot guarantee institutional acceptance, appointment times, visas, cover, investment outcomes or professional conclusions. Scope, fees and timing must be confirmed separately.",
    ],
  },
  {
    question: [
      "跨境问题可以直接在这里得到税务结论吗？",
      "Can I get a tax conclusion here for a cross-border matter?",
    ],
    answer: [
      "不能。页面只帮助整理地区、身份、账户、企业和申报之间的问题。具体法律、税务、投资或合规结论必须由相关地区的合资格专业人士依据完整事实和最新资料核实。",
      "No. The page only helps frame questions across regions, identity, accounts, business and filings. Specific legal, tax, investment or compliance conclusions must be verified by qualified professionals in the relevant regions using complete and current facts.",
    ],
  },
] as const;
