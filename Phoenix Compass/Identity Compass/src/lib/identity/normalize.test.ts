import { describe, expect, it } from "vitest";

import { normalizeIdentityAssessment, validateFreeIdentityAnswers } from "@/lib/identity/normalize";
import {
  IDENTITY_ASSESSMENT_VERSION,
  POLICY_LIBRARY_VERSION,
  QUESTION_BANK_VERSION,
  type FreeIdentityAnswers,
  type IdentityIds,
} from "@/lib/identity/types";

const answers: FreeIdentityAnswers = {
  identity_primary_goals: ["child_education", "additional_future_option"],
  current_hk_status: "mainland_resident",
  age_band: "35_44",
  highest_education: "bachelor",
  employment_status: "employed",
  route_openness: ["compare_all"],
};

const ids: IdentityIds = {
  family_id: "fam_test-family",
  user_id: "usr_test-user",
  assessment_id: "asm_test-assessment",
};

describe("Identity normalized data contract", () => {
  it("records IDs and all required versions using canonical field names", () => {
    const normalized = normalizeIdentityAssessment(answers, ids);
    expect(normalized).toMatchObject({
      ...ids,
      assessment_version: IDENTITY_ASSESSMENT_VERSION,
      question_bank_version: QUESTION_BANK_VERSION,
      policy_library_version: POLICY_LIBRARY_VERSION,
      family_identity_type: "Education-led Family",
    });
    expect(Object.keys(normalized)).not.toContain("hkStatus2");
    expect(Object.keys(normalized)).not.toContain("routeA");
    expect(Object.keys(normalized)).not.toContain("eduType");
    expect(Object.keys(normalized)).not.toContain("tempUser");
  });

  it("rejects missing answers and unrecognized option codes", () => {
    expect(validateFreeIdentityAnswers({ ...answers, age_band: undefined }).success).toBe(false);
    expect(validateFreeIdentityAnswers({ ...answers, route_openness: ["fake_route" as never] }).success).toBe(false);
  });
});
