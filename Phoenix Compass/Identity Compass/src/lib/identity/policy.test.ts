import { describe, expect, it } from "vitest";

import {
  IDENTITY_POLICY_RULES,
  STUDY_ADMISSION_INTERNAL_EXPERIENCE,
  assertPolicyRuleMetadata,
  sortPolicyRulesByPriority,
  type IdentityPolicyRule,
  type PolicySourceType,
} from "@/lib/identity/policy";

describe("Identity Policy Layer — Gate 2", () => {
  it("requires evidence binding and complete lifecycle metadata on every rule", () => {
    for (const rule of [...IDENTITY_POLICY_RULES, STUDY_ADMISSION_INTERNAL_EXPERIENCE]) {
      expect(() => assertPolicyRuleMetadata(rule)).not.toThrow();
      expect(rule.evidence_id).toBeTruthy();
      expect(rule.evidence_status).toBeTruthy();
      expect(rule.source).toBeTruthy();
      expect(rule.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.effective_scope).toBeTruthy();
      expect(rule.owner).toBeTruthy();
      if (rule.source_type === "OFFICIAL") {
        expect(rule.evidence_id).toMatch(/^EVID-HK-/);
        expect(rule.official_url).toMatch(/^https:\/\//);
      }
    }
  });

  it("allows CURRENT official rules only when Gate 2 evidence is VERIFIED", () => {
    for (const rule of IDENTITY_POLICY_RULES) {
      if (rule.evidence_status === "VERIFIED") expect(rule.effective_status).toBe("CURRENT");
      if (rule.evidence_status === "NEEDS_REVIEW") expect(rule.effective_status).toBe("UNVERIFIED");
      if (rule.evidence_status === "RETIRED") expect(rule.effective_status).toBe("SUPERSEDED");
    }
  });

  it("binds TTPS A threshold to the verified Gate 2 evidence record", () => {
    const rule = IDENTITY_POLICY_RULES.find(({ rule_id }) => rule_id === "TTPSA-R01");
    expect(rule).toMatchObject({
      evidence_id: "EVID-HK-TTPS-001",
      evidence_status: "VERIFIED",
      effective_status: "CURRENT",
      evaluator: { field: "prior_year_annual_income_hkd", operator: "gte_number", expected: 2_500_000 },
    });
  });

  it("keeps live TTPS university/quota references fail-closed", () => {
    const liveRules = IDENTITY_POLICY_RULES.filter(({ evidence_id }) => evidence_id === "EVID-HK-TTPS-002");
    expect(liveRules.length).toBeGreaterThan(0);
    expect(liveRules.every(({ evidence_status }) => evidence_status === "NEEDS_REVIEW")).toBe(true);
    expect(liveRules.every(({ effective_status }) => effective_status === "UNVERIFIED")).toBe(true);
  });

  it("orders current official rules ahead of lower-authority or stale rules", () => {
    const base = IDENTITY_POLICY_RULES.find(({ effective_status }) => effective_status === "CURRENT")!;
    const fixture = (source_type: PolicySourceType, effective_status: IdentityPolicyRule["effective_status"]) => ({
      ...base,
      rule_id: `${source_type}-${effective_status}`,
      source_type,
      effective_status,
      official_url: source_type === "OFFICIAL" ? base.official_url : null,
    }) satisfies IdentityPolicyRule;

    expect(
      sortPolicyRulesByPriority([
        fixture("MODEL_INFERENCE", "CURRENT"),
        fixture("INTERNAL_EXPERIENCE", "CURRENT"),
        fixture("APPROVED_PHOENIX_BASELINE", "CURRENT"),
        fixture("OFFICIAL", "EXPIRED"),
        fixture("OFFICIAL", "CURRENT"),
      ]).map(({ source_type, effective_status }) => `${source_type}:${effective_status}`),
    ).toEqual([
      "OFFICIAL:CURRENT",
      "APPROVED_PHOENIX_BASELINE:CURRENT",
      "INTERNAL_EXPERIENCE:CURRENT",
      "MODEL_INFERENCE:CURRENT",
      "OFFICIAL:EXPIRED",
    ]);
  });

  it("keeps the Study Admission Matrix in internal experience only", () => {
    expect(STUDY_ADMISSION_INTERNAL_EXPERIENCE).toMatchObject({
      source_type: "INTERNAL_EXPERIENCE",
      official_url: null,
      effective_scope: expect.stringContaining("excludes Student Visa and IANG"),
    });
  });
});
