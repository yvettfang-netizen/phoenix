import { isIdentityCivilDate } from "./identity-journey-request";

export const identityDelegationsPath = "/api/family-services/identity-delegations";
export const identityDelegationNoticeVersion = "2026-11-28.v1";

type Selection = { ref: string; label: string };
export type IdentityDelegationInventory = {
  recipients: Selection[];
  cases: Selection[];
  grants: { ref: string; recipientLabel: string; caseLabels: string[]; through: string }[];
};

const references = {
  recipient: /^recipient_[A-Za-z0-9_-]{24,96}$/,
  case: /^case_[A-Za-z0-9_-]{24,96}$/,
  delegation: /^delegation_[A-Za-z0-9_-]{24,96}$/,
};

export function isIdentityDelegationRef(value: unknown, kind: keyof typeof references): value is string {
  return typeof value === "string" && references[kind].test(value);
}

export function identityDelegationToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

export function isIdentityDelegationThrough(value: unknown): value is string {
  return isIdentityCivilDate(value) && value >= identityDelegationToday() && value < "9999-12-31";
}
