import { isIdentityCivilDate } from "./identity-journey-request";

export const identityStationConsentPath = "/api/family-services/identity-station-consent";
export const identityStationNoticeVersion = "2026-11-28.v1";

export type IdentityStationConsentInventory = {
  canIssue: boolean;
  cases: {
    ref: string;
    label: string;
    authorization: { ref: string; through: string } | null;
  }[];
};

export function identityStationToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

export function isIdentityStationThrough(value: unknown): value is string {
  return isIdentityCivilDate(value) && value >= identityStationToday() && value < "9999-12-31";
}

const referencePatterns = {
  case: /^station_case_[A-Za-z0-9_-]{24,96}$/,
  grant: /^station_grant_[A-Za-z0-9_-]{24,96}$/,
};

export function isIdentityStationRef(value: unknown, kind: keyof typeof referencePatterns): value is string {
  return typeof value === "string" && referencePatterns[kind].test(value);
}

function stationObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Project only the opaque selectors and display fields. Reject incomplete,
// oversized or inconsistent inventories instead of hiding malformed rows.
export function projectIdentityStationInventory(input: unknown, canIssue: boolean): IdentityStationConsentInventory {
  if (!Array.isArray(input) || input.length > 128) throw new Error("Invalid station authorization inventory");
  const caseRefs = new Set<string>();
  const grantRefs = new Set<string>();
  const cases = input.map((item: unknown) => {
    if (!stationObject(item)) throw new Error("Invalid station authorization case");
    const { ref, label, authorization } = item;
    if (!isIdentityStationRef(ref, "case") || caseRefs.has(ref) || typeof label !== "string" ||
      label.length > 160 || !label.trim()) throw new Error("Invalid station authorization case");
    caseRefs.add(ref);
    if (authorization === null) return { ref, label: label.trim(), authorization: null };
    if (!stationObject(authorization) || !isIdentityStationRef(authorization.ref, "grant") ||
      grantRefs.has(authorization.ref) || !isIdentityStationThrough(authorization.through)) {
      throw new Error("Invalid station authorization grant");
    }
    grantRefs.add(authorization.ref);
    return { ref, label: label.trim(), authorization: { ref: authorization.ref, through: authorization.through } };
  });
  return { canIssue, cases };
}

export function parseIdentityStationInventory(value: unknown) {
  if (!stationObject(value) || typeof value.canIssue !== "boolean") throw new Error("Invalid station authorization response");
  return projectIdentityStationInventory(value.cases, value.canIssue);
}
