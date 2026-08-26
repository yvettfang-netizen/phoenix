import { describe, expect, it } from "vitest";

import {
  IDENTITY_POLICY_RULES,
  STUDY_ADMISSION_INTERNAL_EXPERIENCE,
  assertPolicyRuleMetadata,
  sortPolicyRulesByPriority,
  type IdentityPolicyRule,
  type PolicySourceType,
} from "@/lib/identity/policy";

describe("Identity Policy Layer", () => {
  it("requires complete source and lifecycle metadata on every rule", () => {
    for (const rule of [...IDENTITY_POLICY_RULES, STUDY_ADMISSION_INTERNAL_EXPERIENCE]) {
      expect(() => assertPolicyRuleMetadata(rule)).not.toThrow();
      expect(rule.source_type).toBeTruthy();
      expect(rule.source).toBeTruthy();
      expect(rule.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.effective_scope).toBeTruthy();
      expect(rule.effective_status).toBeTruthy();
      expect(rule.owner).toBeTruthy();
      if (rule.source_type === "OFFICIAL") expect(rule.official_url).toMatch(/^https:\/\//);
    }
  });

  it("orders official current above baseline, internal experience and model inference", () => {
    const base = IDENTITY_POLICY_RULES[0];
    const fixture = (source_type: PolicySourceType, effective_status: IdentityPolicyRule["effective_status"] = "CURRENT") => ({
      ...base,
      rule_id: `${source_type}-${effective_status}`,
      source_type,
      effective_status,
      official_url: source_type === "OFFICIAL" ? base.official_url : null,
    }) satisfies IdentityPolicyRule;

    expect(
      sortPolicyRulesByPriority([
        fixture("MODEL_INFERENCE"),
        fixture("INTERNAL_EXPERIENCE"),
        fixture("APPROVED_PHOENIX_BASELINE"),
        fixture("OFFICIAL", "EXPIRED"),
        fixture("OFFICIAL"),
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
