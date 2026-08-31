import { describe, expect, it } from "vitest";
import { canTransition } from "@/domain/wealth-compass/workflow";

describe("workflow", () => {
  it("allows only the declared next state", () => {
    expect(canTransition("DRAFT", "ASSESSMENT_COMPLETED")).toBe(true);
    expect(canTransition("DRAFT", "SCORED")).toBe(false);
  });
});
