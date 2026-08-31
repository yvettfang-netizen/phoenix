import { describe, expect, it } from "vitest";
import { scoreAssessment } from "@/domain/wealth-compass/scoring";

describe("official scoring gate", () => {
  it("returns RULES_NOT_LOADED instead of inventing a score", () => {
    expect(() => scoreAssessment({} as never)).toThrowError(expect.objectContaining({ code: "RULES_NOT_LOADED" }));
  });
});
