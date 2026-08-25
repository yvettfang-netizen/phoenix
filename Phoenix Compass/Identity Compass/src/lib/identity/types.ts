export const IDENTITY_ASSESSMENT_VERSION = "IDENTITY_FREE_V1.0" as const;
export const QUESTION_BANK_VERSION = "IDENTITY_QB_V1.4" as const;
export const POLICY_LIBRARY_VERSION = "IDENTITY_POLICY_LIBRARY_V1.0" as const;
export const FREE_SNAPSHOT_VERSION = "IDENTITY_FREE_SNAPSHOT_V1.0" as const;

export const IDENTITY_PRIMARY_GOALS = [
  "child_education",
  "permanent_residency",
  "career_development",
  "family_life_in_hong_kong",
  "further_study",
  "asset_and_family_planning",
  "additional_future_option",
  "initial_exploration",
] as const;

export const CURRENT_HK_STATUSES = [
  "mainland_resident",
  "hk_permanent",
  "hk_non_permanent",
  "macau_or_overseas",
  "multiple",
  "prefer_not_to_say",
] as const;

// Provisional option codes pending delivery of the ACTIVE Field Dictionary.
export const IDENTITY_AGE_BANDS = [
  "under_18",
  "18_24",
  "25_34",
  "35_44",
  "45_54",
  "55_plus",
  "prefer_not_to_say",
] as const;

export const HIGHEST_EDUCATION_LEVELS = [
  "secondary_or_below",
  "associate_or_diploma",
  "bachelor",
  "master",
  "doctorate",
  "other_or_prefer_not_to_say",
] as const;

export const EMPLOYMENT_STATUSES = [
  "employed",
  "business_owner",
  "self_employed",
  "student",
  "not_currently_working",
  "retired",
  "prefer_not_to_say",
] as const;

export const ROUTE_OPENNESS_OPTIONS = [
  "talent_programmes",
  "hong_kong_employment",
  "hong_kong_study",
  "capital_investment",
  "family_member_identity_arrangement",
  "compare_all",
  "ai_assisted_judgement",
] as const;

export const FAMILY_IDENTITY_TYPES = [
  "Education-led Family",
  "Investment-led Family",
  "Talent-led Family",
  "Career-led Family",
  "Study-led Family",
  "Family-linked Family",
  "Long-term HK Family",
  "Exploration Family",
] as const;

export const PLANNING_STAGES = [
  "initial_exploration",
  "direction_comparison",
  "planning_preparation",
  "hong_kong_transition",
  "identity_established",
] as const;

export type IdentityPrimaryGoal = (typeof IDENTITY_PRIMARY_GOALS)[number];
export type CurrentHkStatus = (typeof CURRENT_HK_STATUSES)[number];
export type IdentityAgeBand = (typeof IDENTITY_AGE_BANDS)[number];
export type HighestEducation = (typeof HIGHEST_EDUCATION_LEVELS)[number];
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export type RouteOpenness = (typeof ROUTE_OPENNESS_OPTIONS)[number];
export type FamilyIdentityType = (typeof FAMILY_IDENTITY_TYPES)[number];
export type PlanningStage = (typeof PLANNING_STAGES)[number];

export type FamilyId = `fam_${string}`;
export type UserId = `usr_${string}`;
export type AssessmentId = `asm_${string}`;
export type ReportId = `rpt_${string}`;

export type IdentityIds = Readonly<{
  family_id: FamilyId;
  user_id: UserId;
  assessment_id: AssessmentId;
}>;

export type FreeIdentityAnswers = Readonly<{
  identity_primary_goals: readonly IdentityPrimaryGoal[];
  current_hk_status: CurrentHkStatus;
  age_band: IdentityAgeBand;
  highest_education: HighestEducation;
  employment_status: EmploymentStatus;
  route_openness: readonly RouteOpenness[];
}>;

export type FreeIdentityDraft = Partial<FreeIdentityAnswers>;

export type FreeIdentitySnapshot = Readonly<{
  snapshot_version: typeof FREE_SNAPSHOT_VERSION;
  family_identity_type: FamilyIdentityType;
  planning_stage: PlanningStage;
  free_direction_1: string;
  free_direction_2: string;
  free_key_insight: string;
}>;

export type NormalizedIdentityAssessment = Readonly<
  IdentityIds &
    FreeIdentityAnswers & {
      assessment_version: typeof IDENTITY_ASSESSMENT_VERSION;
      question_bank_version: typeof QUESTION_BANK_VERSION;
      policy_library_version: typeof POLICY_LIBRARY_VERSION;
      family_identity_type: FamilyIdentityType;
      planning_stage: PlanningStage;
      free_direction_1: string;
      free_direction_2: string;
      free_key_insight: string;
    }
>;

export type StoredIdentityResult = Readonly<{
  ids: IdentityIds;
  assessment: NormalizedIdentityAssessment;
  snapshot: FreeIdentitySnapshot;
}>;
