import { describe, expect, it } from "vitest";

import { mapPathResultsToGate2Result } from "@/lib/identity/gate2-result";
import { runPathEngine } from "@/lib/identity/path-engine";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

function run(answers: Readonly<Record<string, unknown>>) {
  return runPathEngine({ normalized_answers: answers, policy_version: POLICY_LIBRARY_VERSION });
}

describe("Identity Gate 2 Result Schema V1", () => {
  it("maps the synthetic TTPS-A threshold persona without approval probability language", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_ttps_a",
      evaluated_at: "2026-09-03T12:00:00.000Z",
      path_results: run({
        prior_year_annual_income_hkd: 2_500_000,
        income_source_type: "employment_or_business",
      }),
    });

    expect(result.recommended_path?.route_code).toBe("ttps");
    expect(result.recommended_path?.state).toBe("POTENTIAL_MATCH_WITH_GAPS");
    expect(result.readiness).toBe("NEEDS_GAP_CLOSURE");
    expect(result.evidence_snapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidence_id: "EVID-HK-TTPS-001", evidence_status: "VERIFIED" }),
        expect.objectContaining({ evidence_id: "EVID-HK-TTPS-002", evidence_status: "NEEDS_REVIEW" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("approval_probability");
    expect(JSON.stringify(result)).not.toContain("success_rate");
  });

  it("keeps the HK$2,499,999 boundary profile in human review instead of a false negative", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_ttps_boundary",
      evaluated_at: "2026-09-03T12:00:00.000Z",
      path_results: run({
        prior_year_annual_income_hkd: 2_499_999,
        income_source_type: "employment_or_business",
      }),
    });

    const ttps = result.alternative_paths.find(({ route_code }) => route_code === "ttps");
    expect(result.recommended_path).toBeNull();
    expect(ttps?.state).toBe("HUMAN_REVIEW_REQUIRED");
    expect(result.readiness).toBe("HUMAN_REVIEW_REQUIRED");
  });

  it("does not force a route when the synthetic persona is missing material facts", () => {
    const result = mapPathResultsToGate2Result({
      assessment_id: "asmt_synthetic_missing",
      evaluated_at: "2026-09-03T12:00:00.000Z",
      path_results: run({}),
    });

    expect(result.recommended_path).toBeNull();
    expect(["NEEDS_INFORMATION", "HUMAN_REVIEW_REQUIRED"]).toContain(result.readiness);
    expect(result.alternative_paths.length).toBeGreaterThan(0);
  });

  it("produces a stable deterministic fingerprint and never lets LLM usage alter the outcome contract", () => {
    const pathResults = run({ prior_year_annual_income_hkd: 2_500_000, income_source_type: "employment_or_business" });
    const a = mapPathResultsToGate2Result({
      assessment_id: "asmt_hash",
      evaluated_at: "2026-09-03T12:00:00.000Z",
      path_results: pathResults,
      llm_used: false,
    });
    const b = mapPathResultsToGate2Result({
      assessment_id: "asmt_hash",
      evaluated_at: "2026-09-03T12:01:00.000Z",
      path_results: pathResults,
      llm_used: true,
    });

    expect(a.explanation_boundary.deterministic_outcome_hash).toBe(b.explanation_boundary.deterministic_outcome_hash);
    expect(b.explanation_boundary.llm_used).toBe(true);
    expect(b.explanation_boundary.llm_may_change_outcome).toBe(false);
    expect(a.recommended_path).toEqual(b.recommended_path);
  });
});
