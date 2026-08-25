export const STUDY_ADMISSION_PROFILES = [
  "S1_STRONG_DUAL",
  "S2_STANDARD_DUAL",
  "S3_SINGLE_CERTIFICATE",
  "S4_DIPLOMA_EXPERIENCED",
  "S5_SECONDARY_VOCATIONAL",
] as const;

export type StudyAdmissionProfile = (typeof STUDY_ADMISSION_PROFILES)[number];
export type StudyPathwayStatus = "not_assessed" | "manual_review" | "potential" | "not_available";

export type StudyPathwayContext = Readonly<{
  profile: StudyAdmissionProfile;
  admission_status: StudyPathwayStatus;
  student_visa_status: StudyPathwayStatus;
  iang_status: StudyPathwayStatus;
}>;
