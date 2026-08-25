import { describe, expect, it } from "vitest";

import { classifyFamilyIdentityType, createFreeIdentitySnapshot } from "@/lib/identity/classification";
import { identityPersonaFixtures } from "@/lib/identity/personas";

describe("Free Family Intent Classification", () => {
  const sprintOnePersonas = identityPersonaFixtures.filter((persona) => persona.sprint_1_assertion);

  it.each(sprintOnePersonas)("runs $persona_id $label at intent-only scope", (persona) => {
    expect(classifyFamilyIdentityType(persona.free_answers)).toBe(persona.expected_family_identity_type);
    const snapshot = createFreeIdentitySnapshot(persona.free_answers);
    expect(snapshot.family_identity_type).toBe(persona.expected_family_identity_type);
    expect(snapshot.free_direction_1).toBeTruthy();
    expect(snapshot.free_direction_2).toBeTruthy();
    expect(snapshot.free_key_insight).toContain("不判断任何政策资格");
  });

  it("classifies intent without an eligibility or success-rate field", () => {
    const persona = sprintOnePersonas[0];
    const snapshot = createFreeIdentitySnapshot(persona.free_answers);
    expect(snapshot).not.toHaveProperty("eligible");
    expect(snapshot).not.toHaveProperty("success_rate");
    expect(snapshot).not.toHaveProperty("policy_result");
  });
});
