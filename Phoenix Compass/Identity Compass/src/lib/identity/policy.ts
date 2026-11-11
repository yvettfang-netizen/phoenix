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
export type EvidenceStatus = "VERIFIED" | "NEEDS_REVIEW" | "RETIRED";
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
  evidence_id: string;
  evidence_status: EvidenceStatus;
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

const VERIFIED_AT = "2026-09-03";
const OWNER = "Phoenix Identity Policy Owner";

const EVIDENCE = {
  ttpsCore: {
    evidence_id: "EVID-HK-TTPS-001",
    evidence_status: "VERIFIED" as const,
    source: "Hong Kong Immigration Department — Guidebook for Top Talent Pass Scheme ID(E)1026 (04/2026)",
    official_url: "https://www.immd.gov.hk/pdforms/ID(E)1026.pdf",
  },
  ttpsLive: {
    evidence_id: "EVID-HK-TTPS-002",
    evidence_status: "NEEDS_REVIEW" as const,
    source: "Hong Kong Immigration Department — TTPS live eligible-university list / quota references",
    official_url: "https://www.immd.gov.hk/eng/services/visas/TTPS.html",
  },
  qmas: {
    evidence_id: "EVID-HK-QMAS-001",
    evidence_status: "NEEDS_REVIEW" as const,
    source: "Hong Kong Immigration Department — Quality Migrant Admission Scheme current guidance",
    official_url: "https://www.immd.gov.hk/eng/services/visas/quality_migrant_admission_scheme.html",
  },
  employment: {
    evidence_id: "EVID-HK-GEP-001",
    evidence_status: "VERIFIED" as const,
    source: "Hong Kong Immigration Department — GEP / employment route current guidance",
    official_url: "https://www.immd.gov.hk/eng/services/visas/GEP.html",
  },
  dependant: {
    evidence_id: "EVID-HK-DEPENDANT-001",
    evidence_status: "NEEDS_REVIEW" as const,
    source: "Hong Kong Immigration Department — Residence as Dependants current guidance",
    official_url: "https://www.immd.gov.hk/eng/services/visas/residence_as_dependant.html",
  },
} as const;

type EvidenceDescriptor = (typeof EVIDENCE)[keyof typeof EVIDENCE];

function evidenceToEffectiveStatus(status: EvidenceStatus): PolicyEffectiveStatus {
  if (status === "VERIFIED") return "CURRENT";
  if (status === "RETIRED") return "SUPERSEDED";
  return "UNVERIFIED";
}

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
    | "evidence_id"
    | "evidence_status"
  >,
  evidence: EvidenceDescriptor,
): IdentityPolicyRule {
  return {
    ...rule,
    policy_version: POLICY_LIBRARY_VERSION,
    evidence_id: evidence.evidence_id,
    evidence_status: evidence.evidence_status,
    source_type: "OFFICIAL",
    source: evidence.source,
    official_url: evidence.official_url,
    verified_at: VERIFIED_AT,
    effective_status: evidenceToEffectiveStatus(evidence.evidence_status),
    owner: OWNER,
  };
}

export const IDENTITY_POLICY_RULES: readonly IdentityPolicyRule[] = [
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
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category A income screening",
    },
    EVIDENCE.ttpsCore,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_A",
      rule_id: "TTPSA-R02",
      path_code: "ttps",
      branch_code: "ttps_a",
      statement: "收入性质及证明须符合现行官方定义；系统只作资料筛选，收入证据仍须人工核验。",
      required_inputs: ["income_source_type"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category A income-source evidence",
    },
    EVIDENCE.ttpsCore,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_B",
      rule_id: "TTPSB-R01",
      path_code: "ttps",
      branch_code: "ttps_b",
      statement: "学士学位颁授院校必须按申请时的合资格大学综合名单核验；名单属于动态参考数据。",
      required_inputs: ["degree_institution", "degree_level"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category B eligible-university live reference",
    },
    EVIDENCE.ttpsLive,
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
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category B work-experience screening",
    },
    EVIDENCE.ttpsCore,
  ),
  officialRule(
    {
      policy_id: "POL_TTPS_C",
      rule_id: "TTPSC-R01",
      path_code: "ttps",
      branch_code: "ttps_c",
      statement: "C类院校、毕业时间、年度配额及排除情形均必须按申请时动态官方资料核验。",
      required_inputs: ["degree_institution", "degree_level", "graduation_date", "hk_nonlocal_undergraduate_status"],
      handling: "MANUAL_CHECK",
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category C live university/quota/exclusion checks",
    },
    EVIDENCE.ttpsLive,
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
      rule_version: "TTPS_GATE2_2026-09-03",
      effective_scope: "TTPS Category C work-experience screening",
    },
    EVIDENCE.ttpsCore,
  ),
  officialRule(
    {
      policy_id: "POL_QMAS",
      rule_id: "QMAS-R01",
      path_code: "qmas",
      branch_code: "qmas",
      statement: "QMAS 现行一般计分制采用六个评核范畴下的十二项准则；未完成全部动态准则核验前不得产生确定性匹配。",
      required_inputs: ["qmas_assessment_route", "qualification_context"],
      handling: "MANUAL_CHECK",
      rule_version: "QMAS_GATE2_2026-09-03",
      effective_scope: "QMAS current assessment architecture",
    },
    EVIDENCE.qmas,
  ),
  officialRule(
    {
      policy_id: "POL_EMPLOYMENT",
      rule_id: "EMP-R01",
      path_code: "employment",
      branch_code: "employment",
      statement: "香港工作邀请、职位与背景相关性、薪酬及适用入境安排须按申请人情境人工核验。",
      required_inputs: ["job_offer_status", "job_role_context", "remuneration_hkd_monthly", "nationality_residency_context"],
      handling: "MANUAL_CHECK",
      rule_version: "EMPLOYMENT_GATE2_2026-09-03",
      effective_scope: "GEP / applicable employment-route screening boundary",
    },
    EVIDENCE.employment,
  ),
  officialRule(
    {
      policy_id: "POL_DEPENDANT",
      rule_id: "DEP-R01",
      path_code: "dependant",
      branch_code: "dependant",
      statement: "保证人身份、家庭关系、年龄及支持住宿条件须按保证人所属入境类别的现行规定核验。",
      required_inputs: ["sponsor_status", "relationship_type", "dependant_age", "relationship_evidence_context", "support_and_accommodation_context"],
      handling: "MANUAL_CHECK",
      rule_version: "DEPENDANT_GATE2_2026-09-03",
      effective_scope: "Dependant sponsor/category-specific screening",
    },
    EVIDENCE.dependant,
  ),
] as const;

export const STUDY_ADMISSION_INTERNAL_EXPERIENCE: IdentityPolicyRule = {
  policy_id: "PHX_STUDY_ADMISSION_MATRIX",
  rule_id: "PHX-STUDY-ADMISSION-01",
  path_code: "study_iang",
  branch_code: "study_iang",
  statement: "Phoenix Study Admission Strategy Matrix 仅用于内部教育策略整理，不代表 Student Visa 或 IANG 资格。",
  required_inputs: ["admission_status"],
  handling: "INFORMATION_ONLY",
  policy_version: POLICY_LIBRARY_VERSION,
  rule_version: "PHX_STUDY_MATRIX_V1.0",
  evidence_id: "PHX-INTERNAL-STUDY-MATRIX-V1",
  evidence_status: "NEEDS_REVIEW",
  source_type: "INTERNAL_EXPERIENCE",
  source: "Phoenix Study Admission Strategy Matrix V1.0",
  official_url: null,
  verified_at: VERIFIED_AT,
  effective_scope: "Internal study admission strategy; excludes Student Visa and IANG",
  effective_status: "CURRENT",
  owner: OWNER,
};

export function assertPolicyRuleMetadata(rule: IdentityPolicyRule): void {
  if (!rule.policy_id || !rule.rule_id || !rule.rule_version) throw new Error("Missing policy identity metadata");
  if (!rule.evidence_id || !rule.evidence_status) throw new Error("Missing Gate 2 evidence binding");
  if (!rule.source || !rule.verified_at || !rule.effective_scope || !rule.effective_status || !rule.owner) {
    throw new Error("Missing policy lifecycle metadata");
  }
  if (rule.source_type === "OFFICIAL" && !rule.official_url?.startsWith("https://")) {
    throw new Error("Official rule requires official URL");
  }
  if (rule.source_type === "OFFICIAL") {
    const expectedStatus = evidenceToEffectiveStatus(rule.evidence_status);
    if (rule.effective_status !== expectedStatus) throw new Error("Official lifecycle state does not match evidence status");
  }
}

const SOURCE_PRIORITY: Readonly<Record<PolicySourceType, number>> = {
  OFFICIAL: 0,
  APPROVED_PHOENIX_BASELINE: 1,
  INTERNAL_EXPERIENCE: 2,
  MODEL_INFERENCE: 3,
};

const EFFECTIVE_PRIORITY: Readonly<Record<PolicyEffectiveStatus, number>> = {
  CURRENT: 0,
  UNVERIFIED: 1,
  DISABLED: 2,
  SUPERSEDED: 3,
  EXPIRED: 4,
};

export function sortPolicyRulesByPriority(rules: readonly IdentityPolicyRule[]): IdentityPolicyRule[] {
  return [...rules].sort((a, b) => {
    const effectiveDelta = EFFECTIVE_PRIORITY[a.effective_status] - EFFECTIVE_PRIORITY[b.effective_status];
    if (effectiveDelta !== 0) return effectiveDelta;
    return SOURCE_PRIORITY[a.source_type] - SOURCE_PRIORITY[b.source_type];
  });
}

export const IDENTITY_POLICY_RECORDS: readonly IdentityPolicyRecord[] = IDENTITY_POLICY_PATHS.map((path) => ({
  path,
  policy_library_version: POLICY_LIBRARY_VERSION,
  source_register_reference: "docs/gate2/RULE_EVIDENCE_REGISTRY_V0.1.md",
  rules: IDENTITY_POLICY_RULES.filter((rule) => rule.branch_code === path),
}));
