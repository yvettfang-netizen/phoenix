import { describe, expect, it } from "vitest";

import { IDENTITY_PATH_ORDER } from "@/lib/identity/path-registry";
import { runPathEngine } from "@/lib/identity/path-engine";
import { IDENTITY_POLICY_RULES, type IdentityPolicyRule } from "@/lib/identity/policy";
import { POLICY_LIBRARY_VERSION } from "@/lib/identity/types";

describe("Identity Path Engine", () => {
  it("returns all six paths in locked order", () => {
    const results = runPathEngine({ normalized_answers: {}, policy_version: POLICY_LIBRARY_VERSION });
    expect(results.map(({ path_code }) => path_code)).toEqual(IDENTITY_PATH_ORDER);
  });

  it("does not guess when normalized answers are incomplete", () => {
    const results = runPathEngine({ normalized_answers: {}, policy_version: POLICY_LIBRARY_VERSION });
    expect(results.every(({ fit_status }) => fit_status === "insufficient_information")).toBe(true);
    expect(results.every(({ gaps }) => gaps.length > 0)).toBe(true);
    expect(JSON.stringify(results)).not.toContain("success_rate");
    expect(JSON.stringify(results)).not.toContain("approval_probability");
  });

  it("does not produce a deterministic output from expired policy", () => {
    const expiredRules = IDENTITY_POLICY_RULES.filter(({ path_code }) => path_code === "new_cies").map(
      (rule) => ({ ...rule, effective_status: "EXPIRED" }) satisfies IdentityPolicyRule,
    );
    const [newCies] = runPathEngine(
      {
        normalized_answers: {
          age_exact: 17,
          net_assets_hkd: 40_000_000,
          asset_holding_period_months: 12,
          beneficial_share_confirmed: "yes",
          planned_investment_hkd: 30_000_000,
          planned_asset_classes: "funds",
          nationality_residency_context: "provided",
        },
        policy_version: POLICY_LIBRARY_VERSION,
      },
      expiredRules,
    );
    expect(newCies.fit_status).toBe("needs_verification");
    expect(newCies.fit_status).not.toBe("clear_mismatch");
    expect(newCies.manual_checks.join(" ")).toContain("不得产生确定性结论");
  });

  it("allows a clear mismatch only from a current official screening rule", () => {
    const [newCies] = runPathEngine({
      normalized_answers: { age_exact: 17 },
      policy_version: POLICY_LIBRARY_VERSION,
    });
    expect(newCies.fit_status).toBe("clear_mismatch");
    expect(newCies.reasons.join(" ")).toContain("不是法律结论");
  });

  it("does not let internal experience or model inference override official current", () => {
    const officialAgeRule = IDENTITY_POLICY_RULES.find(({ rule_id }) => rule_id === "NCIES-R01");
    expect(officialAgeRule).toBeDefined();
    const lowerLayerRule = {
      ...officialAgeRule!,
      rule_id: "MODEL-AGE-INFERENCE",
      source_type: "MODEL_INFERENCE",
      source: "Model inference fixture",
      official_url: null,
      evaluator: { field: "age_exact", operator: "gte_number", expected: 99 },
    } satisfies IdentityPolicyRule;
    const [newCies] = runPathEngine(
      { normalized_answers: { age_exact: 17 }, policy_version: POLICY_LIBRARY_VERSION },
      [officialAgeRule!, lowerLayerRule],
    );
    expect(newCies.fit_status).toBe("clear_mismatch");
    expect(newCies.manual_checks.join(" ")).toContain("MODEL_INFERENCE");
  });
});
