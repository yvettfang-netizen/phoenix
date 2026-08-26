import type { IdentityPathCode } from "@/lib/identity/path-registry";
import type { NormalizedIdentityAnswers } from "@/lib/identity/path-engine";

export const DYNAMIC_QUESTION_BANK_VERSION = "IDENTITY_DYNAMIC_BASELINE_V1.0" as const;

export type DynamicAnswerType = "text" | "number" | "date" | "single_select";

export type DynamicQuestion = Readonly<{
  question_id: string;
  field_key: string;
  question_text: string;
  help_text: string;
  answer_type: DynamicAnswerType;
  options?: readonly Readonly<{ value: string; label: string }>[];
  path_scope: readonly IdentityPathCode[];
  required_when: string;
  source_type: "APPROVED_PHOENIX_BASELINE" | "OFFICIAL";
  source_ref: string;
  version: typeof DYNAMIC_QUESTION_BANK_VERSION;
  active_status: "ACTIVE";
  sensitivity: "NONE" | "PERSONAL" | "SENSITIVE";
}>;

const statusOptions = [
  { value: "not_started", label: "尚未开始" },
  { value: "preparing", label: "准备中" },
  { value: "pending", label: "已递交 / 等待中" },
  { value: "confirmed", label: "已有结果或文件" },
  { value: "not_applicable", label: "不适用" },
  { value: "unknown", label: "不确定" },
] as const;

const yesNoUnsureOptions = [
  { value: "yes", label: "是" },
  { value: "no", label: "否" },
  { value: "unsure", label: "不确定" },
] as const;

function question(
  value: Omit<DynamicQuestion, "version" | "active_status" | "source_type">,
): DynamicQuestion {
  return {
    ...value,
    source_type: "APPROVED_PHOENIX_BASELINE",
    version: DYNAMIC_QUESTION_BANK_VERSION,
    active_status: "ACTIVE",
  };
}

export const DYNAMIC_IDENTITY_QUESTIONS: readonly DynamicQuestion[] = [
  question({
    question_id: "ID_DYN_SHARED_AGE",
    field_key: "age_exact",
    question_text: "你的准确年龄是？",
    help_text: "只用于运行当前官方年龄筛选；不会据此单独判断资格。",
    answer_type: "number",
    path_scope: ["new_cies", "qmas"],
    required_when: "candidate path is new_cies or qmas",
    source_ref: "NCIES-R01 / QMAS-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_SHARED_RESIDENCY",
    field_key: "nationality_residency_context",
    question_text: "请概述国籍与当前主要居留地。",
    help_text: "只需提供判断计划分支所需的概括，不填写证件号码。",
    answer_type: "text",
    path_scope: ["new_cies", "employment"],
    required_when: "candidate path is new_cies or employment",
    source_ref: "NCIES-R04 / EMP-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_CIES_ASSETS",
    field_key: "net_assets_hkd",
    question_text: "拟用于 New CIES 探索的净资产约为多少港币？",
    help_text: "可留空；金额仅用于初步缺口整理，仍须核对实益拥有比例与证明。",
    answer_type: "number",
    path_scope: ["new_cies"],
    required_when: "candidate path is new_cies",
    source_ref: "NCIES-R02",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_CIES_HOLDING",
    field_key: "asset_holding_period_months",
    question_text: "上述资产已持续持有约多少个月？",
    help_text: "只记录自述时间；正式文件须人工核验。",
    answer_type: "number",
    path_scope: ["new_cies"],
    required_when: "candidate path is new_cies",
    source_ref: "NCIES-R02",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_CIES_BENEFICIAL",
    field_key: "beneficial_share_confirmed",
    question_text: "资产的实益拥有比例目前是否清楚？",
    help_text: "共同持有资产仍须按个人实益比例人工核验。",
    answer_type: "single_select",
    options: yesNoUnsureOptions,
    path_scope: ["new_cies"],
    required_when: "candidate path is new_cies",
    source_ref: "NCIES-R02",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_CIES_INVESTMENT",
    field_key: "planned_investment_hkd",
    question_text: "计划投入香港获许投资资产的金额约为多少港币？",
    help_text: "不要求上传资产证明；投资类别与分配仍须人工核验。",
    answer_type: "number",
    path_scope: ["new_cies"],
    required_when: "candidate path is new_cies",
    source_ref: "NCIES-R03",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_CIES_ASSET_CLASS",
    field_key: "planned_asset_classes",
    question_text: "目前考虑哪些投资资产类别？",
    help_text: "可用一句话概述；不在此处判断资产是否获许。",
    answer_type: "text",
    path_scope: ["new_cies"],
    required_when: "candidate path is new_cies",
    source_ref: "NCIES-R03",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_TTPS_INCOME",
    field_key: "prior_year_annual_income_hkd",
    question_text: "紧接申请前一年的全年收入约为多少港币？",
    help_text: "收入性质和证明仍须按官方定义人工核验。",
    answer_type: "number",
    path_scope: ["ttps"],
    required_when: "candidate path is ttps",
    source_ref: "TTPSA-R01",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_TTPS_INCOME_SOURCE",
    field_key: "income_source_type",
    question_text: "上述收入主要来自哪里？",
    help_text: "个人投资收入与就业 / 业务收入须分开核对。",
    answer_type: "single_select",
    options: [
      { value: "employment_or_business", label: "就业或业务收入" },
      { value: "personal_investment", label: "个人投资收入" },
      { value: "mixed", label: "混合来源" },
      { value: "unsure", label: "不确定" },
    ],
    path_scope: ["ttps"],
    required_when: "candidate path is ttps",
    source_ref: "TTPSA-R02",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_SHARED_INSTITUTION",
    field_key: "degree_institution",
    question_text: "最高学位由哪所院校颁授？",
    help_text: "TTPS 合资格院校名单会变化，系统不会把院校名称自动判定为合资格。",
    answer_type: "text",
    path_scope: ["ttps", "study_iang"],
    required_when: "candidate path is ttps or study_iang",
    source_ref: "TTPSB-R01 / TTPSC-R01 / IANG-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_SHARED_GRADUATION",
    field_key: "graduation_date",
    question_text: "最高学位的毕业日期是？",
    help_text: "日期只用于区分需核验的时间情境。",
    answer_type: "date",
    path_scope: ["ttps", "study_iang"],
    required_when: "candidate path is ttps or study_iang",
    source_ref: "TTPSC-R01 / IANG-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_TTPS_EXPERIENCE",
    field_key: "work_experience_months_in_last_5y",
    question_text: "过去五年内累计工作经验约多少个月？",
    help_text: "A/B/C 是政策分支，不是优先级或成功率排序。",
    answer_type: "number",
    path_scope: ["ttps"],
    required_when: "candidate path is ttps",
    source_ref: "TTPSB-R02 / TTPSC-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_TTPS_HK_UNDERGRAD",
    field_key: "hk_nonlocal_undergraduate_status",
    question_text: "是否属于在香港修读全日制本地认可本科课程的非本地毕业生？",
    help_text: "此项涉及 TTPS-C 排除情境，最终须人工核验课程与身份记录。",
    answer_type: "single_select",
    options: yesNoUnsureOptions,
    path_scope: ["ttps"],
    required_when: "candidate path is ttps",
    source_ref: "TTPSC-R04",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_QMAS_SUPPORT",
    field_key: "financial_support_context",
    question_text: "请概述本人及受养人的经济支持与住宿安排。",
    help_text: "无需上传银行流水；正式证明须人工核验。",
    answer_type: "text",
    path_scope: ["qmas"],
    required_when: "candidate path is qmas",
    source_ref: "QMAS-R02",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_SHARED_QUALIFICATION",
    field_key: "qualification_context",
    question_text: "是否有需要特别说明的专业资格、技术能力或相关经验？",
    help_text: "可简述；所有证明与例外均须人工核验。",
    answer_type: "text",
    path_scope: ["qmas", "employment"],
    required_when: "candidate path is qmas or employment",
    source_ref: "QMAS-R04 / EMP-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_QMAS_ROUTE",
    field_key: "qmas_assessment_route",
    question_text: "目前想核对哪一种 QMAS 计分路径？",
    help_text: "达到任何门槛都不代表获选或获批。",
    answer_type: "single_select",
    options: [
      { value: "general_points", label: "综合计分制" },
      { value: "achievement_based", label: "成就计分制" },
      { value: "unsure", label: "不确定" },
    ],
    path_scope: ["qmas"],
    required_when: "candidate path is qmas",
    source_ref: "QMAS-R05",
    sensitivity: "NONE",
  }),
  question({
    question_id: "ID_DYN_STUDY_ADMISSION",
    field_key: "admission_status",
    question_text: "Admission（学校录取）目前是什么状态？",
    help_text: "学校录取与 Student Visa、IANG 分开记录。",
    answer_type: "single_select",
    options: statusOptions,
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "STUDY-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_VISA",
    field_key: "student_visa_status",
    question_text: "Student Visa（学生签证）目前是什么状态？",
    help_text: "已有 Admission 不等于学生签证已有结果。",
    answer_type: "single_select",
    options: statusOptions,
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "STUDY-R01 / STUDY-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_IANG",
    field_key: "iang_status",
    question_text: "IANG（非本地毕业生留港／回港就业安排）目前是什么状态？",
    help_text: "IANG 不是学校录取，也不是学生签证。",
    answer_type: "single_select",
    options: statusOptions,
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "STUDY-R01 / IANG-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_PROGRAMME",
    field_key: "programme_type",
    question_text: "计划或正在修读什么课程类型？",
    help_text: "课程与院校情境须按当前官方来港就读安排核验。",
    answer_type: "text",
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "STUDY-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_SPONSOR",
    field_key: "sponsor_context",
    question_text: "学生签证的担保安排目前是否清楚？",
    help_text: "只记录准备状态，不代替正式担保文件审核。",
    answer_type: "single_select",
    options: yesNoUnsureOptions,
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "STUDY-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_GRADUATE_TYPE",
    field_key: "graduate_type",
    question_text: "目前属于哪一种毕业生情境？",
    help_text: "毕业生类别、课程与院校必须一起核验。",
    answer_type: "single_select",
    options: [
      { value: "recent_non_local_graduate", label: "近期非本地毕业生" },
      { value: "non_recent_non_local_graduate", label: "非近期非本地毕业生" },
      { value: "gba_campus_graduate", label: "合资格大湾区校园毕业生" },
      { value: "not_graduated", label: "尚未毕业" },
      { value: "unsure", label: "不确定" },
    ],
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "IANG-R01",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_STUDY_APPLICATION_DATE",
    field_key: "intended_application_date",
    question_text: "计划递交相关申请的日期是？",
    help_text: "仅用于建立时间线，实际适用日期以正式文件为准。",
    answer_type: "date",
    path_scope: ["study_iang"],
    required_when: "candidate path is study_iang",
    source_ref: "IANG-R02",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_SHARED_JOB_OFFER",
    field_key: "job_offer_status",
    question_text: "目前是否有确定的香港工作邀请？",
    help_text: "职位、薪酬及适用计划仍须分别核验。",
    answer_type: "single_select",
    options: yesNoUnsureOptions,
    path_scope: ["study_iang", "employment"],
    required_when: "candidate path is study_iang or employment",
    source_ref: "IANG-R03 / EMP-R03",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_EMPLOYMENT_ROLE",
    field_key: "job_role_context",
    question_text: "请简述香港职位与学历或经验的相关性。",
    help_text: "不填写雇主机密；正式职位与空缺证明须人工核验。",
    answer_type: "text",
    path_scope: ["employment"],
    required_when: "candidate path is employment",
    source_ref: "EMP-R03",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_EMPLOYMENT_PAY",
    field_key: "remuneration_hkd_monthly",
    question_text: "香港职位月薪约为多少港币？",
    help_text: "是否符合市场水平必须结合职位与当期资料人工核验。",
    answer_type: "number",
    path_scope: ["employment"],
    required_when: "candidate path is employment",
    source_ref: "EMP-R05",
    sensitivity: "SENSITIVE",
  }),
  question({
    question_id: "ID_DYN_DEP_SPONSOR",
    field_key: "sponsor_status",
    question_text: "拟作为保证人的家庭成员目前是什么香港身份或计划类别？",
    help_text: "保证人类别决定后续需核验的受养人范围与条件。",
    answer_type: "text",
    path_scope: ["dependant"],
    required_when: "candidate path is dependant",
    source_ref: "DEP-R01 / DEP-R05",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_DEP_RELATIONSHIP",
    field_key: "relationship_type",
    question_text: "申请人与保证人是什么家庭关系？",
    help_text: "法律关系定义须按现行官方政策与证明文件核验。",
    answer_type: "text",
    path_scope: ["dependant"],
    required_when: "candidate path is dependant",
    source_ref: "DEP-R02 / DEP-R03 / DEP-R05",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_DEP_AGE",
    field_key: "dependant_age",
    question_text: "拟申请受养人的年龄是？",
    help_text: "年龄需与关系及保证人身份一起核验。",
    answer_type: "number",
    path_scope: ["dependant"],
    required_when: "candidate path is dependant",
    source_ref: "DEP-R02 / DEP-R03",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_DEP_EVIDENCE",
    field_key: "relationship_evidence_context",
    question_text: "家庭关系证明目前准备到什么程度？",
    help_text: "只需概述，不上传证件或证明文件。",
    answer_type: "text",
    path_scope: ["dependant"],
    required_when: "candidate path is dependant",
    source_ref: "DEP-R04",
    sensitivity: "PERSONAL",
  }),
  question({
    question_id: "ID_DYN_DEP_SUPPORT",
    field_key: "support_and_accommodation_context",
    question_text: "保证人的经济支持与住宿安排目前是否清楚？",
    help_text: "正式证明及是否充足须人工核验。",
    answer_type: "single_select",
    options: yesNoUnsureOptions,
    path_scope: ["dependant"],
    required_when: "candidate path is dependant",
    source_ref: "DEP-R04",
    sensitivity: "SENSITIVE",
  }),
] as const;

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function getDynamicQuestions(
  candidatePaths: readonly IdentityPathCode[],
  existingAnswers: NormalizedIdentityAnswers = {},
): readonly DynamicQuestion[] {
  const candidates = new Set(candidatePaths);
  const fields = new Set<string>();
  return DYNAMIC_IDENTITY_QUESTIONS.filter((item) => {
    if (!item.path_scope.some((pathCode) => candidates.has(pathCode))) return false;
    if (fields.has(item.field_key) || isAnswered(existingAnswers[item.field_key])) return false;
    fields.add(item.field_key);
    return true;
  });
}

export function normalizeDynamicAnswers(
  questions: readonly DynamicQuestion[],
  draft: Readonly<Record<string, string>>,
): NormalizedIdentityAnswers {
  const entries: [string, unknown][] = [];
  for (const item of questions) {
    const raw = draft[item.field_key]?.trim();
    if (!raw) continue;
    if (item.answer_type === "number") {
      const value = Number(raw);
      if (Number.isFinite(value)) entries.push([item.field_key, value]);
    } else {
      entries.push([item.field_key, raw]);
    }
  }
  return Object.fromEntries(entries);
}
