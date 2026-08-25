import type {
  AssessmentId,
  FamilyId,
  FamilyIdentityType,
  NormalizedIdentityAssessment,
  PlanningStage,
  UserId,
} from "@/lib/identity/types";
import type { IdentityPolicyPath, IdentityPolicyRecord } from "@/lib/identity/policy";
import type { StudyAdmissionProfile, StudyPathwayContext } from "@/lib/identity/study";

export type IdentityLeadRecord = Readonly<{
  family_id: FamilyId;
  user_id: UserId;
  assessment_id: AssessmentId;
  source: "identity_compass_free";
  planning_stage: PlanningStage;
}>;

export type IdentityProfileRecord = Readonly<{
  user_id: UserId;
  family_id: FamilyId;
  current_hk_status: NormalizedIdentityAssessment["current_hk_status"];
  age_band: NormalizedIdentityAssessment["age_band"];
  highest_education: NormalizedIdentityAssessment["highest_education"];
  employment_status: NormalizedIdentityAssessment["employment_status"];
}>;

export type FamilyIdentityContextRecord = Readonly<{
  family_id: FamilyId;
  primary_user_id: UserId;
  family_identity_type: FamilyIdentityType;
  planning_stage: PlanningStage;
}>;

export interface IdentityLeadRepository {
  upsert(record: IdentityLeadRecord): Promise<void>;
}

export interface IdentityProfileRepository {
  findByUserId(userId: UserId): Promise<IdentityProfileRecord | null>;
  upsert(record: IdentityProfileRecord): Promise<void>;
}

export interface FamilyIdentityContextRepository {
  findByFamilyId(familyId: FamilyId): Promise<FamilyIdentityContextRecord | null>;
  upsert(record: FamilyIdentityContextRecord): Promise<void>;
}

export interface IdentityAssessmentRepository {
  findByAssessmentId(assessmentId: AssessmentId): Promise<NormalizedIdentityAssessment | null>;
  saveCompleted(record: NormalizedIdentityAssessment): Promise<void>;
}

export interface IdentityPolicyRepository {
  findByPath(path: IdentityPolicyPath): Promise<IdentityPolicyRecord | null>;
}

export interface StudyAdmissionRepository {
  findByProfile(profile: StudyAdmissionProfile): Promise<StudyPathwayContext | null>;
}

export interface IdentityReportRepository {
  save(report: Readonly<{ assessment_id: AssessmentId; report_id: `rpt_${string}` }>): Promise<void>;
}

export interface AdvisorFollowupRepository {
  requestFollowup(record: Readonly<{ family_id: FamilyId; assessment_id: AssessmentId }>): Promise<void>;
}

export type IdentityRepositoryBundle = Readonly<{
  leads: IdentityLeadRepository;
  profiles: IdentityProfileRepository;
  families: FamilyIdentityContextRepository;
  assessments: IdentityAssessmentRepository;
}>;
