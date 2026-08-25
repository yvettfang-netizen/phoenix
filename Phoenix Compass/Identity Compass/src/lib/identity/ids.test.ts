import { describe, expect, it } from "vitest";

import { getOrCreateIdentityIds, startNewIdentityAssessment } from "@/lib/identity/ids";
import { MemoryStorage } from "@/lib/identity/test-helpers";

describe("Identity ID model", () => {
  it("reuses Family and User IDs across visits while creating a new Assessment ID", () => {
    const persistentStorage = new MemoryStorage();
    const firstSession = new MemoryStorage();
    const ids = ["family", "user", "assessment-1", "assessment-2"];
    const idFactory = () => ids.shift() ?? "unexpected";

    const first = getOrCreateIdentityIds(persistentStorage, firstSession, idFactory);
    const sameSession = getOrCreateIdentityIds(persistentStorage, firstSession, idFactory);
    expect(sameSession).toEqual(first);

    startNewIdentityAssessment(firstSession);
    const nextAssessment = getOrCreateIdentityIds(persistentStorage, firstSession, idFactory);
    expect(nextAssessment.family_id).toBe(first.family_id);
    expect(nextAssessment.user_id).toBe(first.user_id);
    expect(nextAssessment.assessment_id).not.toBe(first.assessment_id);
  });
});
