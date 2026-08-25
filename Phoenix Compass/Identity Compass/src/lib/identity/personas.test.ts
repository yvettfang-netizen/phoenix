import { describe, expect, it } from "vitest";

import { identityPersonaFixtures } from "@/lib/identity/personas";

describe("Identity Persona regression fixture framework", () => {
  it("contains the frozen P01-P12 fixture slots", () => {
    expect(identityPersonaFixtures.map((persona) => persona.persona_id)).toEqual([
      "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12",
    ]);
  });

  it("keeps the future regression assertion structure on every fixture", () => {
    for (const persona of identityPersonaFixtures) {
      expect(persona).toHaveProperty("expected_branches");
      expect(persona).toHaveProperty("expected_hidden_branches");
      expect(persona).toHaveProperty("expected_path_result");
      expect(persona).toHaveProperty("expected_manual_review");
      expect(persona).toHaveProperty("expected_report_behaviour");
    }
  });

  it("activates exactly P06, P11 and P12 for Sprint 1 intent regression", () => {
    expect(identityPersonaFixtures.filter((persona) => persona.sprint_1_assertion).map((persona) => persona.persona_id)).toEqual([
      "P06", "P11", "P12",
    ]);
  });
});
