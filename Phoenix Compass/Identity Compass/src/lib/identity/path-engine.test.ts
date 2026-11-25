import { describe, expect, it } from "vitest";

import { IDENTITY_PATH_ORDER } from "@/lib/identity/path-registry";
import { runPathEngine } from "@/lib/identity/path-engine";
import { IDENTITY_POLICY_RULES, type IdentityPolicyRule } from "@/lib/identity/policy";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

describe("Identity Path Engine — Gate 2", () => {
  it("returns all six existing runtime paths in locked order", () => {
    const results = runPathEngine({ normalized_answers: {}, policy_version: POLICY_LIBRARY_VERSION });
    expect(results.map(({ path_code }) => path_code)).toEqual(IDENTITY_PATH_ORDER);
  });

  it("fails closed when facts or verified policy rules are incomplete", () => {
    const results = runPathEngine({ normalized_answers: {}, policy_version: POLICY_LIBRARY_VERSION });
    expect(results.every(({ fit_status }) => ["insufficient_information", "needs_verification"].includes(fit_status))).toBe(true);
    expect(results.some(({ fit_status }) => fit_status === "possible_fit")).toBe(false);
    expect(JSON.stringify(results)).not.toContain("success_rate");
    expect(JSON.stringify(results)).not.toContain("approval_probability");
  });

  it("treats HK$2.5m exactly as satisfying the verified TTPS-A threshold", () => {
    const results = runPathEngine({
      normalized_answers: {
        prior_year_annual_income_hkd: 2_500_000,
        income_source_type: "employment_or_business",
      },
      policy_version: POLICY_LIBRARY_VERSION,
    });
    const ttps = results.find(({ path_code }) => path_code === "ttps");
    expect(ttps?.fit_status).toBe("possible_fit");
    expect(ttps?.reasons.join(" ")).toContain("TTPSA-R01");
    expect(ttps?.manual_checks.join(" ")).toContain("TTPSA-R02");
  });

  it("does not falsely reject a sub-threshold TTPS-A profile because B/C may still require review", () => {
    const results = runPathEngine({
      normalized_answers: {
        prior_year_annual_income_hkd: 2_499_999,
        income_source_type: "employment_or_business",
      },
      policy_version: POLICY_LIBRARY_VERSION,
    });
    const ttps = results.find(({ path_code }) => path_code === "ttps");
    expect(ttps?.fit_status).toBe("needs_verification");
    expect(ttps?.fit_status).not.toBe("clear_mismatch");
  });

  it("keeps TTPS-B dynamic university-list evidence fail-closed even at 36 months experience", () => {
    const results = runPathEngine({
      normalized_answers: {
        degree_institution: "synthetic eligible-list candidate",
        degree_level: "bachelor",
        work_experience_months_in_last_5y: 36,
      },
      policy_version: POLICY_LIBRARY_VERSION,
    });
    const ttps = results.find(({ path_code }) => path_code === "ttps");
    expect(ttps?.fit_status).toBe("needs_verification");
    expect(ttps?.manual_checks.join(" ")).toContain("UNVERIFIED");
  });

  it("does not produce deterministic output from stale evidence lifecycle", () => {
    const currentA = IDENTITY_POLICY_RULES.find(({ rule_id }) => rule_id === "TTPSA-R01")!;
    const expiredA = { ...currentA, effective_status: "EXPIRED" } satisfies IdentityPolicyRule;
    const results = runPathEngine(
      {
        normalized_answers: { prior_year_annual_income_hkd: 1 },
        policy_version: POLICY_LIBRARY_VERSION,
      },
      [expiredA],
    );
    const ttps = results.find(({ path_code }) => path_code === "ttps");
    expect(ttps?.fit_status).toBe("needs_verification");
    expect(ttps?.manual_checks.join(" ")).toContain("不得产生确定性结论");
  });
});
