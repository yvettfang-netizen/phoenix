// Server-side candidate logic. Callers must obtain subjects and grants from a
// verified Canonical request context. None of these types are public API inputs.
export const reminderOffsets = [365, 180, 90, 60, 30, 14, 7, 1] as const;
export type Offset = typeof reminderOffsets[number];
type Basis = "STATUTORY" | "CASE_APPROVAL" | "OFFICIAL_WINDOW" | "INTERNAL";
type Kind = "VISA_ISSUED" | "FIRST_ENTRY_DEADLINE" | "FIRST_ENTRY_ACTUAL" |
  "STAY_EXPIRY" | "RENEWAL_WINDOW_OPEN" | "RETURN_BY" | "ABSENCE_REVIEW" |
  "GRADUATION" | "STATUS_TRANSITION" | "EMPLOYMENT_REVIEW" | "SPONSOR_REVIEW" |
  "HKIC_AGE_11" | "HKIC_AGE_18" | "PASSPORT_EXPIRY" | "TRAVEL_DOCUMENT_EXPIRY";

export type IdentityDate = Readonly<{
  id: string; seriesId: string; family: string; subject: string; date: string; kind: Kind; basis: Basis;
  state: "VERIFIED" | "REPORTED" | "SUPERSEDED"; evidenceRef?: string;
}>;
export type SubjectAuthority = Readonly<{
  family: string; subject: string; verified: boolean;
  purpose: "IDENTITY_READ" | "IDENTITY_REMINDER" | "IDENTITY_CRM";
  validUntil: string; revoked: boolean;
}>;
type Scope = Pick<SubjectAuthority, "family" | "subject">;
const dayMs = 86_400_000;

function day(value: string) {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new RangeError("INVALID_CIVIL_DATE");
  const ms = Date.parse(value + "T00:00:00.000Z");
  if (!Number.isFinite(ms) || date(ms) !== value) throw new RangeError("INVALID_CIVIL_DATE");
  return ms;
}

function date(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function hkCivilDate(instant: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function hasIdentityScope(
  scope: Scope, authority: SubjectAuthority | null, purpose: SubjectAuthority["purpose"], now: Date,
) {
  return Boolean(authority?.verified && !authority.revoked && scope.family === authority.family &&
    scope.subject === authority.subject && authority.purpose === purpose &&
    Date.parse(authority.validUntil) > now.getTime());
}

const reminderBasis: Partial<Record<Kind, readonly Basis[]>> = {
  FIRST_ENTRY_DEADLINE: ["CASE_APPROVAL"],
  STAY_EXPIRY: ["CASE_APPROVAL"],
  RENEWAL_WINDOW_OPEN: ["OFFICIAL_WINDOW"],
  RETURN_BY: ["CASE_APPROVAL", "INTERNAL"],
  ABSENCE_REVIEW: ["INTERNAL"],
  GRADUATION: ["INTERNAL"],
  STATUS_TRANSITION: ["INTERNAL"],
  EMPLOYMENT_REVIEW: ["INTERNAL"],
  SPONSOR_REVIEW: ["INTERNAL"],
  HKIC_AGE_11: ["STATUTORY", "INTERNAL"],
  HKIC_AGE_18: ["STATUTORY", "INTERNAL"],
  PASSPORT_EXPIRY: ["CASE_APPROVAL"],
  TRAVEL_DOCUMENT_EXPIRY: ["CASE_APPROVAL"],
};

export type IdentityReminder = Readonly<{
  key: string; sourceId: string; subject: string; kind: Kind; basis: Basis;
  targetDate: string; sendOn: string; offset: Offset;
}>;

export function planIdentityReminders(
  scope: Scope, authority: SubjectAuthority | null, facts: readonly IdentityDate[],
  offsets: readonly Offset[], now: Date,
) {
  if (!hasIdentityScope(scope, authority, "IDENTITY_REMINDER", now)) return [];
  if (!offsets.every(offset => reminderOffsets.includes(offset))) throw new RangeError("INVALID_REMINDER_OFFSET");
  const today = day(hkCivilDate(now));
  const result = new Map<string, IdentityReminder>();
  for (const fact of facts) {
    if (fact.family !== scope.family || fact.subject !== scope.subject || fact.state === "SUPERSEDED" ||
        !reminderBasis[fact.kind]?.includes(fact.basis)) continue;
    if (fact.basis !== "INTERNAL" && (fact.state !== "VERIFIED" || !fact.evidenceRef)) continue;
    const target = day(fact.date);
    if (target < today) continue;
    for (const offset of new Set(offsets)) {
      const scheduled = target - offset * dayMs;
      if (scheduled < today) continue;
      const key = JSON.stringify([scope.family, scope.subject, fact.seriesId, fact.kind, fact.date, offset]);
      result.set(key, { key, sourceId: fact.id, subject: scope.subject, kind: fact.kind,
        basis: fact.basis, targetDate: fact.date, sendOn: date(scheduled), offset });
    }
  }
  return [...result.values()].sort((a, b) => a.sendOn.localeCompare(b.sendOn) || a.key.localeCompare(b.key));
}

type QueueItem = Readonly<{
  key: string; sourceId?: string; state: "PENDING" | "RETRY" | "DELIVERED" | "CANCELED";
}>;

// Existing rows are scoped by the caller to the same family + subject before reconciliation.
// Keep past-due valid rows for the delivery worker, even if planning runs after sendOn.
export function reconcileIdentityReminders(
  desired: readonly IdentityReminder[], existing: readonly QueueItem[],
  isStillActive: (key: string) => boolean,
) {
  const previous = new Map(existing.map(item => [item.key, item]));
  const desiredKeys = new Set(desired.map(item => item.key));
  return {
    enqueue: desired.filter(item => !previous.has(item.key) || previous.get(item.key)?.state === "CANCELED"),
    // Rebind the pending row without resetting its retry count or creating a receipt.
    rebind: desired.filter(item => {
      const current = previous.get(item.key);
      return (current?.state === "PENDING" || current?.state === "RETRY") && current.sourceId !== item.sourceId;
    }).map(({ key, sourceId }) => ({ key, sourceId })),
    cancel: existing.filter(item => (item.state === "PENDING" || item.state === "RETRY") &&
      !desiredKeys.has(item.key) && !isStillActive(item.key)).map(item => item.key),
  };
}

// Transactional adapter contract. The implementation locks a pending reminder,
// rechecks scope + source revision, and inserts one station notice per key.
export interface IdentityNoticeStore {
  deliverOnce(key: string, now: Date): Promise<"DELIVERED" | "ALREADY_DELIVERED" | "CANCELED" | "NOT_DUE">;
  recordRetry(key: string, notBefore: Date): Promise<void>;
}

export async function deliverIdentityReminder(store: IdentityNoticeStore, key: string, now: Date) {
  try {
    return await store.deliverOnce(key, now);
  } catch {
    await store.recordRetry(key, new Date(now.getTime() + 5 * 60_000));
    return "RETRY";
  }
}

export type ResidenceSpan = Readonly<{
  from: string; until: string; place: "HK" | "AWAY" | "UNVERIFIED";
}>;
type Segment = { from: number; until: number };

function merge(segments: Segment[]) {
  const merged: Segment[] = [];
  for (const item of segments.sort((a, b) => a.from - b.from)) {
    const last = merged.at(-1);
    if (last && item.from <= last.until) last.until = Math.max(last.until, item.until);
    else merged.push({ ...item });
  }
  return merged;
}

// Date spans are half-open. Unknown or contradictory records stay in the
// review bucket. Metrics are recorded physical presence, never ordinary residence.
function summarizeResidenceRange(from: number, until: number, spans: readonly ResidenceSpan[]) {
  const clipped = spans.flatMap(span => {
    const start = day(span.from), end = day(span.until);
    if (end <= start) throw new RangeError("INVALID_RESIDENCE_SPAN");
    return start < until && end > from ? [{ from: Math.max(start, from), until: Math.min(end, until), place: span.place }] : [];
  });
  const edges = [...new Set([from, until, ...clipped.flatMap(item => [item.from, item.until])])].sort((a, b) => a - b);
  const hk: Segment[] = [], away: Segment[] = [], unresolved: Segment[] = [];
  for (let i = 1; i < edges.length; i++) {
    const interval = { from: edges[i - 1], until: edges[i] };
    const places = new Set(clipped.filter(item => item.from <= interval.from && item.until >= interval.until).map(item => item.place));
    const bucket = places.size === 1 && places.has("HK") ? hk : places.size === 1 && places.has("AWAY") ? away : unresolved;
    bucket.push(interval);
  }
  const duration = (segment: Segment) => (segment.until - segment.from) / dayMs;
  const mergedAway = merge(away);
  const latest = mergedAway.at(-1);
  return {
    recordedInHongKongDays: hk.reduce((sum, segment) => sum + duration(segment), 0),
    longestRecordedAbsenceDays: Math.max(0, ...mergedAway.map(duration)),
    currentRecordedAbsenceDays: latest?.until === until ? duration(latest) : null,
    unverified: merge(unresolved).map(segment => ({ from: date(segment.from), until: date(segment.until) })),
  };
}

export function summarizeResidenceYear(year: number, through: string, spans: readonly ResidenceSpan[]) {
  if (!Number.isInteger(year) || year < 1900 || year > 9998) throw new RangeError("INVALID_YEAR");
  const from = day(`${year}-01-01`);
  const until = Math.max(from, Math.min(day(through), day(`${year + 1}-01-01`)));
  const { recordedInHongKongDays, longestRecordedAbsenceDays, unverified } = summarizeResidenceRange(from, until, spans);
  return { recordedInHongKongDays, longestRecordedAbsenceDays, unverified,
    rightOfAbode: "HUMAN_REVIEW_REQUIRED" as const,
    passportEligibility: "HUMAN_REVIEW_REQUIRED" as const,
  };
}

export function currentRecordedAbsence(from: string, through: string, spans: readonly ResidenceSpan[]) {
  return summarizeResidenceRange(day(from), day(through), spans).currentRecordedAbsenceDays;
}

export function identityConsultationSummary(
  scope: Scope, authority: SubjectAuthority | null, topic: "RENEWAL" | "DOCUMENT" | "STATUS_REVIEW",
  verifiedDate: IdentityDate | null, now: Date,
) {
  if (!hasIdentityScope(scope, authority, "IDENTITY_CRM", now)) throw new Error("IDENTITY_SCOPE_DENIED");
  if (topic !== "RENEWAL" && topic !== "DOCUMENT" && topic !== "STATUS_REVIEW") throw new Error("UNSUPPORTED_TOPIC");
  const days = verifiedDate?.state === "VERIFIED" && verifiedDate.basis === "CASE_APPROVAL" &&
    verifiedDate.evidenceRef && verifiedDate.family === scope.family && verifiedDate.subject === scope.subject &&
    ((topic === "RENEWAL" && verifiedDate.kind === "STAY_EXPIRY") ||
      (topic === "DOCUMENT" && ["PASSPORT_EXPIRY", "TRAVEL_DOCUMENT_EXPIRY"].includes(verifiedDate.kind)))
    ? (day(verifiedDate.date) - day(hkCivilDate(now))) / dayMs : null;
  const horizon = days === null || days < 0 ? "TO_REVIEW" :
    days <= 90 ? "WITHIN_90_DAYS" : days <= 180 ? "WITHIN_180_DAYS" : "LATER";
  // No date, identification number, evidence, sponsor or travel data leaves this boundary.
  return { domain: "IDENTITY", topic, horizon } as const;
}
