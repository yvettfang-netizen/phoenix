export const identityServices = [
  { id: "hong-kong", title: ["香港身份规划", "Hong Kong identity planning"], image: "/images/identity-v3/identity-hong-kong.png", alt: ["香港维多利亚港城市景观示意", "An illustrative view of Victoria Harbour, Hong Kong"],
    body: ["围绕香港人才及相关身份政策，结合申请人的个人背景、家庭情况与发展目标，分析适合的申请路径。", "Explore suitable pathways under Hong Kong talent and related residency policies, taking personal background, family circumstances and development goals into account."],
    detail: ["先厘清目标与基本条件，再核对官方申请要求、所需材料及后续安排。具体可行性由实际政策及个人情况决定。", "Clarify goals and basic circumstances, then verify official requirements, materials and follow-up arrangements. Feasibility depends on current policy and individual circumstances."] },
  { id: "global", title: ["全球身份与居留规划", "Global identity & residency planning"], image: "/images/identity-v3/identity-global.png", alt: ["伦敦泰晤士河及城市景观示意", "An illustrative view of London and the River Thames"],
    body: ["整合多国身份与居留方案，结合家庭需求与国际发展方向，提供全球身份规划建议。", "Consider identity and residency options across destinations in the context of family needs and international development goals."],
    detail: ["比较居住、家庭衔接与长期发展方向，不将目的地展示视为申请资格判断。当地法律和税务问题需由具备相应资质的专业人士核实。", "Compare residence, family transitions and long-term goals. Displaying a destination is not an eligibility determination. Local legal and tax questions require appropriately qualified professionals."] },
  { id: "family", title: ["家庭发展与子女衔接", "Family development & children’s transitions"], image: "/images/identity-v3/identity-family.png", alt: ["家长陪伴孩子前往校园的成长场景示意", "An illustrative family and children’s learning scene"],
    body: ["统筹身份规划、子女教育及家庭长期发展需求，为家庭不同阶段做好准备。", "Connect identity planning, children’s education and longer-term family development, preparing for different stages of family life."],
    detail: ["把家庭成员的实际需要、学习阶段及搬迁节奏放在一起讨论。教育衔接需独立核对院校与地区要求，不承诺录取或入学资格。", "Discuss family needs, learning stages and relocation timing together. Education transitions require separate verification of institutional and regional requirements; admission is not guaranteed."] },
  { id: "cross-border", title: ["长期发展与跨境安排", "Long-term growth & cross-border arrangements"], image: "/images/identity-v3/identity-cross-border.png", alt: ["现代机场与国际出行准备场景示意", "An illustrative modern airport and international travel scene"],
    body: ["围绕事业、投资、家庭生活及跨境发展需求，提供更具前瞻性的全球布局建议。", "Consider work, investment, family life and cross-border needs within a forward-looking global plan."],
    detail: ["先梳理跨境生活与事业的协调事项，再明确项目范围和专业分工。一般规划不替代法律、税务、投资或资产配置意见。", "Identify coordination needs across work and family life, then agree scope and professional responsibilities. General planning does not replace legal, tax, investment or asset-allocation advice."] },
] as const;

export const identityValues = [
  { icon: "umbrella", title: ["未雨绸缪，从容应对变化", "Prepare ahead. Respond with confidence."], body: ["提前规划，降低不确定性带来的影响，在风雨中依然保持主动。", "Plan ahead to better understand uncertainty and retain more room to respond when circumstances change."] },
  { icon: "signpost", title: ["更多选择，拓展人生可能", "More choices. Wider possibilities."], body: ["了解与比较全球多元身份与居留选择，为教育、事业、职业与生活探索更广阔的空间。", "Understand and compare identity and residency options, exploring possibilities for education, work and everyday life."] },
  { icon: "family", title: ["家庭传承，守护下一代未来", "A family perspective. A future for the next generation."], body: ["为子女教育、国际流动与长期发展提供更清晰的支持与安排。", "Bring greater clarity to children’s education, international mobility and longer-term development."] },
  { icon: "shield", title: ["长期稳定，构建全球生活方式", "A long-term view. A global way of life."], body: ["统筹事业与生活的全球化安排，从家庭需要出发，审慎理解长期选择与风险。", "Consider global work and living arrangements through the family’s needs, with a careful view of long-term choices and risks."] },
] as const;

export const identityProcess = [
  { icon: "conversation", title: ["深入沟通", "Understand"], body: ["了解家庭背景、发展目标及身份规划需求。", "Understand family circumstances, development goals and identity-planning needs."], detail: ["初步沟通无需提交护照、身份证或完整家庭档案。", "An initial conversation does not require passports, identity documents or a full family record."] },
  { icon: "search", title: ["方案定制", "Shape a plan"], body: ["结合政策、申请条件及家庭情况，匹配适合的国家与路径。", "Consider destinations and pathways in light of policies, requirements and family circumstances."], detail: ["路径需进一步核实，不代表已经符合资格或能够获批。", "Pathways require further verification and do not establish eligibility or guarantee approval."] },
  { icon: "document", title: ["专业执行", "Coordinate"], body: ["提供约定范围内的资料准备、申请协调与进度跟进。", "Coordinate preparation, applications and progress within the agreed scope."], detail: ["具体服务以双方确认的项目范围及授权为准。", "Services depend on the agreed project scope and authorisation."] },
  { icon: "family", title: ["落地协助", "Support transitions"], body: ["根据实际项目范围，协助处理后续安排与家庭衔接事项。", "Support follow-up arrangements and family transitions within the actual project scope."], detail: ["目的地与在地支持能力需逐项确认，不暗示已设立当地办公室。", "Destination support must be verified individually; no local office is implied."] },
  { icon: "shield", title: ["长期陪伴", "Review over time"], body: ["持续关注政策变化与后续身份规划需求。", "Review policy changes and evolving identity-planning needs over time."], detail: ["持续支持的内容、期限与费用在服务约定中确认。", "The scope, duration and cost of ongoing support are confirmed in the service agreement."] },
] as const;

export const identityConsultationOptions = [
  ["hong-kong", "香港身份规划", "Hong Kong identity planning"],
  ["global", "全球身份与居留规划", "Global identity & residency planning"],
  ["family", "家庭及子女发展规划", "Family & children’s development"],
  ["cross-border", "长期跨境发展规划", "Long-term cross-border planning"],
  ["explore", "希望先了解规划方向", "Explore the planning approach first"],
] as const;
