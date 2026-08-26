import type { IdentityPathCode, IdentityPolicyBranchCode } from "@/lib/identity/path-registry";
import { IDENTITY_POLICY_BRANCH_ORDER } from "@/lib/identity/path-registry";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

export const IDENTITY_POLICY_PATHS = IDENTITY_POLICY_BRANCH_ORDER;
export type IdentityPolicyPath = IdentityPolicyBranchCode;

export const FIT_STATUSES = [
  "possible_fit",
  "needs_verification",
  "insufficient_information",
  "clear_mismatch",
] as const;

export type FitStatus = (typeof FIT_STATUSES)[number];

export const POLICY_SOURCE_TYPES = [
  "OFFICIAL",
  "APPROVED_PHOENIX_BASELINE",
  "INTERNAL_EXPERIENCE",
  "MODEL_INFERENCE",
] as const;

export type PolicySourceType = (typeof POLICY_SOURCE_TYPES)[number];
export type PolicyEffectiveStatus = "CURRENT" | "SUPERSEDED" | "EXPIRED" | "UNVERIFIED" | "DISABLED";
export type PolicyRuleHandling = "SCREENING" | "MANUAL_CHECK" | "INFORMATION_ONLY";
export type PolicyOperator = "gte_number" | "lt_number" | "equals" | "not_equals";

export type IdentityPolicyRule = Readonly<{
  policy_id: string;
  rule_id: string;
  path_code: IdentityPathCode;
  branch_code: IdentityPolicyBranchCode;
  statement: string;
  required_inputs: readonly string[];
  handling: PolicyRuleHandling;
  evaluator?: Readonly<{
    field: string;
    operator: PolicyOperator;
    expected: number | string | boolean;
  }>;
  policy_version: typeof POLICY_LIBRARY_VERSION;
  rule_version: string;
  source_type: PolicySourceType;
  source: string;
  official_url: string | null;
  verified_at: string;
  effective_scope: string;
  effective_status: PolicyEffectiveStatus;
  owner: string;
}>;

export type IdentityPolicyRecord = Readonly<{
  path: IdentityPolicyPath;
  policy_library_version: string;
  source_register_reference: string;
  rules: readonly IdentityPolicyRule[];
}>;

const VERIFIED_AT = "2026-08-25";
const OWNER = "Product Owner";

const SOURCES = {
  new_cies: {
    source: "InvestHK — New Capital Investment Entrant Scheme",
    official_url: "https://www.newcies.gov.hk/en/resources/scheme-rules-and-documents/",
  },
  ttps: {
    source: "Hong Kong Immigration Department — Top Talent Pass Scheme",
    official_url: "https://www.immd.gov.hk/eng/services/visas/TTPS.html",
  },
  qmas: {
    source: "Hong Kong Immigration Department — Quality Migrant Admission Scheme",
    official_url: "https://www.immd.gov.hk/eng/services/visas/quality_migrant_admission_scheme.html",
  },
  study: {
    source: "Hong Kong Immigration Department — Study",
    official_url: "https://www.immd.gov.hk/eng/services/visas/study.html",
  },
  iang: {
    source: "Hong Kong Immigration Department — Immigration Arrangements for Non-local Graduates",
    official_url: "https://www.immd.gov.hk/eng/services/visas/IANG.html",
  },
  employment: {
    source: "Hong Kong Immigration Department — GEP / ASMTP",
    official_url: "https://www.immd.gov.hk/eng/services/visas/GEP.html",
  },
  dependant: {
    source: "Hong Kong Immigration Department — Residence as Dependants",
    official_url: "https://www.immd.gov.hk/eng/services/visas/residence_as_dependant.html",
  },
} as const;

function officialRule(
  rule: Omit<
    IdentityPolicyRule,
    | "policy_version"
    | "source_type"
    | "source"
    | "official_url"
    | "verified_at"
    | "effective_status"
    | "owner"
  >,
  source: (typeof SOURCES)[keyof typeof SOURCES],
): IdentityPolicyRule {
  return {
    ...rule,
    policy_version: POLICY_LIBRARY_VERSION,
    source_type: "OFFICIAL",
    source: source.source,
    official_url: source.official_url,
    verified_at: VERIFIED_AT,
    effective_status: "CURRENT",
    owner: OWNER,
  };
}

export const IDENTITY_POLICY_RULES: readonly IdentityPolicyRule[] = [
  officialRule(
    {
      policy_id: "POL_NEW_CIES",
      rule_id: "NCIES-R01",
      path_code: "new_cies",
      branch_code: "new_cies",
      statement: "申请人年龄为18岁或以上。",
      required_inputs: ["age_exact"],
      handling: "SCREENING",
      evaluator: { field: "age_exact", operator: "gte_number", expected: 18 },
      rule_version: "NCIES_2026-08-25",
      effective_scope: "New CIES applicant age screening",
    },
    SOURCES.new_cies,
  ),
  officialRule(
    {
      policy_id: "POL_NEW_CIES",
      rule_id: "NCIES-R02",
      path_code: "new_cies",
      branch_code: "new_cies",
      statement: "净资产、持有期、实益拥有比例与证明文件须按现行计划规则人工核验。",
      required_inputs: ["net_assets_hkd", "asset_holding_period_months", "beneficial_share_confirmed"],
      handling: "MANUAL_CHECK",
      rule_version: "NCIES_2026-08-25",
      effective_scope: "New CIES net asset assessment",
    },
    SOURCES.new_cies,
  ),
  officialRule(
    {
      policy_id: "POL_NEW_CIES",
      rule_id: "NCIES-R03",
      path_code: "new_cies",
      branch_code: "new_cies",
      statement: "拟投资金额、获许投资资产及组合分配须按现行投资要求人工核验。",
      required_inputs: ["planned_investment_hkd", "planned_asset_classes"],
      handling: "MANUAL_CHECK",
      rule_version: "NCIES_2026-08-25",
      effective_scope: "New CIES investment requirement",
    },
    SOURCES.new_cies,
  ),
  officialRule(
    {
      policy_id: "POL_NEW_CIES",
      rule_id: "NCIES-R04",
      path_code: "new_cies",
      branch_code: "new_cies",
      statement: "申请人类别、入境条件、证据及组合维持要求须由相关官方机构分别评估。",
      required_inputs: ["nationality_residency_context"],
      handling: "MANUAL_CHECK",
      rule_version: "NCIES_2026-08-25",
      effective_scope: "New CIES applicant and admissibility context",
    },
    SOURCES.new_cies,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_A",
      rule_id: "TTPSA-R01",
      path_code: "ttps",
      branch_code: "ttps_a",
      statement: "紧接申请前一年全年收入达到港币250万元或等值外币。",
      required_inputs: ["prior_year_annual_income_hkd"],
      handling: "SCREENING",
      evaluator: { field: "prior_year_annual_income_hkd", operator: "gte_number", expected: 2_500_000 },
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category A income screening",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_A",
      rule_id: "TTPSA-R02",
      path_code: "ttps",
      branch_code: "ttps_a",
      statement: "收入性质及证明须符合官方定义，个人投资收入不计入相关全年收入。",
      required_inputs: ["income_source_type"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category A income source evidence",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_A",
      rule_id: "TTPSA-R03",
      path_code: "ttps",
      branch_code: "ttps_a",
      statement: "递交入境申请时无需先有香港聘用，但一般入境及保安要求仍须人工核验。",
      required_inputs: [],
      handling: "INFORMATION_ONLY",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category A entry context",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_B",
      rule_id: "TTPSB-R01",
      path_code: "ttps",
      branch_code: "ttps_b",
      statement: "学士学位、颁授院校及当期合资格大学综合名单须人工核验。",
      required_inputs: ["degree_institution", "degree_level"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category B eligible university context",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_B",
      rule_id: "TTPSB-R02",
      path_code: "ttps",
      branch_code: "ttps_b",
      statement: "紧接申请前五年内累积至少三年工作经验。",
      required_inputs: ["work_experience_months_in_last_5y"],
      handling: "SCREENING",
      evaluator: { field: "work_experience_months_in_last_5y", operator: "gte_number", expected: 36 },
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category B work experience screening",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_B",
      rule_id: "TTPSB-R03",
      path_code: "ttps",
      branch_code: "ttps_b",
      statement: "递交入境申请时无需先有香港聘用，但一般入境及保安要求仍须人工核验。",
      required_inputs: [],
      handling: "INFORMATION_ONLY",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category B entry context",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_C",
      rule_id: "TTPSC-R01",
      path_code: "ttps",
      branch_code: "ttps_c",
      statement: "合资格院校学士学位及毕业日期是否在申请前五年内须人工核验。",
      required_inputs: ["degree_institution", "degree_level", "graduation_date"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category C graduate context",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_C",
      rule_id: "TTPSC-R02",
      path_code: "ttps",
      branch_code: "ttps_c",
      statement: "紧接申请前五年内工作经验少于三年。",
      required_inputs: ["work_experience_months_in_last_5y"],
      handling: "SCREENING",
      evaluator: { field: "work_experience_months_in_last_5y", operator: "lt_number", expected: 36 },
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category C work experience screening",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_C",
      rule_id: "TTPSC-R03",
      path_code: "ttps",
      branch_code: "ttps_c",
      statement: "C类受年度配额限制，申请时配额情况必须人工核验。",
      required_inputs: [],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category C quota",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_C",
      rule_id: "TTPSC-R04",
      path_code: "ttps",
      branch_code: "ttps_c",
      statement: "香港全日制本地认可本科课程非本地毕业生的排除情形须人工核验。",
      required_inputs: ["hk_nonlocal_undergraduate_status"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_2026-08-25",
      effective_scope: "TTPS Category C exclusion",
    },
    SOURCES.ttps,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R01",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "申请人年龄为18岁或以上。",
      required_inputs: ["age_exact"],
      handling: "SCREENING",
      evaluator: { field: "age_exact", operator: "gte_number", expected: 18 },
      rule_version: "QMAS_2026-08-25",
      effective_scope: "QMAS age prerequisite",
    },
    SOURCES.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R02",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "本人及受养人的经济支持与住宿能力须以证明文件人工核验。",
      required_inputs: ["financial_support_context"],
      handling: "MANUAL_CHECK",
      rule_version: "QMAS_2026-08-25",
      effective_scope: "QMAS financial prerequisite",
    },
    SOURCES.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R03",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "刑事及不良入境记录须由申请人申报并人工核验。",
      required_inputs: [],
      handling: "MANUAL_CHECK",
      rule_version: "QMAS_2026-08-25",
      effective_scope: "QMAS character prerequisite",
    },
    SOURCES.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R04",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "学历、专业资格、技术能力或成就例外须按证明文件人工核验。",
      required_inputs: ["degree_level", "qualification_context"],
      handling: "MANUAL_CHECK",
      rule_version: "QMAS_2026-08-25",
      effective_scope: "QMAS qualification prerequisite",
    },
    SOURCES.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R05",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "计分制路径与相关证据须人工核验，达到门槛不代表获选或获批。",
      required_inputs: ["qmas_assessment_route"],
      handling: "MANUAL_CHECK",
      rule_version: "QMAS_2026-08-25",
      effective_scope: "QMAS assessment route",
    },
    SOURCES.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_STUDY_IANG",
      rule_id: "STUDY-R01",
      path_code: "study_iang",
      branch_code: "study_iang",
      statement: "Admission、Student Visa 与 IANG 是三个独立状态与决定。",
      required_inputs: ["admission_status", "student_visa_status", "iang_status"],
      handling: "INFORMATION_ONLY",
      rule_version: "STUDY_IANG_2026-08-25",
      effective_scope: "Study / IANG state separation",
    },
    SOURCES.study,
  ),
  officialRule(
    {
      policy_id: "POL_STUDY_IANG",
      rule_id: "STUDY-R02",
      path_code: "study_iang",
      branch_code: "study_iang",
      statement: "录取及课程情境是否属于现行来港就读安排须人工核验；录取不等于学生签证获批。",
      required_inputs: ["admission_status", "programme_type", "sponsor_context"],
      handling: "MANUAL_CHECK",
      rule_version: "STUDY_IANG_2026-08-25",
      effective_scope: "Student Visa study-entry context",
    },
    SOURCES.study,
  ),
  officialRule(
    {
      policy_id: "POL_STUDY_IANG",
      rule_id: "IANG-R01",
      path_code: "study_iang",
      branch_code: "study_iang",
      statement: "毕业生类别、学历、课程及院校情境是否属于 IANG 适用范围须人工核验。",
      required_inputs: ["graduate_type", "degree_level", "degree_institution"],
      handling: "MANUAL_CHECK",
      rule_version: "STUDY_IANG_2026-08-25",
      effective_scope: "IANG qualifying graduate context",
    },
    SOURCES.iang,
  ),
  officialRule(
    {
      policy_id: "POL_STUDY_IANG",
      rule_id: "IANG-R02",
      path_code: "study_iang",
      branch_code: "study_iang",
      statement: "毕业日期与申请日期之间是否不超过六个月须人工核验日期证据。",
      required_inputs: ["graduation_date", "intended_application_date"],
      handling: "MANUAL_CHECK",
      rule_version: "STUDY_IANG_2026-08-25",
      effective_scope: "IANG recent graduate timing",
    },
    SOURCES.iang,
  ),
  officialRule(
    {
      policy_id: "POL_STUDY_IANG",
      rule_id: "IANG-R03",
      path_code: "study_iang",
      branch_code: "study_iang",
      statement: "非应届毕业生的聘用、职位水平与薪酬须按现行要求人工核验。",
      required_inputs: ["job_offer_status"],
      handling: "MANUAL_CHECK",
      rule_version: "STUDY_IANG_2026-08-25",
      effective_scope: "IANG non-recent graduate employment",
    },
    SOURCES.iang,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R01",
      path_code: "employment",
      branch_code: "employment",
      statement: "GEP 或 ASMTP 分支须根据国籍及居留情境人工核验。",
      required_inputs: ["nationality_residency_context"],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_2026-08-25",
      effective_scope: "Employment scheme routing",
    },
    SOURCES.employment,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R02",
      path_code: "employment",
      branch_code: "employment",
      statement: "学历、技术资格、专业能力与相关经验须以证据人工核验。",
      required_inputs: ["degree_level", "qualification_context"],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_2026-08-25",
      effective_scope: "Employment qualification context",
    },
    SOURCES.employment,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R03",
      path_code: "employment",
      branch_code: "employment",
      statement: "真实且确定的香港职位及其与申请人背景的相关性须人工核验。",
      required_inputs: ["job_offer_status", "job_role_context"],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_2026-08-25",
      effective_scope: "Employment vacancy and relevance",
    },
    SOURCES.employment,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R04",
      path_code: "employment",
      branch_code: "employment",
      statement: "本地劳动力及当期便利措施相关要求须由顾问按官方口径核验。",
      required_inputs: [],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_2026-08-25",
      effective_scope: "Employment local workforce assessment",
    },
    SOURCES.employment,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R05",
      path_code: "employment",
      branch_code: "employment",
      statement: "薪酬是否大致符合香港市场水平须人工核验。",
      required_inputs: ["remuneration_hkd_monthly"],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_2026-08-25",
      effective_scope: "Employment remuneration context",
    },
    SOURCES.employment,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R01",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "保证人的身份及计划类别是否可担保受养人须人工核验。",
      required_inputs: ["sponsor_status"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_2026-08-25",
      effective_scope: "Dependant sponsor eligibility context",
    },
    SOURCES.dependant,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R02",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "配偶、认可伴侣或未满18岁未婚受养子女等关系类别须按现行定义人工核验。",
      required_inputs: ["relationship_type", "dependant_age"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_2026-08-25",
      effective_scope: "Dependant relationship class",
    },
    SOURCES.dependant,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R03",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "父母关系、保证人居留身份及年龄条件须人工核验。",
      required_inputs: ["relationship_type", "dependant_age", "sponsor_status"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_2026-08-25",
      effective_scope: "Dependant parent context",
    },
    SOURCES.dependant,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R04",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "真实关系、记录、经济支持及合适住所须以证明文件人工核验。",
      required_inputs: ["relationship_evidence_context", "support_and_accommodation_context"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_2026-08-25",
      effective_scope: "Dependant evidence and support",
    },
    SOURCES.dependant,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R05",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "随保证人类别变化的逗留条件、工作权利及法律关系定义须人工核验。",
      required_inputs: ["sponsor_status", "relationship_type"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_2026-08-25",
      effective_scope: "Dependant conditions and relationship definition",
    },
    SOURCES.dependant,
  ),
] as const;

export const STUDY_ADMISSION_INTERNAL_EXPERIENCE: IdentityPolicyRule = {
  policy_id: "PHX_STUDY_ADMISSION_MATRIX",
  rule_id: "PHX-STUDY-EXP-R01",
  path_code: "study_iang",
  branch_code: "study_iang",
  statement: "Phoenix Study Admission Strategy Matrix 仅用于内部 Admission Strategy 整理。",
  required_inputs: ["study_admission_profile"],
  handling: "INFORMATION_ONLY",
  policy_version: POLICY_LIBRARY_VERSION,
  rule_version: "PHX_STUDY_MATRIX_V1.0",
  source_type: "INTERNAL_EXPERIENCE",
  source: "Phoenix Study Admission Strategy Matrix V1.0",
  official_url: null,
  verified_at: VERIFIED_AT,
  effective_scope: "Admission strategy only; excludes Student Visa and IANG policy",
  effective_status: "CURRENT",
  owner: OWNER,
};

export function policySourcePriority(rule: Pick<IdentityPolicyRule, "source_type" | "effective_status">): number {
  if (rule.source_type === "OFFICIAL" && rule.effective_status === "CURRENT") return 0;
  if (rule.source_type === "APPROVED_PHOENIX_BASELINE") return 1;
  if (rule.source_type === "INTERNAL_EXPERIENCE") return 2;
  if (rule.source_type === "MODEL_INFERENCE") return 3;
  return 4;
}

export function sortPolicyRulesByPriority<T extends Pick<IdentityPolicyRule, "source_type" | "effective_status">>(
  rules: readonly T[],
): T[] {
  return [...rules].sort((a, b) => policySourcePriority(a) - policySourcePriority(b));
}

export function assertPolicyRuleMetadata(rule: IdentityPolicyRule): void {
  const requiredTextFields = [
    rule.source_type,
    rule.source,
    rule.verified_at,
    rule.effective_scope,
    rule.effective_status,
    rule.owner,
  ];
  if (requiredTextFields.some((value) => !value.trim())) {
    throw new Error(`Policy rule ${rule.rule_id} is missing required metadata.`);
  }
  if (rule.source_type === "OFFICIAL" && !rule.official_url) {
    throw new Error(`Official policy rule ${rule.rule_id} requires official_url.`);
  }
}

for (const rule of [...IDENTITY_POLICY_RULES, STUDY_ADMISSION_INTERNAL_EXPERIENCE]) {
  assertPolicyRuleMetadata(rule);
}
