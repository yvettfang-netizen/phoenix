import { describe, expect, it } from "vitest";

import { createMockFeishuRepositories, MOCK_FEISHU_STORAGE_KEY } from "@/lib/identity/adapters/mock-feishu";
import { persistCompletedIdentityAssessment } from "@/lib/identity/adapters/persist";
import { normalizeIdentityAssessment } from "@/lib/identity/normalize";
import { MemoryStorage } from "@/lib/identity/test-helpers";
import type { FreeIdentityAnswers } from "@/lib/identity/types";

const answers: FreeIdentityAnswers = {
  identity_primary_goals: ["further_study"],
  current_hk_status: "mainland_resident",
  age_band: "25_34",
  highest_education: "bachelor",
  employment_status: "employed",
  route_openness: ["hong_kong_study"],
};

describe("Mock Feishu adapter boundary", () => {
  it("upserts one family and user while retaining separate assessments", async () => {
    const storage = new MemoryStorage();
    const repositories = createMockFeishuRepositories(storage);
    const first = normalizeIdentityAssessment(answers, {
      family_id: "fam_one",
      user_id: "usr_one",
      assessment_id: "asm_one",
    });
    const second = normalizeIdentityAssessment(answers, {
      family_id: "fam_one",
      user_id: "usr_one",
      assessment_id: "asm_two",
    });

    await persistCompletedIdentityAssessment(repositories, first);
    await persistCompletedIdentityAssessment(repositories, second);

    const database = JSON.parse(storage.getItem(MOCK_FEISHU_STORAGE_KEY) ?? "{}") as Record<string, Record<string, unknown>>;
    expect(Object.keys(database.families)).toEqual(["fam_one"]);
    expect(Object.keys(database.profiles)).toEqual(["usr_one"]);
    expect(Object.keys(database.assessments)).toEqual(["asm_one", "asm_two"]);
    await expect(repositories.assessments.findByAssessmentId("asm_two")).resolves.toMatchObject({
      family_identity_type: "Study-led Family",
    });
  });
});
