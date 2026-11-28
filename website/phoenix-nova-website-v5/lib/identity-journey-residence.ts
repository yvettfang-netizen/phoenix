import { readCustomerSession, type AuthConfig } from "./customer-auth";
import { currentRecordedAbsence, hkCivilDate, summarizeResidenceYear, type ResidenceSpan } from "./identity-journey";
import {
  identityResidenceAbsenceReasons, identityResidencePath,
  type IdentityResidenceAbsenceReason, type IdentityResidenceOverview,
  type IdentityResidenceRecord, type IdentityResidenceReport,
} from "./identity-journey-residence-contract";
import { identityPrivateHeaders, isIdentityCivilDate, isIdentityNoticeId, readIdentityRequestBody, sameOriginIdentityRequest } from "./identity-journey-request";

type Session = { customerId: string; sessionHash: string };
type ReadScope = {
  assertCurrent(): Promise<boolean>;
  /** Select records under the exact live grant, including every authorized case in the window. */
  listAuthorized(from: string, untilBefore: string): Promise<{ records: unknown[]; canReport: boolean } | null>;
};
type ReportScope = {
  assertCurrent(): Promise<boolean>;
  /** Lock the separate report grant and append with the bound Canonical FAMILY context, then commit. */
  recordAuthorized(report: IdentityResidenceReport, requestId: string): Promise<"RECORDED" | "ALREADY_RECORDED" | "DENIED" | "LIMIT_REACHED">;
};
export interface IdentityResidenceProvider {
  resolveRead(session: Session): Promise<ReadScope | null>;
  resolveReport?(session: Session): Promise<ReportScope | null>;
}

const maxRecords = 512;
const reportKeys = ["from", "untilBefore", "place", "absenceReason", "expectedReturnOn"] as const;
const sourceKinds = ["SELF_REPORTED", "ADVISER_VERIFIED", "OFFICIAL_RECORD", "UNSPECIFIED"] as const;

export function identityResidenceEnabled(env: Record<string, unknown>) {
  const provider = env.FAMILY_IDENTITY_RESIDENCE_PROVIDER as IdentityResidenceProvider | undefined;
  return env.FAMILY_IDENTITY_RESIDENCE_ENABLED === "true" && typeof provider?.resolveRead === "function";
}

function isReason(value: unknown): value is IdentityResidenceAbsenceReason | null {
  return value === null || identityResidenceAbsenceReasons.some(reason => reason === value);
}

function readRecordFields(input: Record<string, unknown>, latest: string, allowUnknown: boolean): Omit<IdentityResidenceRecord, "id" | "source"> | null {
  const { from, untilBefore, place, absenceReason, expectedReturnOn } = input;
  if (!isIdentityCivilDate(from) || !isIdentityCivilDate(untilBefore) || from < "1900-01-01" || from >= untilBefore || untilBefore > latest ||
      (place !== "HK" && place !== "AWAY" && (!allowUnknown || place !== "UNVERIFIED")) ||
      !isReason(absenceReason) || (absenceReason !== null && place !== "AWAY") ||
      (expectedReturnOn !== null && (place !== "AWAY" || !isIdentityCivilDate(expectedReturnOn) || expectedReturnOn < untilBefore))) return null;
  return { from, untilBefore, place, absenceReason, expectedReturnOn };
}

function overview(data: { records: unknown[]; canReport: boolean }, asOf: string, canReport: boolean): IdentityResidenceOverview {
  if (!Array.isArray(data.records) || data.records.length > maxRecords || typeof data.canReport !== "boolean") {
    throw new Error("Invalid or incomplete residence window");
  }
  const year = Number(asOf.slice(0, 4));
  const windowFrom = (year - 6) + "-01-01";
  const ids = new Set<string>();
  const records: IdentityResidenceRecord[] = data.records.map(input => {
    if (!input || typeof input !== "object") throw new Error("Invalid residence entry");
    const raw = input as Record<string, unknown>;
    const source = sourceKinds.find(value => value === raw.source);
    const fields = readRecordFields(raw, asOf, true);
    if (!isIdentityNoticeId(raw.id) || ids.has(raw.id) || !fields || fields.untilBefore <= windowFrom || !source) {
      throw new Error("Invalid residence entry");
    }
    ids.add(raw.id);
    return { ...fields, id: raw.id, source };
  });
  const span = (row: IdentityResidenceRecord): ResidenceSpan => ({ from: row.from, until: row.untilBefore, place: row.place });
  const allSpans = records.map(span);
  const corroborated = records.filter(row => row.source === "ADVISER_VERIFIED" || row.source === "OFFICIAL_RECORD").map(span);
  const years = Array.from({ length: 7 }, (_, index) => {
    const current = year - index;
    const reported = summarizeResidenceYear(current, asOf, allSpans);
    const review = summarizeResidenceYear(current, asOf, [
      ...corroborated, ...reported.unverified.map(gap => ({ ...gap, place: "UNVERIFIED" as const })),
    ]);
    return { year: current, recordedInHongKongDays: reported.recordedInHongKongDays,
      longestRecordedAbsenceDays: reported.longestRecordedAbsenceDays, unverified: review.unverified };
  });
  return { asOf, records, years, canReport: data.canReport && canReport,
    currentRecordedAbsenceDays: currentRecordedAbsence(windowFrom, asOf, allSpans),
    rightOfAbode: "HUMAN_REVIEW_REQUIRED", passportEligibility: "HUMAN_REVIEW_REQUIRED" };
}

export async function handleIdentityResidence(request: Request, env: Record<string, unknown>, config: AuthConfig | null) {
  const headers = identityPrivateHeaders;
  const reply = (status: number, code: string) => Response.json({ error: { code } }, { status, headers });
  if (!identityResidenceEnabled(env)) return reply(404, "NOT_FOUND");
  if (request.method !== "GET" && request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
  if (!sameOriginIdentityRequest(request, identityResidencePath)) return reply(403, "ACCESS_DENIED");
  if (!config || config.origin !== new URL(request.url).origin) return reply(503, "RESIDENCE_UNAVAILABLE");
  const provider = env.FAMILY_IDENTITY_RESIDENCE_PROVIDER as IdentityResidenceProvider;
  const reportingEnabled = env.FAMILY_IDENTITY_RESIDENCE_REPORT_ENABLED === "true" && typeof provider.resolveReport === "function";
  try {
    const session = await readCustomerSession(request, config, { touch: false });
    if (!session) return reply(401, "SIGN_IN_REQUIRED");
    const identity = { customerId: session.id, sessionHash: session.token_hash };
    const asOf = hkCivilDate(new Date());
    const requestId = crypto.randomUUID();
    const sessionStillCurrent = async () => {
      const current = await readCustomerSession(request, config, { touch: false });
      return current?.id === session.id && current.token_hash === session.token_hash && current.valid_until > Date.now();
    };

    if (request.method === "GET") {
      await config.recordAccess(session.id, "IDENTITY_RESIDENCE_READ_ATTEMPT", requestId + ":attempt");
      const scope = await provider.resolveRead(identity);
      if (!scope || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
      const source = await scope.listAuthorized((Number(asOf.slice(0, 4)) - 6) + "-01-01", asOf);
      if (!source) return reply(403, "ACCESS_DENIED");
      const data = overview(source, asOf, reportingEnabled);
      await config.recordAccess(session.id, "IDENTITY_RESIDENCE_READ_PREPARED", requestId + ":prepared");
      if (!await sessionStillCurrent()) return reply(401, "SIGN_IN_REQUIRED");
      if (await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
      return Response.json(data, { headers });
    }

    if (!reportingEnabled) return reply(403, "ACCESS_DENIED");
    const body = await readIdentityRequestBody(request, 384);
    const fields = body && Object.keys(body).length === reportKeys.length &&
      reportKeys.every(key => Object.hasOwn(body, key)) && readRecordFields(body, asOf, false);
    if (!fields || fields.place === "UNVERIFIED") return reply(400, "INVALID_RESIDENCE_REPORT");
    await config.recordAccess(session.id, "IDENTITY_RESIDENCE_REPORT_ATTEMPT", requestId + ":attempt");
    const scope = await provider.resolveReport?.(identity);
    if (!scope || await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    if (!await sessionStillCurrent()) return reply(401, "SIGN_IN_REQUIRED");
    const outcome = await scope.recordAuthorized({ ...fields, place: fields.place }, requestId);
    if (outcome === "DENIED") return reply(403, "ACCESS_DENIED");
    if (outcome === "LIMIT_REACHED") return reply(409, "RESIDENCE_RECORD_LIMIT");
    if (outcome !== "RECORDED" && outcome !== "ALREADY_RECORDED") return reply(503, "RESIDENCE_UNAVAILABLE");
    // A committed report remains valid if a session ends immediately afterwards.
    if (!await sessionStillCurrent()) return reply(401, "SIGN_IN_REQUIRED");
    if (await scope.assertCurrent() !== true) return reply(403, "ACCESS_DENIED");
    return Response.json({ status: "RECORDED" }, { status: outcome === "RECORDED" ? 201 : 200, headers });
  } catch {
    return reply(503, "RESIDENCE_UNAVAILABLE");
  }
}
