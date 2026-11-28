export const identityProfilePath = "/api/family-services/identity-profile";

export const identityMilestoneKinds = [
  "APPROVAL_DATE", "VISA_ISSUED", "FIRST_ENTRY_DEADLINE", "FIRST_ENTRY_ACTUAL", "STAY_EXPIRY",
  "RENEWAL_WINDOW_OPEN", "RETURN_BY", "ABSENCE_REVIEW", "GRADUATION", "STATUS_TRANSITION",
  "EMPLOYMENT_REVIEW", "SPONSOR_REVIEW", "HKIC_AGE_11", "HKIC_AGE_18", "PASSPORT_EXPIRY",
  "TRAVEL_DOCUMENT_EXPIRY", "INVESTMENT_REVIEW", "PERMANENT_RESIDENCE_PREPARATION",
] as const;

export type IdentityMilestoneKind = typeof identityMilestoneKinds[number];
export const identityInternalOnlyMilestoneKinds = [
  "INVESTMENT_REVIEW", "PERMANENT_RESIDENCE_PREPARATION",
] as const;
export type IdentityInternalOnlyMilestoneKind = typeof identityInternalOnlyMilestoneKinds[number];

export function isIdentityInternalOnlyMilestoneKind(value: string): value is IdentityInternalOnlyMilestoneKind {
  return (identityInternalOnlyMilestoneKinds as readonly string[]).includes(value);
}

export type IdentityProfileMember = { ref: string; label: string; access: "SELF" | "GUARDIAN" };
export type IdentityMemberProfile = {
  episodes: {
    path: string | null;
    startedOn: string;
    endedBefore: string | null;
    milestones: {
      kind: IdentityMilestoneKind;
      basis: "STATUTORY" | "CASE_APPROVAL" | "OFFICIAL_WINDOW" | "INTERNAL";
      on: string;
      verification: "REPORTED" | "VERIFIED";
      current: boolean;
    }[];
  }[];
};
