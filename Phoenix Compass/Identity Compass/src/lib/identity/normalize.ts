import { createFreeIdentitySnapshot } from "@/lib/identity/classification";
import {
  CURRENT_HK_STATUSES,
  EMPLOYMENT_STATUSES,
  HIGHEST_EDUCATION_LEVELS,
  IDENTITY_AGE_BANDS,
  IDENTITY_ASSESSMENT_VERSION,
  IDENTITY_PRIMARY_GOALS,
  POLICY_LIBRARY_VERSION,
  QUESTION_BANK_VERSION,
  ROUTE_OPENNESS_OPTIONS,
  type FreeIdentityAnswers,
  type FreeIdentityDraft,
  type IdentityIds,
  type NormalizedIdentityAssessment,
} from "@/lib/identity/types";

type ValidationResult<T> = Readonly<{ success: true; data: T }> | Readonly<{ success: false; errors: readonly string[] }>;

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isUniqueArray<T extends string>(value: unknown, values: readonly T[]): value is readonly T[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((item) => includes(values, item))
  );
}

export function validateFreeIdentityAnswers(draft: FreeIdentityDraft): ValidationResult<FreeIdentityAnswers> {
  const errors: string[] = [];
  if (!isUniqueArray(draft.identity_primary_goals, IDENTITY_PRIMARY_GOALS)) {
    errors.push("identity_primary_goals 无效。");
  }
  if (!includes(CURRENT_HK_STATUSES, draft.current_hk_status)) errors.push("current_hk_status 无效。");
  if (!includes(IDENTITY_AGE_BANDS, draft.age_band)) errors.push("age_band 无效。");
  if (!includes(HIGHEST_EDUCATION_LEVELS, draft.highest_education)) errors.push("highest_education 无效。");
  if (!includes(EMPLOYMENT_STATUSES, draft.employment_status)) errors.push("employment_status 无效。");
  if (!isUniqueArray(draft.route_openness, ROUTE_OPENNESS_OPTIONS)) errors.push("route_openness 无效。");

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: draft as FreeIdentityAnswers };
}

export function normalizeIdentityAssessment(
  answers: FreeIdentityAnswers,
  ids: IdentityIds,
): NormalizedIdentityAssessment {
  const snapshot = createFreeIdentitySnapshot(answers);
  return {
    ...ids,
    assessment_version: IDENTITY_ASSESSMENT_VERSION,
    identity_primary_goals: [...answers.identity_primary_goals],
    current_hk_status: answers.current_hk_status,
    age_band: answers.age_band,
    highest_education: answers.highest_education,
    employment_status: answers.employment_status,
    route_openness: [...answers.route_openness],
    question_bank_version: QUESTION_BANK_VERSION,
    policy_library_version: POLICY_LIBRARY_VERSION,
    family_identity_type: snapshot.family_identity_type,
    planning_stage: snapshot.planning_stage,
    free_direction_1: snapshot.free_direction_1,
    free_direction_2: snapshot.free_direction_2,
    free_key_insight: snapshot.free_key_insight,
  };
}
