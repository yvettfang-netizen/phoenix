import { describe, expect, it } from "vitest";
import { assessmentSessionSchema, personaResultSchema } from "@/domain/wealth-compass/schemas";

const TEST_ONLY_META = {
  id: "2f10a82a-1cd0-4a66-a68c-69350b8de200",
  ruleVersion: "TEST_ONLY-NOT-A-BUSINESS-RULE",
  createdAt: "2026-08-26T10:00:00.000Z",
  updatedAt: "2026-08-26T10:00:00.000Z",
  sourceChannel: "TEST" as const,
  status: "DRAFT" as const,
  idempotencyKey: "TEST_ONLY-session-001",
};

describe("domain schemas", () => {
  it("accepts a valid assessment session contract", () => {
    expect(assessmentSessionSchema.parse({ ...TEST_ONLY_META, answers: [] }).id).toBe(TEST_ONLY_META.id);
  });

  it("rejects a persona when official rules are absent", () => {
    expect(() => personaResultSchema.parse({ ...TEST_ONLY_META, sessionId: TEST_ONLY_META.id,
      rulesStatus: "RULES_NOT_LOADED", personaId: "invented-persona" })).toThrow();
  });
});
