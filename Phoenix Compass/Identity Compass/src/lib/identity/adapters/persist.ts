import type { IdentityRepositoryBundle } from "@/lib/identity/adapters/contracts";
import type { NormalizedIdentityAssessment } from "@/lib/identity/types";

export async function persistCompletedIdentityAssessment(
  repositories: IdentityRepositoryBundle,
  assessment: NormalizedIdentityAssessment,
): Promise<void> {
  await repositories.assessments.saveCompleted(assessment);
  await Promise.all([
    repositories.leads.upsert({
      family_id: assessment.family_id,
      user_id: assessment.user_id,
      assessment_id: assessment.assessment_id,
      source: "identity_compass_free",
      planning_stage: assessment.planning_stage,
    }),
    repositories.profiles.upsert({
      user_id: assessment.user_id,
      family_id: assessment.family_id,
      current_hk_status: assessment.current_hk_status,
      age_band: assessment.age_band,
      highest_education: assessment.highest_education,
      employment_status: assessment.employment_status,
    }),
    repositories.families.upsert({
      family_id: assessment.family_id,
      primary_user_id: assessment.user_id,
      family_identity_type: assessment.family_identity_type,
      planning_stage: assessment.planning_stage,
    }),
  ]);
}
