import {
  getIdentityPathDefinition,
  IDENTITY_PATH_DEFINITIONS,
  type IdentityPathCode,
  type IdentityPolicyBranchCode,
} from "@/lib/identity/path-registry";
import {
  IDENTITY_POLICY_RULES,
  type FitStatus,
  type IdentityPolicyRule,
  type PolicyOperator,
} from "@/lib/identity/policy";
import { POLICY_LIBRARY_VERSION, type NormalizedIdentityAssessment } from "@/lib/identity/types";

export type NormalizedIdentityAnswers = Readonly<Record<string, unknown>>;

export type PathEngineInput = Readonly<{
  normalized_answers: NormalizedIdentityAnswers;
  policy_version: string;
}>;

export type PathEngineResult = Readonly<{
  path_code: IdentityPathCode;
  fit_status: FitStatus;
  reasons: readonly string[];
  gaps: readonly string[];
  manual_checks: readonly string[];
}>;

type BranchEvaluation = PathEngineResult & Readonly<{ branch_code: IdentityPolicyBranchCode }>;

const FIELD_LABELS: Readonly<Record<string, string>> = {
  age_exact: "准确年龄",
  net_assets_hkd: "净资产金额",
  asset_holding_period_months: "资产持续持有期",
  beneficial_share_confirmed: "实益拥有比例",
  planned_investment_hkd: "拟投资金额",
  planned_asset_classes: "拟投资资产类别",
  nationality_residency_context: "国籍及居留情境",
  prior_year_annual_income_hkd: "上一年度全年收入",
  income_source_type: "收入来源性质",
  degree_institution: "学位颁授院校",
  degree_level: "学位层级",
  graduation_date: "毕业日期",
  intended_application_date: "计划申请日期",
  work_experience_months_in_last_5y: "过去五年内工作经验月数",
  hk_nonlocal_undergraduate_status: "香港非本地本科毕业情境",
  financial_support_context: "经济支持与住宿情况",
  qualification_context: "专业资格或能力证明情况",
  qmas_assessment_route: "QMAS 计分制路径",
  admission_status: "Admission 状态",
  student_visa_status: "Student Visa 状态",
  iang_status: "IANG 状态",
  programme_type: "课程类型",
  sponsor_context: "学生签证担保情境",
  graduate_type: "毕业生类别",
  job_offer_status: "香港工作邀请状态",
  job_role_context: "香港职位与背景相关性",
  remuneration_hkd_monthly: "香港职位月薪",
  sponsor_status: "保证人身份",
  relationship_type: "家庭关系类型",
  dependant_age: "受养人年龄",
  relationship_evidence_context: "家庭关系证明情况",
  support_and_accommodation_context: "保证人支持与住宿情况",
};

const branchLabels: Readonly<Record<IdentityPolicyBranchCode, string>> = {
  new_cies: "New CIES",
  ttps_a: "TTPS-A",
  ttps_b: "TTPS-B",
  ttps_c: "TTPS-C",
  qmas: "QMAS",
  study_iang: "Study/IANG",
  employment: "Employment",
  dependant: "Dependant",
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function matches(operator: PolicyOperator, actual: unknown, expected: number | string | boolean): boolean | null {
  if (!isAnswered(actual)) return null;
  if (operator === "gte_number" || operator === "lt_number") {
    const value = typeof actual === "number" ? actual : Number(actual);
    if (!Number.isFinite(value) || typeof expected !== "number") return null;
    return operator === "gte_number" ? value >= expected : value < expected;
  }
  if (operator === "equals") return actual === expected;
  return actual !== expected;
}

function evaluateBranch(
  pathCode: IdentityPathCode,
  branchCode: IdentityPolicyBranchCode,
  input: PathEngineInput,
  rules: readonly IdentityPolicyRule[],
): BranchEvaluation {
  const branchRules = rules.filter((rule) => rule.branch_code === branchCode);
  const reasons: string[] = [];
  const gaps: string[] = [];
  const manualChecks: string[] = [];
  let screeningPasses = 0;
  let screeningMismatch = false;
  let hasUntrustedOfficialRule = false;

  if (input.policy_version !== POLICY_LIBRARY_VERSION) {
    return {
      branch_code: branchCode,
      path_code: pathCode,
      fit_status: "needs_verification",
      reasons: [`请求的政策版本 ${input.policy_version} 不是当前已加载版本。`],
      gaps: ["可用且已核验的政策版本"],
      manual_checks: ["由 Policy Owner 核对政策版本后重新运行。"],
    };
  }

  if (branchRules.length === 0) {
    return {
      branch_code: branchCode,
      path_code: pathCode,
      fit_status: "needs_verification",
      reasons: ["当前版本没有可运行的政策规则。"],
      gaps: ["已核验政策规则"],
      manual_checks: ["由 Policy Owner 补齐并批准规则。"],
    };
  }

  for (const rule of branchRules) {
    const currentOfficial = rule.source_type === "OFFICIAL" && rule.effective_status === "CURRENT";
    if (!currentOfficial) {
      if (rule.source_type === "OFFICIAL") hasUntrustedOfficialRule = true;
      manualChecks.push(`${rule.rule_id}：${rule.source_type} / ${rule.effective_status}，不得产生确定性结论。`);
      continue;
    }

    if (rule.handling === "INFORMATION_ONLY") {
      reasons.push(rule.statement);
      for (const field of rule.required_inputs) {
        if (!isAnswered(input.normalized_answers[field])) gaps.push(FIELD_LABELS[field] ?? field);
      }
      continue;
    }

    if (rule.handling === "MANUAL_CHECK" || !rule.evaluator) {
      manualChecks.push(`${rule.rule_id}：${rule.statement}`);
      for (const field of rule.required_inputs) {
        if (!isAnswered(input.normalized_answers[field])) gaps.push(FIELD_LABELS[field] ?? field);
      }
      continue;
    }

    const actual = input.normalized_answers[rule.evaluator.field];
    const result = matches(rule.evaluator.operator, actual, rule.evaluator.expected);
    if (result === null) {
      gaps.push(FIELD_LABELS[rule.evaluator.field] ?? rule.evaluator.field);
    } else if (result) {
      screeningPasses += 1;
      reasons.push(`${rule.rule_id}：已披露事实未与该项当前官方筛选条件冲突。`);
    } else {
      screeningMismatch = true;
      reasons.push(`${rule.rule_id}：已披露事实与该项当前官方筛选条件不符。`);
    }
  }

  if (hasUntrustedOfficialRule) {
    return {
      branch_code: branchCode,
      path_code: pathCode,
      fit_status: "needs_verification",
      reasons: unique(reasons.length > 0 ? reasons : ["规则过期、未核验或来源层级不足。"]),
      gaps: unique(gaps),
      manual_checks: unique(manualChecks),
    };
  }

  if (screeningMismatch) {
    return {
      branch_code: branchCode,
      path_code: pathCode,
      fit_status: "clear_mismatch",
      reasons: unique([...reasons, "该状态仅反映当前已披露事实，不是法律结论或申请决定。"]),
      gaps: unique(gaps),
      manual_checks: unique(manualChecks),
    };
  }

  if (gaps.length > 0) {
    return {
      branch_code: branchCode,
      path_code: pathCode,
      fit_status: "insufficient_information",
      reasons: unique(reasons.length > 0 ? reasons : ["现有资料不足以完成该路径筛选。"]),
      gaps: unique(gaps),
      manual_checks: unique(manualChecks),
    };
  }

  return {
    branch_code: branchCode,
    path_code: pathCode,
    fit_status: screeningPasses > 0 ? "possible_fit" : "needs_verification",
    reasons: unique(
      reasons.length > 0
        ? reasons
        : ["已收集基础事实，但该路径仍以人工核验规则为主。"],
    ),
    gaps: [],
    manual_checks: unique(manualChecks),
  };
}

function mergeBranches(pathCode: IdentityPathCode, branches: readonly BranchEvaluation[]): PathEngineResult {
  if (branches.length === 1) {
    const [{ fit_status, reasons, gaps, manual_checks }] = branches;
    return { path_code: pathCode, fit_status, reasons, gaps, manual_checks };
  }

  const statusOrder: readonly FitStatus[] = [
    "possible_fit",
    "needs_verification",
    "insufficient_information",
    "clear_mismatch",
  ];
  const fitStatus = statusOrder.find((status) => branches.some((branch) => branch.fit_status === status)) ??
    "needs_verification";

  return {
    path_code: pathCode,
    fit_status: fitStatus,
    reasons: unique(
      branches.flatMap((branch) => branch.reasons.map((reason) => `${branchLabels[branch.branch_code]}：${reason}`)),
    ),
    gaps: unique(branches.flatMap((branch) => branch.gaps)),
    manual_checks: unique(
      branches.flatMap((branch) =>
        branch.manual_checks.map((check) => `${branchLabels[branch.branch_code]}：${check}`),
      ),
    ),
  };
}

export function runPathEngine(
  input: PathEngineInput,
  rules: readonly IdentityPolicyRule[] = IDENTITY_POLICY_RULES,
): readonly PathEngineResult[] {
  return IDENTITY_PATH_DEFINITIONS.map((definition) => {
    const branches = definition.policy_branches.map((branchCode) =>
      evaluateBranch(definition.path_code, branchCode, input, rules),
    );
    return mergeBranches(definition.path_code, branches);
  });
}

export function deriveCandidatePaths(answers: NormalizedIdentityAnswers): readonly IdentityPathCode[] {
  const routes = Array.isArray(answers.route_openness) ? answers.route_openness : [];
  const goals = Array.isArray(answers.identity_primary_goals) ? answers.identity_primary_goals : [];
  const candidates = new Set<IdentityPathCode>();

  if (routes.includes("compare_all") || routes.includes("ai_assisted_judgement")) {
    return IDENTITY_PATH_DEFINITIONS.map(({ path_code }) => path_code);
  }
  if (routes.includes("capital_investment") || goals.includes("asset_and_family_planning")) candidates.add("new_cies");
  if (routes.includes("talent_programmes")) {
    candidates.add("ttps");
    candidates.add("qmas");
  }
  if (routes.includes("hong_kong_employment") || goals.includes("career_development")) candidates.add("employment");
  if (routes.includes("hong_kong_study") || goals.includes("further_study")) candidates.add("study_iang");
  if (routes.includes("family_member_identity_arrangement") || goals.includes("family_life_in_hong_kong")) {
    candidates.add("dependant");
  }

  return IDENTITY_PATH_DEFINITIONS.map(({ path_code }) => path_code).filter((pathCode) => candidates.has(pathCode));
}

export function createNormalizedEngineAnswers(
  assessment: NormalizedIdentityAssessment,
  dynamicAnswers: Readonly<Record<string, unknown>>,
): NormalizedIdentityAnswers {
  return {
    ...assessment,
    degree_level: assessment.highest_education,
    ...dynamicAnswers,
  };
}

export function pathDisplayName(pathCode: IdentityPathCode): string {
  return getIdentityPathDefinition(pathCode).display_name;
}
