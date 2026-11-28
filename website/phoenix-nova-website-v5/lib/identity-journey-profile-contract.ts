import { isIdentityCivilDate } from "./identity-journey-request";

export const identityProfilePath = "/api/family-services/identity-profile";

export const identityMilestoneKinds = [
  "APPROVAL_DATE", "VISA_ISSUED", "FIRST_ENTRY_DEADLINE", "FIRST_ENTRY_ACTUAL", "STAY_EXPIRY",
  "RENEWAL_WINDOW_OPEN", "RETURN_BY", "ABSENCE_REVIEW", "GRADUATION", "STATUS_TRANSITION",
  "EMPLOYMENT_REVIEW", "SPONSOR_REVIEW", "HKIC_AGE_11", "HKIC_AGE_18", "PASSPORT_EXPIRY",
  "TRAVEL_DOCUMENT_EXPIRY", "INVESTMENT_REVIEW", "PERMANENT_RESIDENCE_PREPARATION",
] as const;

export type IdentityMilestoneKind = typeof identityMilestoneKinds[number];
export const identityNoFixedExpiryTerm = "NO_FIXED_EXPIRY" as const;
export const identityNoFixedExpiryPathways = [
  "HK_PERMANENT_RESIDENT", "RIGHT_TO_LAND", "UNCONDITIONAL_STAY",
] as const;
export type IdentityNoFixedExpiryTerm = typeof identityNoFixedExpiryTerm;

export function isIdentityNoFixedExpiryPathway(value: string): boolean {
  return (identityNoFixedExpiryPathways as readonly string[]).includes(value);
}

type IdentitySponsorship = {
  effectiveOn: string;
  status: "RECORDED" | "ENDED";
};

export function parseIdentitySponsorship(
  value: unknown, path: unknown, startedOn: unknown, endedBefore: unknown,
): IdentitySponsorship | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || path !== "DEPENDANT" ||
    !isIdentityCivilDate(startedOn) || (endedBefore !== null && !isIdentityCivilDate(endedBefore))) return null;
  const record = value as Record<string, unknown>;
  const { effectiveOn, status } = record;
  if (Object.keys(record).length !== 2 || !Object.hasOwn(record, "effectiveOn") || !Object.hasOwn(record, "status") ||
    !isIdentityCivilDate(effectiveOn) || effectiveOn < startedOn || (status !== "RECORDED" && status !== "ENDED") ||
    (endedBefore !== null && (effectiveOn > endedBefore || (effectiveOn === endedBefore && status === "RECORDED")))) return null;
  return { effectiveOn, status };
}

export const identityInternalOnlyMilestoneKinds = [
  "INVESTMENT_REVIEW", "PERMANENT_RESIDENCE_PREPARATION",
] as const;
export type IdentityInternalOnlyMilestoneKind = typeof identityInternalOnlyMilestoneKinds[number];

export function isIdentityInternalOnlyMilestoneKind(value: string): value is IdentityInternalOnlyMilestoneKind {
  return (identityInternalOnlyMilestoneKinds as readonly string[]).includes(value);
}

export const identityProfileAccesses = ["SELF", "GUARDIAN", "DELEGATE"] as const;
export type IdentityProfileAccess = typeof identityProfileAccesses[number];

export function isIdentityProfileAccess(value: unknown): value is IdentityProfileAccess {
  return typeof value === "string" && (identityProfileAccesses as readonly string[]).includes(value);
}

export type IdentityProfileMember = { ref: string; label: string; access: IdentityProfileAccess };
export type IdentityMemberProfile = {
  episodes: {
    path: string | null;
    startedOn: string;
    endedBefore: string | null;
    /** Present only for a verified same-case decision with no fixed expiry. */
    stayTerm?: IdentityNoFixedExpiryTerm;
    /** Present only for a verified dependant sponsorship record. */
    sponsorship?: IdentitySponsorship;
    milestones: {
      kind: IdentityMilestoneKind;
      basis: "STATUTORY" | "CASE_APPROVAL" | "OFFICIAL_WINDOW" | "INTERNAL";
      on: string;
      verification: "REPORTED" | "VERIFIED";
      current: boolean;
    }[];
  }[];
};
