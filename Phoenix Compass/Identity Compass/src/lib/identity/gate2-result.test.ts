import { describe, expect, it } from "vitest";

import { mapPathResultsToGate2Result } from "@/lib/identity/gate2-result";
import { runPathEngine } from "@/lib/identity/path-engine";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

function run(answers: Readonly<Record<string, unknown>>) {
  return runPathEngine({ normalized_answers: answers, policy_version: POLICY_LIBRARY_VERSION });
}

describe("Identity Gate 2 Result Schema V1", () => {
  it("maps the synthetic TTPS-A threshold persona to the frozen Result Schema V1", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_ttps_a",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: run({
        prior_year_annual_income_hkd: 2_500_000,
        income_source_type: "employment_or_business",
      }),
    });

    expect(result.result_schema_version).toBe("HK_IDENTITY_RESULT_2026_09_V1");
    expect(result.recommended_path?.route_code).toBe("ttps");
    expect(result.recommended_path?.route_name).toBe("TTPS A/B/C");
    expect(result.recommended_path?.outcome).toBe("POTENTIAL_MATCH_EVIDENCE_REQUIRED");
    expect(result.recommended_path?.matched_rules).toContain("TTPSA-R01");
    expect(result.recommended_path?.evidence_refs).toEqual(
      expect.arrayContaining(["EVID-HK-TTPS-001", "EVID-HK-TTPS-002"]),
    );
    expect(result.evidence_summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidence_id: "EVID-HK-TTPS-001", evidence_status: "VERIFIED" }),
        expect.objectContaining({ evidence_id: "EVID-HK-TTPS-002", evidence_status: "NEEDS_REVIEW" }),
      ]),
    );
    expect(result.readiness).toBe("HUMAN_REVIEW_REQUIRED");
    expect(result.human_review.required).toBe(true);
    expect(result.risk_flags).toEqual(
      expect.arrayContaining(["ELIGIBLE_UNIVERSITY_LIVE_CHECK_REQUIRED", "QUOTA_LIVE_CHECK_REQUIRED"]),
    );
    expect(result.journey_handoff).toEqual({ allowed: false, reason: "GATE_2_SYNTHETIC_ONLY" });
    expect(JSON.stringify(result)).not.toContain("approval_probability");
    expect(JSON.stringify(result)).not.toContain("success_rate");
  });

  it("keeps the HK$2,499,999 boundary profile in human review instead of a false negative", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_ttps_boundary",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: run({
        prior_year_annual_income_hkd: 2_499_999,
        income_source_type: "employment_or_business",
      }),
    });

    const ttps = result.alternative_paths.find(({ route_code }) => route_code === "ttps");
    expect(result.recommended_path).toBeNull();
    expect(ttps?.outcome).toBe("HUMAN_REVIEW_REQUIRED");
    expect(result.readiness).toBe("HUMAN_REVIEW_REQUIRED");
    expect(result.human_review.required).toBe(true);
  });

  it("marks non-candidate routes NOT_APPLICABLE rather than pretending they were recommended alternatives", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_scope",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: run({ prior_year_annual_income_hkd: 2_500_000, income_source_type: "employment_or_business" }),
    });

    expect(result.alternative_paths.find(({ route_code }) => route_code === "qmas")?.outcome).toBe("NOT_APPLICABLE");
    expect(result.alternative_paths.find(({ route_code }) => route_code === "employment")?.outcome).toBe("NOT_APPLICABLE");
  });

  it("does not select an arbitrary recommended path when multiple routes remain viable", () => {
    const pathResults = run({});
    const syntheticViable = pathResults.map((result) =>
      result.path_code === "qmas" || result.path_code === "employment"
        ? { ...result, fit_status: "possible_fit" as const, gaps: [], manual_checks: [] }
        : result,
    );
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_multiple_viable",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["qmas", "employment"],
      path_results: syntheticViable,
    });

    expect(result.recommended_path).toBeNull();
    expect(result.human_review.reason_codes).toContain("MULTIPLE_VIABLE_ROUTES_REQUIRE_EVIDENCE_BASED_RANKING");
    expect(result.human_review.review_scope).toContain("multi_route_ranking");
  });

  it("does not force a route when the synthetic persona is missing material facts", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_missing",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: run({}),
    });

    expect(result.recommended_path).toBeNull();
    expect(["EARLY_PLANNING", "PARTIAL_EVIDENCE", "HUMAN_REVIEW_REQUIRED"]).toContain(result.readiness);
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it("produces a stable deterministic fingerprint and never lets LLM usage alter the outcome contract", () => {
    const pathResults = run({ prior_year_annual_income_hkd: 2_500_000, income_source_type: "employment_or_business" });
    const a = mapPathResultsToGate2Result({
      assessment_id: "asmt_hash",
      assessment_timestamp: "2026-09-03T12:00:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: pathResults,
      llm_used: false,
    });
    const b = mapPathResultsToGate2Result({
      assessment_id: "asmt_hash",
      assessment_timestamp: "2026-09-03T12:01:00.000Z",
      candidate_path_codes: ["ttps"],
      path_results: pathResults,
      llm_used: true,
    });

    expect(a.explanation.deterministic_outcome_hash).toBe(b.explanation.deterministic_outcome_hash);
    expect(b.explanation.llm_used).toBe(true);
    expect(b.explanation.llm_may_change_outcome).toBe(false);
    expect(a.recommended_path).toEqual(b.recommended_path);
  });
});
