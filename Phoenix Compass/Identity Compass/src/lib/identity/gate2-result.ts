import type { IdentityPathCode } from "@/lib/identity/path-registry";
import type { PathEngineResult } from "@/lib/identity/path-engine";
import { IDENTITY_POLICY_RULES, type EvidenceStatus } from "@/lib/identity/policy";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

export const IDENTITY_RESULT_SCHEMA_VERSION = "IDENTITY_RESULT_SCHEMA_V1" as const;

export type RouteEvaluationState =
  | "POTENTIAL_MATCH"
  | "POTENTIAL_MATCH_WITH_GAPS"
  | "INSUFFICIENT_INFORMATION"
  | "LIKELY_NOT_MATCH_ON_VERIFIED_CRITERIA"
  | "HUMAN_REVIEW_REQUIRED";

export type IdentityReadiness =
  | "READY_TO_PREPARE"
  | "NEEDS_INFORMATION"
  | "NEEDS_GAP_CLOSURE"
  | "HUMAN_REVIEW_REQUIRED";

export type Gate2EvidenceReference = Readonly<{
  evidence_id: string;
  evidence_status: EvidenceStatus;
  official_url: string | null;
}>;

export type Gate2RouteEvaluation = Readonly<{
  route_code: IdentityPathCode;
  state: RouteEvaluationState;
  reasons: readonly string[];
  gaps: readonly string[];
  manual_checks: readonly string[];
  evidence_ids: readonly string[];
}>;

export type IdentityCompassResultV1 = Readonly<{
  result_schema_version: typeof IDENTITY_RESULT_SCHEMA_VERSION;
  assessment_id: string;
  rule_set_version: typeof POLICY_LIBRARY_VERSION;
  evaluated_at: string;
  recommended_path: Gate2RouteEvaluation | null;
  alternative_paths: readonly Gate2RouteEvaluation[];
  readiness: IdentityReadiness;
  key_gaps: readonly string[];
  risk_flags: readonly string[];
  next_actions: readonly string[];
  evidence_snapshot: readonly Gate2EvidenceReference[];
  explanation_boundary: Readonly<{
    deterministic_outcome_hash: string;
    llm_used: boolean;
    llm_may_change_outcome: false;
  }>;
}>;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function evidenceForPath(pathCode: IdentityPathCode): Gate2EvidenceReference[] {
  const references = IDENTITY_POLICY_RULES
    .filter(({ path_code }) => path_code === pathCode)
    .map(({ evidence_id, evidence_status, official_url }) => ({ evidence_id, evidence_status, official_url }));
  const seen = new Set<string>();
  return references.filter(({ evidence_id }) => {
    if (seen.has(evidence_id)) return false;
    seen.add(evidence_id);
    return true;
  });
}

function mapState(result: PathEngineResult): RouteEvaluationState {
  if (result.fit_status === "possible_fit") {
    return result.gaps.length > 0 || result.manual_checks.length > 0 ? "POTENTIAL_MATCH_WITH_GAPS" : "POTENTIAL_MATCH";
  }
  if (result.fit_status === "clear_mismatch") return "LIKELY_NOT_MATCH_ON_VERIFIED_CRITERIA";
  if (result.fit_status === "insufficient_information") return "INSUFFICIENT_INFORMATION";
  return "HUMAN_REVIEW_REQUIRED";
}

function mapRoute(result: PathEngineResult): Gate2RouteEvaluation {
  return {
    route_code: result.path_code,
    state: mapState(result),
    reasons: result.reasons,
    gaps: result.gaps,
    manual_checks: result.manual_checks,
    evidence_ids: evidenceForPath(result.path_code).map(({ evidence_id }) => evidence_id),
  };
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
  evaluated_at?: string;
  llm_used?: boolean;
}>): IdentityCompassResultV1 {
  const routes = input.path_results.map(mapRoute);
  const recommended = routes.find(({ state }) => state === "POTENTIAL_MATCH" || state === "POTENTIAL_MATCH_WITH_GAPS") ?? null;
  const alternatives = recommended ? routes.filter(({ route_code }) => route_code !== recommended.route_code) : routes;
  const keyGaps = unique(routes.flatMap(({ gaps }) => gaps));
  const evidenceSnapshot = unique(routes.flatMap(({ evidence_ids }) => evidence_ids)).map((evidenceId) => {
    const rule = IDENTITY_POLICY_RULES.find(({ evidence_id }) => evidence_id === evidenceId);
    return {
      evidence_id: evidenceId,
      evidence_status: rule?.evidence_status ?? "NEEDS_REVIEW",
      official_url: rule?.official_url ?? null,
    } satisfies Gate2EvidenceReference;
  });
  const hasUnverifiedEvidence = evidenceSnapshot.some(({ evidence_status }) => evidence_status !== "VERIFIED");
  const hasHumanReview = routes.some(({ state }) => state === "HUMAN_REVIEW_REQUIRED");

  let readiness: IdentityReadiness = "NEEDS_INFORMATION";
  if (recommended?.state === "POTENTIAL_MATCH") readiness = "READY_TO_PREPARE";
  else if (recommended?.state === "POTENTIAL_MATCH_WITH_GAPS") readiness = "NEEDS_GAP_CLOSURE";
  else if (hasHumanReview) readiness = "HUMAN_REVIEW_REQUIRED";

  const riskFlags = [
    hasUnverifiedEvidence ? "UNVERIFIED_OR_LIVE_EVIDENCE_REQUIRES_RECHECK" : null,
    hasHumanReview ? "HUMAN_REVIEW_REQUIRED" : null,
  ].filter((value): value is string => Boolean(value));

  const nextActions = [
    keyGaps.length > 0 ? "补齐结构化资料缺口。" : "保存当前事实与证据快照。",
    hasUnverifiedEvidence ? "刷新并核验动态官方证据后再运行确定性筛选。" : null,
    routes.some(({ manual_checks }) => manual_checks.length > 0) ? "由顾问完成所有 manual checks。" : null,
  ].filter((value): value is string => Boolean(value));

  const deterministicPayload = {
    assessment_id: input.assessment_id,
    rule_set_version: POLICY_LIBRARY_VERSION,
    routes,
    readiness,
    key_gaps: keyGaps,
    risk_flags: riskFlags,
    evidence_snapshot: evidenceSnapshot,
  };

  return {
    result_schema_version: IDENTITY_RESULT_SCHEMA_VERSION,
    assessment_id: input.assessment_id,
    rule_set_version: POLICY_LIBRARY_VERSION,
    evaluated_at: input.evaluated_at ?? new Date().toISOString(),
    recommended_path: recommended,
    alternative_paths: alternatives,
    readiness,
    key_gaps: keyGaps,
    risk_flags: riskFlags,
    next_actions: nextActions,
    evidence_snapshot: evidenceSnapshot,
    explanation_boundary: {
      deterministic_outcome_hash: stableFingerprint(deterministicPayload),
      llm_used: input.llm_used ?? false,
      llm_may_change_outcome: false,
    },
  };
}
