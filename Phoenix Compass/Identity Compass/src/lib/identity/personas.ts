import type { FamilyIdentityType, FreeIdentityAnswers } from "@/lib/identity/types";

export type IdentityPersonaFixture = Readonly<{
  persona_id: `P${string}`;
  label: string;
  sprint_1_assertion: boolean;
  free_answers: FreeIdentityAnswers;
  expected_branches: readonly string[];
  expected_hidden_branches: readonly string[];
  expected_path_result: string | null;
  expected_manual_review: boolean | null;
  expected_report_behaviour: string;
  expected_family_identity_type?: FamilyIdentityType;
}>;

const defaultAnswers: FreeIdentityAnswers = {
  identity_primary_goals: ["additional_future_option"],
  current_hk_status: "mainland_resident",
  age_band: "35_44",
  highest_education: "bachelor",
  employment_status: "employed",
  route_openness: ["compare_all"],
};

function futurePersona(
  persona_id: IdentityPersonaFixture["persona_id"],
  label: string,
  free_answers: FreeIdentityAnswers,
): IdentityPersonaFixture {
  return {
    persona_id,
    label,
    sprint_1_assertion: false,
    free_answers,
    expected_branches: [],
    expected_hidden_branches: ["policy_eligibility"],
    expected_path_result: null,
    expected_manual_review: null,
    expected_report_behaviour: "deferred_until_policy_and_report_engines",
  };
}

export const identityPersonaFixtures: readonly IdentityPersonaFixture[] = [
  futurePersona("P01", "CIES", {
    ...defaultAnswers,
    identity_primary_goals: ["asset_and_family_planning"],
    route_openness: ["capital_investment"],
  }),
  futurePersona("P02", "TTPS-A", {
    ...defaultAnswers,
    identity_primary_goals: ["career_development"],
    highest_education: "doctorate",
    route_openness: ["talent_programmes"],
  }),
  futurePersona("P03", "TTPS-B", {
    ...defaultAnswers,
    identity_primary_goals: ["career_development"],
    highest_education: "master",
    route_openness: ["talent_programmes"],
  }),
  futurePersona("P04", "TTPS-C", {
    ...defaultAnswers,
    identity_primary_goals: ["career_development"],
    highest_education: "bachelor",
    route_openness: ["talent_programmes"],
  }),
  futurePersona("P05", "QMAS", {
    ...defaultAnswers,
    identity_primary_goals: ["career_development", "additional_future_option"],
    route_openness: ["talent_programmes", "hong_kong_employment"],
  }),
  {
    persona_id: "P06",
    label: "Study S2",
    sprint_1_assertion: true,
    free_answers: {
      ...defaultAnswers,
      identity_primary_goals: ["further_study"],
      age_band: "25_34",
      route_openness: ["hong_kong_study"],
    },
    expected_branches: ["study_intent"],
    expected_hidden_branches: ["study_admission", "student_visa", "iang", "policy_eligibility"],
    expected_path_result: "intent_only",
    expected_manual_review: false,
    expected_report_behaviour: "free_identity_snapshot_only",
    expected_family_identity_type: "Study-led Family",
  },
  futurePersona("P07", "Single Certificate", {
    ...defaultAnswers,
    identity_primary_goals: ["further_study"],
    highest_education: "associate_or_diploma",
    route_openness: ["hong_kong_study"],
  }),
  futurePersona("P08", "Diploma Experienced", {
    ...defaultAnswers,
    identity_primary_goals: ["further_study", "career_development"],
    highest_education: "associate_or_diploma",
    route_openness: ["hong_kong_study", "hong_kong_employment"],
  }),
  futurePersona("P09", "VTC / Vocational", {
    ...defaultAnswers,
    identity_primary_goals: ["further_study"],
    highest_education: "secondary_or_below",
    route_openness: ["hong_kong_study"],
  }),
  futurePersona("P10", "Employment", {
    ...defaultAnswers,
    identity_primary_goals: ["career_development"],
    route_openness: ["hong_kong_employment"],
  }),
  {
    persona_id: "P11",
    label: "Family-linked",
    sprint_1_assertion: true,
    free_answers: {
      ...defaultAnswers,
      identity_primary_goals: ["additional_future_option"],
      current_hk_status: "multiple",
      route_openness: ["family_member_identity_arrangement"],
    },
    expected_branches: ["family_linked_intent"],
    expected_hidden_branches: ["dependant_eligibility", "policy_eligibility"],
    expected_path_result: "intent_only",
    expected_manual_review: false,
    expected_report_behaviour: "free_identity_snapshot_only",
    expected_family_identity_type: "Family-linked Family",
  },
  {
    persona_id: "P12",
    label: "Exploration",
    sprint_1_assertion: true,
    free_answers: {
      ...defaultAnswers,
      identity_primary_goals: ["initial_exploration"],
      current_hk_status: "prefer_not_to_say",
      highest_education: "other_or_prefer_not_to_say",
      employment_status: "prefer_not_to_say",
      route_openness: ["ai_assisted_judgement"],
    },
    expected_branches: ["exploration_intent"],
    expected_hidden_branches: ["policy_eligibility"],
    expected_path_result: "intent_only",
    expected_manual_review: false,
    expected_report_behaviour: "free_identity_snapshot_only",
    expected_family_identity_type: "Exploration Family",
  },
] as const;
