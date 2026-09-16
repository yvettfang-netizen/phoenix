import { getIdentityPathDefinition, type IdentityPathCode } from "@/lib/identity/path-registry";
import type { PathEngineResult } from "@/lib/identity/path-engine";
import { IDENTITY_POLICY_RULES, type EvidenceStatus, type IdentityPolicyRule } from "@/lib/identity/policy";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

export const IDENTITY_RESULT_SCHEMA_VERSION = "HK_IDENTITY_RESULT_2026_09_V1" as const;
export const IDENTITY_EVIDENCE_REGISTRY_VERSION = "HK_IDENTITY_EVIDENCE_2026_09_V0.2" as const;
export const IDENTITY_FULL_QUESTION_BANK_VERSION = "HK_IDENTITY_QBANK_2026_09_V1" as const;

export type RouteOutcome =
  | "ROUTE_MATCH"
  | "POTENTIAL_MATCH_EVIDENCE_REQUIRED"
  | "NOT_ROUTABLE_UNDER_CURRENT_FACTS"
  | "INSUFFICIENT_INFORMATION"
  | "HUMAN_REVIEW_REQUIRED"
  | "NOT_APPLICABLE";

export type IdentityReadiness =
  | "READY_FOR_DOCUMENT_REVIEW"
  | "PARTIAL_EVIDENCE"
  | "EARLY_PLANNING"
  | "STATUS_MAINTENANCE_REQUIRED"
  | "URGENT_EXPIRY_REVIEW"
  | "HUMAN_REVIEW_REQUIRED";

export type Gate2EvidenceSummary = Readonly<{
  evidence_id: string;
  official_source_title: string;
  source_authority: string;
  official_url: string | null;
  evidence_status: EvidenceStatus;
  effective_or_publication_date: string | null;
  rule_ids: readonly string[];
}>;

export type Gate2RouteEvaluation = Readonly<{
  route_code: IdentityPathCode;
  route_name: string;
  outcome: RouteOutcome;
  matched_rules: readonly string[];
  unmet_rules: readonly string[];
  unknown_rules: readonly string[];
  evidence_refs: readonly string[];
  policy_effective_date: string | null;
  reasons: readonly string[];
  gaps: readonly string[];
  manual_checks: readonly string[];
}>;

export type IdentityCompassResultV1 = Readonly<{
  result_schema_version: typeof IDENTITY_RESULT_SCHEMA_VERSION;
  assessment_id: string;
  rule_version: typeof POLICY_LIBRARY_VERSION;
  evidence_registry_version: typeof IDENTITY_EVIDENCE_REGISTRY_VERSION;
  question_bank_version: typeof IDENTITY_FULL_QUESTION_BANK_VERSION;
  assessment_timestamp: string;
  primary_family_id: string | null;
  consent_id: string | null;
  current_status: string | null;
  recommended_path: Gate2RouteEvaluation | null;
  alternative_paths: readonly Gate2RouteEvaluation[];
  readiness: IdentityReadiness;
  gaps: readonly string[];
  risk_flags: readonly string[];
  next_actions: readonly string[];
  evidence_summary: readonly Gate2EvidenceSummary[];
  journey_handoff: Readonly<{
    allowed: false;
    reason: "GATE_2_SYNTHETIC_ONLY";
  }>;
  explanation: Readonly<{
    deterministic_outcome_hash: string;
    llm_used: boolean;
    llm_may_change_outcome: false;
  }>;
  human_review: Readonly<{
    required: boolean;
    reason_codes: readonly string[];
    review_scope: readonly string[];
    blocking_unknowns: readonly string[];
  }>;
}>;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function rulesForPath(pathCode: IdentityPathCode): readonly IdentityPolicyRule[] {
  return IDENTITY_POLICY_RULES.filter(({ path_code }) => path_code === pathCode);
}

function referencedRuleIds(result: PathEngineResult, marker: "matched" | "unmet"): string[] {
  const rules = rulesForPath(result.path_code);
  const phrases = marker === "matched" ? ["未与该项当前官方筛选条件冲突"] : ["与该项当前官方筛选条件不符"];
  return rules
    .filter(({ rule_id }) => result.reasons.some((reason) => reason.includes(rule_id) && phrases.some((phrase) => reason.includes(phrase))))
    .map(({ rule_id }) => rule_id);
}

function mapOutcome(result: PathEngineResult, applicable: boolean): RouteOutcome {
  if (!applicable) return "NOT_APPLICABLE";
  if (result.fit_status === "possible_fit") {
    return result.gaps.length > 0 || result.manual_checks.length > 0
      ? "POTENTIAL_MATCH_EVIDENCE_REQUIRED"
      : "ROUTE_MATCH";
  }
  if (result.fit_status === "clear_mismatch") return "NOT_ROUTABLE_UNDER_CURRENT_FACTS";
  if (result.fit_status === "insufficient_information") return "INSUFFICIENT_INFORMATION";
  return "HUMAN_REVIEW_REQUIRED";
}

function mapRoute(result: PathEngineResult, applicable: boolean): Gate2RouteEvaluation {
  const rules = rulesForPath(result.path_code);
  const matched = referencedRuleIds(result, "matched");
  const unmet = referencedRuleIds(result, "unmet");
  const known = new Set([...matched, ...unmet]);
  const unknown = rules.filter(({ rule_id }) => !known.has(rule_id)).map(({ rule_id }) => rule_id);
  const verifiedDates = rules
    .filter(({ evidence_status }) => evidence_status === "VERIFIED")
    .map(({ verified_at }) => verified_at)
    .filter(Boolean)
    .sort();

  return {
    route_code: result.path_code,
    route_name: getIdentityPathDefinition(result.path_code).display_name,
    outcome: mapOutcome(result, applicable),
    matched_rules: applicable ? matched : [],
    unmet_rules: applicable ? unmet : [],
    unknown_rules: applicable ? unknown : [],
    evidence_refs: unique(rules.map(({ evidence_id }) => evidence_id)),
    policy_effective_date: verifiedDates.at(-1) ?? null,
    reasons: result.reasons,
    gaps: applicable ? result.gaps : [],
    manual_checks: applicable ? result.manual_checks : [],
  };
}

function sourceAuthority(source: string): string {
  return source.split(" — ")[0]?.trim() || source;
}

function buildEvidenceSummary(routes: readonly Gate2RouteEvaluation[]): Gate2EvidenceSummary[] {
  const evidenceIds = unique(routes.flatMap(({ evidence_refs }) => evidence_refs));
  return evidenceIds.map((evidenceId) => {
    const rules = IDENTITY_POLICY_RULES.filter(({ evidence_id }) => evidence_id === evidenceId);
    const representative = rules[0];
    return {
      evidence_id: evidenceId,
      official_source_title: representative?.source ?? "Unknown source",
      source_authority: representative ? sourceAuthority(representative.source) : "Unknown authority",
      official_url: representative?.official_url ?? null,
      evidence_status: representative?.evidence_status ?? "NEEDS_REVIEW",
      effective_or_publication_date: null,
      rule_ids: rules.map(({ rule_id }) => rule_id),
    };
  });
}

function stableFingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function mapPathResultsToGate2Result(input: Readonly<{
  assessment_id: string;
  path_results: readonly PathEngineResult[];
  candidate_path_codes?: readonly IdentityPathCode[];
  assessment_timestamp?: string;
  primary_family_id?: string | null;
  consent_id?: string | null;
  current_status?: string | null;
  status_maintenance_required?: boolean;
  expiry_within_42_days?: boolean;
  llm_used?: boolean;
}>): IdentityCompassResultV1 {
  const candidateSet = new Set<IdentityPathCode>(input.candidate_path_codes ?? input.path_results.map(({ path_code }) => path_code));
  const routes = input.path_results.map((result) => mapRoute(result, candidateSet.has(result.path_code)));
  const viable = routes.filter(({ outcome }) => outcome === "ROUTE_MATCH" || outcome === "POTENTIAL_MATCH_EVIDENCE_REQUIRED");
  const recommended = viable.length === 1 ? viable[0] : null;
  const alternatives = recommended ? routes.filter(({ route_code }) => route_code !== recommended.route_code) : routes;
  const gaps = unique(routes.filter(({ outcome }) => outcome !== "NOT_APPLICABLE").flatMap(({ gaps: routeGaps }) => routeGaps));
  const evidenceSummary = buildEvidenceSummary(routes.filter(({ outcome }) => outcome !== "NOT_APPLICABLE"));
  const hasEvidenceReview = evidenceSummary.some(({ evidence_status }) => evidence_status !== "VERIFIED");
  const routeHumanReview = routes.some(({ outcome }) => outcome === "HUMAN_REVIEW_REQUIRED");
  const multipleViable = viable.length > 1;
  const hasManualChecks = routes.some(({ manual_checks }) => manual_checks.length > 0);

  const humanReviewReasons = [
    hasEvidenceReview ? "POLICY_SOURCE_NEEDS_REVIEW" : null,
    routeHumanReview ? "ROUTE_EVALUATION_REQUIRES_HUMAN_REVIEW" : null,
    multipleViable ? "MULTIPLE_VIABLE_ROUTES_REQUIRE_EVIDENCE_BASED_RANKING" : null,
  ].filter((value): value is string => Boolean(value));

  const riskFlags = [
    hasEvidenceReview ? "POLICY_SOURCE_NEEDS_REVIEW" : null,
    evidenceSummary.some(({ evidence_id }) => evidence_id === "EVID-HK-TTPS-002") ? "ELIGIBLE_UNIVERSITY_LIVE_CHECK_REQUIRED" : null,
    evidenceSummary.some(({ evidence_id }) => evidence_id === "EVID-HK-TTPS-002") ? "QUOTA_LIVE_CHECK_REQUIRED" : null,
    gaps.length > 0 ? "DOCUMENTARY_EVIDENCE_MISSING" : null,
    input.expiry_within_42_days ? "EXPIRY_WITHIN_42_DAYS" : null,
  ].filter((value): value is string => Boolean(value));

  let readiness: IdentityReadiness = "EARLY_PLANNING";
  if (input.expiry_within_42_days) readiness = "URGENT_EXPIRY_REVIEW";
  else if (input.status_maintenance_required) readiness = "STATUS_MAINTENANCE_REQUIRED";
  else if (humanReviewReasons.length > 0) readiness = "HUMAN_REVIEW_REQUIRED";
  else if (recommended?.outcome === "ROUTE_MATCH") readiness = "READY_FOR_DOCUMENT_REVIEW";
  else if (recommended?.outcome === "POTENTIAL_MATCH_EVIDENCE_REQUIRED" || gaps.length > 0) readiness = "PARTIAL_EVIDENCE";

  const nextActions = [
    gaps.length > 0 ? "补齐结构化资料与文件证据缺口。" : "保存当前事实与证据快照。",
    hasEvidenceReview ? "刷新并核验动态官方证据后再运行确定性筛选。" : null,
    hasManualChecks ? "由顾问完成所有 manual checks。" : null,
    multipleViable ? "按用户目标、家庭适配、维护负担与证据完整度进行人工排序；不得使用虚构获批概率。" : null,
  ].filter((value): value is string => Boolean(value));

  const blockingUnknowns = unique([
    ...gaps,
    ...routes.filter(({ outcome }) => outcome === "HUMAN_REVIEW_REQUIRED").flatMap(({ unknown_rules }) => unknown_rules),
  ]);

  const deterministicPayload = {
    assessment_id: input.assessment_id,
    rule_version: POLICY_LIBRARY_VERSION,
    evidence_registry_version: IDENTITY_EVIDENCE_REGISTRY_VERSION,
    question_bank_version: IDENTITY_FULL_QUESTION_BANK_VERSION,
    routes,
    recommended_path: recommended,
    readiness,
    gaps,
    risk_flags: riskFlags,
    evidence_summary: evidenceSummary,
    human_review_reasons: humanReviewReasons,
  };

  return {
    result_schema_version: IDENTITY_RESULT_SCHEMA_VERSION,
    assessment_id: input.assessment_id,
    rule_version: POLICY_LIBRARY_VERSION,
    evidence_registry_version: IDENTITY_EVIDENCE_REGISTRY_VERSION,
    question_bank_version: IDENTITY_FULL_QUESTION_BANK_VERSION,
    assessment_timestamp: input.assessment_timestamp ?? new Date().toISOString(),
    primary_family_id: input.primary_family_id ?? null,
    consent_id: input.consent_id ?? null,
    current_status: input.current_status ?? null,
    recommended_path: recommended,
    alternative_paths: alternatives,
    readiness,
    gaps,
    risk_flags: riskFlags,
    next_actions: nextActions,
    evidence_summary: evidenceSummary,
    journey_handoff: { allowed: false, reason: "GATE_2_SYNTHETIC_ONLY" },
    explanation: {
      deterministic_outcome_hash: stableFingerprint(deterministicPayload),
      llm_used: input.llm_used ?? false,
      llm_may_change_outcome: false,
    },
    human_review: {
      required: humanReviewReasons.length > 0,
      reason_codes: humanReviewReasons,
      review_scope: unique([
        ...(hasEvidenceReview ? ["official_evidence_refresh"] : []),
        ...(hasManualChecks ? ["manual_policy_checks"] : []),
        ...(multipleViable ? ["multi_route_ranking"] : []),
      ]),
      blocking_unknowns: blockingUnknowns,
    },
  };
}
