/**
 * Phoenix Wealth Compass V1 frozen business rules.
 *
 * This module is deliberately pure and dependency-free. It is the only page
 * layer import needed for rendering the public Wealth Compass explainer and
 * assessment preview. It does not persist answers, call a database, or infer
 * a professional legal, tax, investment, insurance or trust conclusion.
 *
 * English copy in this file is an engineering translation for the bilingual
 * website. The frozen business rule is the Chinese copy and option code.
 */

export type Copy = readonly [string, string];

export type QuestionOption = Readonly<{
  code: string;
  label: Copy;
  score: number | null;
}>;

export type Question = Readonly<{
  id: string;
  dimension: string;
  text: Copy;
  multiple?: boolean;
  max?: number;
  exclusive?: readonly string[];
  options: readonly QuestionOption[];
  allowOther?: boolean;
}>;

export type Answers = Readonly<Record<string, Readonly<{
  codes: readonly string[];
  other?: string;
}>>>;

export const VERSIONS = Object.freeze({
  questionBank: "WC-QB-1.0.0",
  scoringRules: "WC-SR-1.0.0",
  consentCopy: "WC-CC-1.0.0",
  personaPack: "WC-PT-1.0.0",
  locale: "zh-CN",
} as const);

const c = (zh: string, en: string): Copy => [zh, en] as const;
const option = (code: string, zh: string, en: string, score: number | null): QuestionOption => ({
  code,
  label: c(zh, en),
  score,
});

const skip = option("SKIP", "暂不回答", "Prefer not to answer", null);

const q01 = [
  option("A", "主要相关成员都有明确角色", "All key members have clear roles", 100),
  option("B", "主要由一人牵头，其他成员会参与确认", "One person leads, with confirmation from others", 70),
  option("C", "主要由一人决定，其他成员较少参与", "One person decides with limited participation", 30),
  option("D", "角色不清楚，或经常难以达成一致", "Roles are unclear or agreement is often difficult", 0),
  skip,
] as const;
const q02 = [
  option("EDUCATION", "子女教育", "Children's education", 100),
  option("IDENTITY", "身份或迁居", "Identity or relocation", 100),
  option("LIQUIDITY", "现金流与重大支出", "Cash flow and major spending", 100),
  option("BUSINESS", "企业与家庭边界", "Business and family boundaries", 100),
  option("PROTECTION", "保障与风险", "Protection and risk", 100),
  option("CROSS_BORDER", "跨境安排", "Cross-border arrangements", 100),
  option("SUCCESSION", "传承与接班", "Succession and continuity", 100),
  option("OTHER", "其他", "Other", 100),
  option("UNCLEAR", "暂未想清楚", "Not clear yet", 30),
  skip,
] as const;
const q03 = [
  option("A", "1 个", "1", 100), option("B", "2 个", "2", 80), option("C", "3 个", "3", 55),
  option("D", "4 个及以上", "4 or more", 30), option("E", "不确定", "Uncertain", 20), skip,
] as const;
const q04 = [
  option("A", "有固定讨论、记录和复核方式", "Fixed discussion, record and review process", 100),
  option("B", "会共同讨论，但主要靠口头确认", "Discussed together, mostly confirmed verbally", 70),
  option("C", "多由一人处理，较少记录", "Mostly handled by one person, rarely recorded", 40),
  option("D", "没有固定方式或存在明显冲突", "No fixed process or clear conflict", 0), skip,
] as const;
const q05 = [
  option("A", "有，且过去 12 个月更新过", "Yes, updated within the past 12 months", 100),
  option("B", "有多份分散记录，大部分可找到", "Several scattered records, mostly findable", 65),
  option("C", "只有部分记录，信息明显不完整", "Partial records with clear gaps", 35),
  option("D", "没有统一记录", "No unified record", 0), skip,
] as const;
const q06 = [
  option("CASH", "现金与存款", "Cash and deposits", 100), option("PROPERTY", "房产", "Property", 100),
  option("BUSINESS", "企业权益", "Business interests", 100), option("INVESTMENT", "投资", "Investments", 100),
  option("PROTECTION", "保障", "Protection", 100), option("TRUST", "信托或类似安排", "Trust or similar arrangements", 100),
  option("DEBT", "负债或担保", "Debt or guarantees", 100), option("OTHER", "其他", "Other", 100),
  option("UNSURE", "不确定", "Uncertain", 25), skip,
] as const;
const q07 = [
  option("A", "12 个月以上", "More than 12 months", 100), option("B", "6–12 个月", "6–12 months", 80),
  option("C", "3–6 个月", "3–6 months", 55), option("D", "少于 3 个月", "Less than 3 months", 20),
  option("E", "基本没有", "Almost none", 0), option("F", "不确定", "Uncertain", 20), skip,
] as const;
const q08 = [
  option("A", "有多个相对独立来源", "Several relatively independent sources", 100),
  option("B", "有一个主要来源，也有可用的补充来源", "One main source and usable supplementary sources", 70),
  option("C", "高度依赖单一来源", "Highly dependent on one source", 40),
  option("D", "单一来源已中断或近期很可能中断", "The single source has stopped or may stop soon", 0), skip,
] as const;
const q09 = [
  option("A", "12 个月内", "Within 12 months", 100), option("B", "1–3 年前", "1–3 years ago", 70),
  option("C", "3 年以上", "More than 3 years ago", 35), option("D", "从未系统复核", "Never systematically reviewed", 0),
  option("E", "不确定", "Uncertain", 20), skip,
] as const;
const q10 = [
  option("NONE", "暂无明确担心", "No clear concern", 100), option("MARKET", "市场波动", "Market volatility", 70),
  option("HEALTH", "健康或关键人风险", "Health or key-person risk", 50), option("CASHFLOW", "现金流", "Cash flow", 35),
  option("BUSINESS_LIABILITY", "企业责任", "Business liability", 20), option("GUARANTEE", "担保或责任外溢", "Guarantees or liability spillover", 20),
  option("INFO_BREAK", "信息断层", "Information continuity", 50), option("LEGAL_TAX_DISPUTE", "已存在法律或税务争议", "Existing legal or tax dispute", 0),
  option("OTHER", "其他", "Other", 50), skip,
] as const;
const q11 = [
  option("A", "暂无已知变化", "No known change", 100), option("B", "可能发生，尚未确定", "Possible, not yet certain", 70),
  option("C", "已确定，预计 12 个月以后发生", "Confirmed, expected after 12 months", 55),
  option("D", "已确定，预计 12 个月内发生", "Confirmed, expected within 12 months", 20),
  option("E", "正在发生", "Currently happening", 0), skip,
] as const;
const q12 = [
  option("A", "清楚，且已由合适专业人士复核", "Clear and reviewed by an appropriate professional", 100),
  option("B", "大致清楚，尚未整体复核", "Mostly clear, not reviewed as a whole", 70),
  option("C", "只清楚部分关系", "Only some relationships are clear", 40), option("D", "不清楚", "Unclear", 0),
  option("E", "不适用：目前无跨境安排", "Not applicable: no cross-border arrangements", 100), skip,
] as const;
const q13 = [
  option("A", "已有完整安排，且定期复核", "Complete arrangements reviewed regularly", 100),
  option("B", "已有部分安排，但可能过时或未衔接", "Partial arrangements, possibly outdated or unlinked", 60),
  option("C", "讨论过，但尚未形成正式安排", "Discussed but not formalised", 35), option("D", "尚未开始", "Not started", 0),
  option("E", "不确定", "Uncertain", 20), skip,
] as const;
const q14 = [
  option("A", "能，有清单、备用联系人和明确顺序", "Yes, with a list, backup contact and clear order", 100),
  option("B", "大部分能找到，但仍依赖口头说明", "Mostly findable, but still relies on verbal explanation", 70),
  option("C", "主要只有一人知道", "Mostly known by one person", 40), option("D", "基本无法找到或无人知道如何处理", "Hard to find and no one knows what to do", 0),
  option("E", "不确定", "Uncertain", 20), skip,
] as const;

export const QUESTIONS: readonly Question[] = Object.freeze([
  { id: "Q01", dimension: "D1", text: c("目前家庭的重要财富决定，通常由谁参与？", "Who usually participates in important family wealth decisions?"), options: q01 },
  { id: "Q02", dimension: "D1", text: c("未来 1–3 年，家庭最想优先解决哪些问题？", "Which priorities does the family most want to address in the next 1–3 years?"), multiple: true, max: 3, exclusive: ["UNCLEAR", "SKIP"], allowOther: true, options: q02 },
  { id: "Q03", dimension: "D5", text: c("家庭当前的居住地、身份、账户、企业或主要资产大约涉及几个国家或地区？", "How many countries or regions are involved in the family's residence, identity, accounts, business or main assets?"), options: q03 },
  { id: "Q04", dimension: "D1", text: c("重要财富决定目前通常如何形成并确认？", "How are important wealth decisions usually formed and confirmed?"), options: q04 },
  { id: "Q05", dimension: "D2", text: c("资产、负债、公司、保单及关键文件是否有统一清单？", "Does the family have a unified list of assets, liabilities, companies, policies and key files?"), options: q05 },
  { id: "Q06", dimension: "D2", text: c("家庭目前涉及哪些类别？只选类别，不填写名称、账号或金额。", "Which categories does the family currently involve? Select categories only; do not enter names, accounts or amounts."), multiple: true, exclusive: ["UNSURE", "SKIP"], allowOther: true, options: q06 },
  { id: "Q07", dimension: "D3", text: c("可随时动用的家庭应急资金，大致能覆盖日常必要支出多久？", "Approximately how long can readily available emergency funds cover essential spending?"), options: q07 },
  { id: "Q08", dimension: "D3", text: c("家庭收入是否集中依赖单一成员、企业或地区？", "Is family income concentrated in one member, business or region?"), options: q08 },
  { id: "Q09", dimension: "D4", text: c("保障与风险安排最近一次系统复核是什么时候？", "When was the last systematic review of protection and risk arrangements?"), options: q09 },
  { id: "Q10", dimension: "D4", text: c("目前最担心哪些风险？最多选 3 项。", "Which risks are the family most concerned about? Select up to 3."), multiple: true, max: 3, exclusive: ["NONE", "SKIP"], allowOther: true, options: q10 },
  { id: "Q11", dimension: "D5", text: c("未来三年是否可能发生身份、税务居民、迁居、升学或企业结构变化？", "Could there be changes in identity, tax residence, relocation, education or business structure in the next three years?"), options: q11 },
  { id: "Q12", dimension: "D5", text: c("对跨境账户、保单、公司与税务申报之间的关系是否清楚？", "How clear is the relationship between cross-border accounts, policies, companies and tax filings?"), options: q12 },
  { id: "Q13", dimension: "D6", text: c("是否已有传承、授权、遗嘱、信托或接班安排？只问状态，不上传文件。", "Are there succession, authorisation, will, trust or continuity arrangements? Status only; do not upload files."), options: q13 },
  { id: "Q14", dimension: "D6", text: c("如果关键负责人暂时无法处理事务，家人能否找到资料、联系人和行动顺序？", "If a key person could not handle affairs temporarily, could the family find the records, contacts and order of action?"), options: q14 },
] as const);

export const DIMENSIONS = Object.freeze([
  { code: "D1", name: c("家庭目标与决策协同", "Family goals and decision alignment"), weights: { Q01: 40, Q02: 30, Q04: 30 }, action: c("确认家庭目标、参与人和决策时间表", "Confirm family goals, participants and a decision timetable") },
  { code: "D2", name: c("资产负债可视与结构", "Asset, liability visibility and structure"), weights: { Q05: 60, Q06: 40 }, action: c("建立不含账号与精确金额的结构清单", "Build a structure list without account details or exact amounts") },
  { code: "D3", name: c("现金流与应急韧性", "Cash flow and emergency resilience"), weights: { Q07: 55, Q08: 45 }, action: c("核对应急覆盖期和收入集中度", "Review emergency coverage and income concentration") },
  { code: "D4", name: c("保障与风险隔离", "Protection and risk separation"), weights: { Q09: 45, Q10: 55 }, action: c("安排保障、担保与责任边界复核", "Review protection, guarantees and responsibility boundaries") },
  { code: "D5", name: c("跨境身份与税务协调", "Cross-border identity and tax coordination"), weights: { Q03: 25, Q11: 35, Q12: 40 }, action: c("列出地区、变化节点和需要专业核实的问题", "List regions, change milestones and questions for professional verification") },
  { code: "D6", name: c("传承治理与信息连续", "Succession governance and information continuity"), weights: { Q13: 50, Q14: 50 }, action: c("建立关键资料索引、备用联系人和行动顺序", "Build a key-record index, backup contacts and order of action") },
] as const);

export const CONSENTS = Object.freeze([
  { code: "C1", title: c("同意用于完成本次家庭财富结构测评", "Consent to complete this family wealth structure assessment"), body: c("我同意 Phoenix Nova 按本页说明收集和处理我的选择，用于生成 Wealth Compass 测评结果、保存进度、质量检查和必要的安全审计。我知道这不是法律、税务、投资、保险或信托意见，也不会要求我提交账号、证件或精确资产金额。", "I consent to Phoenix Nova collecting and processing my choices as described on this page to generate a Wealth Compass result, save progress, run quality checks and conduct necessary security audits. I understand this is not legal, tax, investment, insurance or trust advice, and I will not be asked for account details, identity documents or exact asset amounts.") },
  { code: "C2", title: c("同意使用 AI 辅助整理结果", "Consent to AI-assisted result organisation"), body: c("我同意系统使用 AI 对我的结构化答案进行归纳和生成报告草稿。AI 不作专业结论；出现复杂、冲突或高风险信号时，结果将标记为需要人工复核。", "I consent to the system using AI to summarise my structured answers and generate a report draft. AI does not provide professional conclusions; complex, conflicting or high-risk signals are marked for human review.") },
  { code: "C3", title: c("希望由顾问联系我解释报告", "I would like an adviser to contact me about the report"), body: c("我同意 Phoenix Nova 的顾问使用我的姓名、联系方式、测评编号、六维结果和我选择的关注事项联系我，仅用于解释报告和确认下一步。我不勾选也可以查看已生成的报告。", "I consent to a Phoenix Nova adviser using my name, contact details, assessment ID, six dimension results and selected concerns to contact me only to explain the report and confirm the next step. I can view the generated report without selecting this option.") },
  { code: "C4", title: c("同意将所选资料共享给〔机构全名〕", "Consent to share selected information with [full institution name]"), body: c("为处理我选择的〔服务类别〕，我同意 Phoenix Nova 将下列已勾选资料共享给〔机构全名〕：〔字段清单〕。共享目的仅为〔具体目的〕。该机构与 Phoenix Nova 的关系为〔关联／合作披露〕，实际服务由该机构另行说明、签约、收费并承担责任。", "For the selected [service category], I consent to Phoenix Nova sharing the checked information with [full institution name]: [field list]. The sole purpose is [specific purpose]. The institution's relationship with Phoenix Nova is [relationship / collaboration disclosure]; it explains, contracts, charges for and takes responsibility for its own services separately.") },
  { code: "C5", title: c("愿意接收 Phoenix Nova 的后续资讯", "I would like to receive Phoenix Nova updates"), body: c("我愿意通过我选择的方式接收与家庭成长、教育、身份或财富规划有关的内容和活动信息。我可以随时取消；拒绝不会影响测评、报告或顾问解释。", "I would like to receive information and event updates about family growth, education, identity or wealth planning through my chosen channel. I can unsubscribe at any time; declining does not affect the assessment, report or adviser explanation.") },
] as const);

const QUESTION_MAP = new Map(QUESTIONS.map((question) => [question.id, question]));
const DIMENSION_MAP = new Map(DIMENSIONS.map((dimension) => [dimension.code, dimension]));
const BAND = (score: number | null): Copy => {
  if (score === null) return c("信息不足", "Insufficient information");
  if (score >= 80) return c("较清晰", "Clear");
  if (score >= 60) return c("有待完善", "Needs refinement");
  if (score >= 40) return c("需要关注", "Needs attention");
  return c("优先核实", "Priority to verify");
};

const sensitivePattern = /(身份证|护照|港澳通行证|银行|证券|支付|虚拟资产|账号|账户|密码|验证码|私钥|税号|税表|保单号|病历|诊断|基因|原件|上传|流水|交易明细|受益人|遗嘱|股权|付款|收款|password|passcode|one[- ]time password|\botp\b|verification(?:\s+)?code|account(?:\s+number)?|passport|tax(?:\s+id| number)|bank(?:\s+account)?|policy(?:\s+number)?|medical record|diagnosis|genetic|beneficiar(?:y|ies)|exact amount|precise amount|\b(?:HKD|CNY|RMB|USD|GBP|EUR)\b)/i;
const eightDigits = /\d{8,}/;
const exactAmount = /[$¥￥€£]\s*\d|\d[\d,.]*\s*(?:元|万|亿|million|billion|dollars|yuan|pounds)/i;

export function validateAnswer(question: Question, answer: unknown): string | null {
  if (!question || typeof question !== "object" || !Array.isArray(question.options)) return "INVALID_QUESTION";
  if (!answer || typeof answer !== "object") return "INVALID_ANSWER";
  if (Object.keys(answer).some((key) => key !== "codes" && key !== "other")) return "INVALID_ANSWER";
  const raw = answer as { codes: unknown[]; other?: unknown };
  if (!Array.isArray(raw.codes)) return "INVALID_ANSWER";
  if (raw.other !== undefined && typeof raw.other !== "string") return "INVALID_OTHER";
  const codes = [...raw.codes].filter((code): code is string => typeof code === "string");
  if (codes.length !== raw.codes.length) return "INVALID_OPTION";
  if (codes.length === 0) return "ANSWER_REQUIRED";
  const optionCodes = new Set(question.options.map((item) => item.code));
  if (codes.some((code) => !optionCodes.has(code))) return "INVALID_OPTION";
  if (new Set(codes).size !== codes.length) return "DUPLICATE_OPTION";
  if (question.multiple !== true && codes.length !== 1) return "MULTIPLE_NOT_ALLOWED";
  if (question.max !== undefined && codes.length > question.max) return "MAX_SELECTION";
  if (question.exclusive?.some((code) => codes.includes(code)) && codes.length > 1) return "EXCLUSIVE_CONFLICT";
  if (codes.includes("SKIP") && codes.length !== 1) return "EXCLUSIVE_CONFLICT";
  if (raw.other !== undefined && !codes.includes("OTHER")) return "INVALID_OTHER";
  if (raw.other !== undefined && !question.allowOther) return "OTHER_NOT_ALLOWED";
  if (raw.other !== undefined && [...raw.other as string].length > 50) return "OTHER_TOO_LONG";
  if (raw.other !== undefined && (sensitivePattern.test(raw.other as string) || eightDigits.test(raw.other as string) || exactAmount.test(raw.other as string))) return "SENSITIVE_INPUT_BLOCKED";
  return null;
}

function optionScore(question: Question, codes: readonly string[]): number | null {
  const options = new Map(question.options.map((item) => [item.code, item.score]));
  if (codes.includes("SKIP")) return null;
  const scores = codes.map((code) => options.get(code) ?? null).filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  // Q10 uses the lowest selected risk score; Q02 and Q06 are 100 for a
  // concrete selection and therefore naturally use the lowest score too.
  return Math.min(...scores);
}

function selected(answers: Answers, id: string, code: string): boolean {
  return answers[id]?.codes.includes(code) ?? false;
}

function otherText(answers: Answers): string {
  return Object.values(answers).map((answer) => answer.other ?? "").join(" ");
}

export type ScoreResult = Readonly<{
  dimensions: readonly { code: string; readiness: number | null; gap: number | null; confidence: number; band: Copy }[];
  topGaps: readonly string[];
  flags: readonly { code: string; dimension: string }[];
  manualReviewRequired: boolean;
  reportStatus: "READY" | "NEEDS_MORE_INFO";
  answeredCount: number;
  actions: readonly Copy[];
}>;

/** Frozen internal workflow calculation. Not included in the customer result. */
export function internalOverallScore(result: Pick<ScoreResult, "dimensions">): number | null {
  const values = result.dimensions.flatMap((dimension) => dimension.readiness === null ? [] : [dimension.readiness]);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export function score(answers: Answers): ScoreResult {
  let invalidAnswer = false;
  const valid = new Map<string, number | null>();
  const safeAnswers: Record<string, { codes: readonly string[]; other?: string }> = {};
  const rawAnswers: Record<string, unknown> = answers && typeof answers === "object" ? answers as Record<string, unknown> : {};
  for (const [id, answer] of Object.entries(rawAnswers)) {
    const question = QUESTION_MAP.get(id);
    if (!question || validateAnswer(question, answer) !== null) {
      invalidAnswer = true;
      continue;
    }
    const safeAnswer = answer as { codes: readonly string[]; other?: string };
    safeAnswers[id] = safeAnswer;
    valid.set(id, optionScore(question, safeAnswer.codes));
  }
  const dimensions = DIMENSIONS.map((dimension) => {
    const entries = Object.entries(dimension.weights);
    let weightAnswered = 0;
    let weighted = 0;
    for (const [questionId, weight] of entries) {
      const questionScore = valid.get(questionId);
      if (questionScore === undefined || questionScore === null) continue;
      weightAnswered += weight;
      weighted += questionScore * weight;
    }
    const confidence = Math.round((100 * weightAnswered) / 100);
    const readiness = weightAnswered === 0 ? null : Math.round(weighted / weightAnswered);
    return { code: dimension.code, readiness, gap: readiness === null ? null : 100 - readiness, confidence, band: BAND(readiness) };
  });

  const flags: { code: string; dimension: string }[] = [];
  const q05 = safeAnswers.Q05?.codes[0];
  if (((q05 === "C" || q05 === "D") && selected(safeAnswers, "Q06", "BUSINESS")) || /企业.{0,12}(家庭|资金).{0,12}(混用|混合|混在一起|混杂|未分开)|家庭.{0,12}(企业|资金).{0,12}(混用|混合|混在一起|混杂|未分开)/i.test(otherText(safeAnswers))) {
    flags.push({ code: "MIXED_BUSINESS_FAMILY_FUNDS", dimension: "D2" });
  }
  if (selected(safeAnswers, "Q11", "D") || selected(safeAnswers, "Q11", "E")) flags.push({ code: "IDENTITY_CHANGE_IMMINENT", dimension: "D5" });
  if (selected(safeAnswers, "Q14", "C") || selected(safeAnswers, "Q14", "D")) flags.push({ code: "SINGLE_INFORMATION_HOLDER", dimension: "D6" });
  if ((selected(safeAnswers, "Q03", "C") || selected(safeAnswers, "Q03", "D") || selected(safeAnswers, "Q03", "E")) && (selected(safeAnswers, "Q12", "B") || selected(safeAnswers, "Q12", "C") || selected(safeAnswers, "Q12", "D"))) {
    flags.push({ code: "CROSS_BORDER_UNREVIEWED", dimension: "D5" });
  }
  if (selected(safeAnswers, "Q07", "E")) flags.push({ code: "NO_EMERGENCY_LIQUIDITY", dimension: "D3" });
  if (selected(safeAnswers, "Q10", "LEGAL_TAX_DISPUTE")) flags.push({ code: "LEGAL_TAX_DISPUTE", dimension: "D4" });

  const flagDimensions = new Set(flags.map((flag) => flag.dimension));
  const ranked = dimensions
    .filter((dimension) => dimension.gap !== null && dimension.gap >= 20)
    .sort((a, b) => {
      if (b.gap !== a.gap) return (b.gap ?? 0) - (a.gap ?? 0);
      const bRisk = flagDimensions.has(b.code) ? 1 : 0;
      const aRisk = flagDimensions.has(a.code) ? 1 : 0;
      return bRisk - aRisk || a.code.localeCompare(b.code);
    })
    .slice(0, 3);
  const topGaps = ranked.map((dimension) => dimension.code);
  const actions = ranked.map((dimension) => DIMENSION_MAP.get(dimension.code)!.action);
  const answeredCount = [...valid.entries()].filter(([, value]) => value !== null).length;
  const sufficient = !invalidAnswer && answeredCount >= 10 && dimensions.every((dimension) => dimension.readiness !== null && dimension.confidence >= 60);
  const manualReviewRequired = invalidAnswer || flags.length > 0 || dimensions.some((dimension) => dimension.readiness === null);
  return { dimensions, topGaps, flags, manualReviewRequired, reportStatus: sufficient ? "READY" : "NEEDS_MORE_INFO", answeredCount, actions };
}
