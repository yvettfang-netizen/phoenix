import assert from "node:assert/strict";
import test from "node:test";
import { currentRecordedAbsence, deliverIdentityReminder, hkCivilDate, identityConsultationSummary, planIdentityReminders,
  reconcileIdentityReminders, reminderOffsets, summarizeResidenceYear } from "../lib/identity-journey.ts";
import { identityPathways, identityPolicyRules } from "../lib/identity-journey-policy.ts";
import { runStationReminderBatch } from "../lib/identity-journey-reminder-worker.ts";

test("station batch rejects invalid configuration before touching the queue", async () => {
  for (const limit of [0, 51, 1.5, NaN]) {
    await assert.rejects(runStationReminderBatch({}, limit), RangeError);
  }
});

test("station batch defers transient failures, ignores stale claims and keeps delivering", async () => {
  const publications = ["AUTHORIZATION_UNAVAILABLE", "ERROR", "CLAIM_LOST", "ALREADY_DELIVERED", "DELIVERED"];
  const claims = publications.map((_, index) => ({ reminderId: String(index), recipientPrincipalId: "recipient",
    revisionId: "revision", claimToken: `token-${index}` }));
  const deferred = [];
  const queue = {
    async claimDue(limit) {
      assert.equal(limit, 10);
      return claims;
    },
    async publishWithAuthorization(claim) {
      const outcome = publications[Number(claim.reminderId)];
      if (outcome === "ERROR") throw new Error("Simulated connection failure");
      return outcome;
    },
    async deferWithBackoff(claim) {
      deferred.push(claim.claimToken);
      if (claim === claims[0]) throw new Error("Simulated retry write failure");
      return true;
    },
  };
  assert.deepEqual(await runStationReminderBatch(queue), { claimed: 5, delivered: 1, alreadyDelivered: 1,
    denied: 0, deferred: 1, skipped: 1, deferredWriteFailed: 1 });
  assert.deepEqual(deferred, ["token-0", "token-1"]);
});

const now = new Date("2028-02-28T16:00:00Z");
const scope = { family: "synthetic-family", subject: "synthetic-adult" };
const grant = { ...scope, purpose: "IDENTITY_REMINDER", verified: true, revoked: false, validUntil: "2029-01-01T00:00:00Z" };
const fact = (kind, date, extra = {}) => ({
  ...scope, id: kind.toLowerCase(), seriesId: "synthetic-episode", kind, date, basis: "CASE_APPROVAL", state: "VERIFIED", evidenceRef: "synthetic-evidence", ...extra,
});
const reminders = (facts, options = {}) =>
  planIdentityReminders(scope, options.grant ?? grant, facts, options.offsets ?? [1], options.now ?? now);

for (const [path, expiry] of [["TTPS A", "2028-07-02"], ["TTPS B", "2028-08-01"], ["TTPS C", "2028-09-01"],
  ["QMAS principal", "2028-10-01"], ["ASMTP employment change", "2028-10-16"]]) {
  test(path + " uses its verified record and ignores an unverified replacement", () => {
    const original = fact("STAY_EXPIRY", expiry);
    const proposed = fact("STAY_EXPIRY", "2028-12-02", { id: "proposed", state: "REPORTED" });
    assert.deepEqual(reminders([original, proposed]).map(row => row.targetDate), [expiry]);
  });
}

test("student graduation is an internal prompt and does not replace confirmed stay", () => {
  const events = reminders([fact("GRADUATION", "2028-07-28", { basis: "INTERNAL", state: "REPORTED" }),
    fact("STAY_EXPIRY", "2028-09-01")]);
  assert.deepEqual(events.map(event => event.basis), ["INTERNAL", "CASE_APPROVAL"]);
});

test("an official application window must be independently verified for the case", () => {
  const expiry = fact("STAY_EXPIRY", "2028-06-20");
  const window = fact("RENEWAL_WINDOW_OPEN", "2028-05-01", { basis: "OFFICIAL_WINDOW" });
  assert.equal(reminders([expiry, { ...window, evidenceRef: undefined }]).length, 1);
  assert.deepEqual(reminders([window, expiry]).map(event => event.basis), ["OFFICIAL_WINDOW", "CASE_APPROVAL"]);
});

test("HKIC ages 11 and 18 are independent targets and have distinct bases", () => {
  const events = reminders([fact("HKIC_AGE_11", "2028-03-30", { basis: "STATUTORY" }),
    fact("HKIC_AGE_18", "2028-04-30", { basis: "INTERNAL" })]);
  assert.deepEqual(events.map(event => [event.kind, event.basis]), [["HKIC_AGE_11", "STATUTORY"], ["HKIC_AGE_18", "INTERNAL"]]);
});

test("sponsor and dependant expiries stay separate even in the same family", () => {
  const child = { ...scope, subject: "synthetic-child" };
  const subjects = [fact("STAY_EXPIRY", "2028-11-20"), fact("STAY_EXPIRY", "2028-05-10", child)];
  assert.deepEqual(reminders(subjects).map(row => row.targetDate), ["2028-11-20"]);
  assert.deepEqual(planIdentityReminders(child, { ...grant, ...child }, subjects, [1], now).map(row => row.targetDate), ["2028-05-10"]);
});

test("passport, travel document and stay expiry never share an automatic date", () => {
  const events = reminders([fact("STAY_EXPIRY", "2028-04-01"), fact("PASSPORT_EXPIRY", "2028-05-01"),
    fact("TRAVEL_DOCUMENT_EXPIRY", "2028-06-01")]);
  assert.deepEqual(events.map(event => event.targetDate), ["2028-04-01", "2028-05-01", "2028-06-01"]);
});

test("first entry and visa issuance are independent, with leap-day scheduling in Hong Kong", () => {
  assert.equal(hkCivilDate(now), "2028-02-29");
  const entries = reminders([fact("FIRST_ENTRY_DEADLINE", "2028-03-01"),
    fact("FIRST_ENTRY_ACTUAL", "2028-03-06"), fact("VISA_ISSUED", "2028-03-05")]);
  assert.deepEqual(entries.map(entry => [entry.kind, entry.sendOn]), [["FIRST_ENTRY_DEADLINE", "2028-02-29"]]);
  assert.throws(() => reminders([fact("STAY_EXPIRY", "2028-02-30")]), /INVALID_CIVIL_DATE/);
});

test("explicit return advice is an internal reminder, with no inferred return cycle", () => {
  const events = reminders([fact("ABSENCE_REVIEW", "2028-09-15", { basis: "INTERNAL", state: "REPORTED" })]);
  assert.deepEqual(events.map(event => event.kind), ["ABSENCE_REVIEW"]);
  assert.equal(reminders([fact("RETURN_BY", "2028-09-15", { state: "REPORTED" })]).length, 0);
});

test("residence excludes missing and contradictory days; passport and permanent status stay under review", () => {
  const summary = summarizeResidenceYear(2028, "2028-03-15", [
    { from: "2027-12-20", until: "2028-01-15", place: "HK" },
    { from: "2028-01-15", until: "2028-02-01", place: "AWAY" },
    { from: "2028-01-25", until: "2028-02-29", place: "AWAY" },
    { from: "2028-02-01", until: "2028-02-05", place: "HK" },
  ]);
  assert.deepEqual(summary, { recordedInHongKongDays: 14, longestRecordedAbsenceDays: 24,
    unverified: [{ from: "2028-02-01", until: "2028-02-05" }, { from: "2028-02-29", until: "2028-03-15" }],
    rightOfAbode: "HUMAN_REVIEW_REQUIRED", passportEligibility: "HUMAN_REVIEW_REQUIRED" });
});

test("continuous recorded absence crosses a year boundary and stops at conflicting or missing days", () => {
  const first = { from: "2027-12-28", until: "2028-01-01", place: "AWAY" };
  const later = { from: "2028-01-01", until: "2028-01-05", place: "AWAY" };
  const conflict = { from: "2028-01-01", until: "2028-01-03", place: "HK" };
  assert.equal(currentRecordedAbsence("2027-01-01", "2028-01-05", [first, later, later]), 8);
  assert.equal(currentRecordedAbsence("2027-01-01", "2028-01-05", [first, later, conflict]), 2);
  assert.equal(currentRecordedAbsence("2027-01-01", "2028-01-06", [first, later]), null);
});

test("verified renewal cancels old pending notices and retains completed history", () => {
  const prior = fact("STAY_EXPIRY", "2028-04-01");
  const old = reminders([prior], { offsets: [14, 7] });
  const next = reminders([{ ...prior, state: "SUPERSEDED" }, fact("STAY_EXPIRY", "2028-12-01", { id: "renewed" })]);
  const changes = reconcileIdentityReminders(next, [{ key: old[0].key, state: "PENDING" }, { key: old[1].key, state: "DELIVERED" }], () => false);
  assert.deepEqual(changes.cancel, [old[0].key]);
  assert.deepEqual(changes.enqueue.map(event => event.targetDate), ["2028-12-01"]);
});

test("same-date evidence correction rebinds a retry but preserves a delivered receipt", () => {
  const expiry = fact("STAY_EXPIRY", "2028-04-01");
  const old = reminders([expiry], { offsets: [14, 7] });
  const corrected = reminders([{ ...expiry, id: "verified-correction" }], { offsets: [14, 7] });
  assert.deepEqual(reconcileIdentityReminders(corrected, [
    { ...old[0], state: "RETRY" }, { ...old[1], state: "DELIVERED" }
  ], () => false), {
    enqueue: [], cancel: [], rebind: [{ key: old[0].key, sourceId: "verified-correction" }],
  });
});

test("duplicate and invalid offsets, cross-family access, expired grants and revocation", () => {
  const expiry = fact("STAY_EXPIRY", "2029-05-01");
  assert.equal(reminders([expiry, expiry], { offsets: [...reminderOffsets, 1, 7] }).length, 8);
  assert.equal(reminders([expiry])[0].key, reminders([{ ...expiry, id: "same-date-evidence-correction" }])[0].key);
  assert.throws(() => reminders([expiry], { offsets: [100] }), /INVALID_REMINDER_OFFSET/);
  for (const denied of [{ family: "other" }, { subject: "other" }, { revoked: true }, { validUntil: now.toISOString() }, { purpose: "IDENTITY_READ" }]) {
    assert.deepEqual(reminders([expiry], { grant: { ...grant, ...denied } }), []);
  }
});

test("notice transient failure requests retry, and retry never sends a second receipt", async () => {
  let attempts = 0, retryAfter, delivered = false;
  const store = {
    async deliverOnce() {
      if (++attempts === 1) throw new Error("synthetic failure");
      if (delivered) return "ALREADY_DELIVERED";
      delivered = true;
      return "DELIVERED";
    },
    async recordRetry(_key, next) { retryAfter = next; },
  };
  assert.equal(await deliverIdentityReminder(store, "synthetic-key", now), "RETRY");
  assert.equal(retryAfter.getTime() - now.getTime(), 300_000);
  assert.equal(await deliverIdentityReminder(store, "synthetic-key", retryAfter), "DELIVERED");
  assert.equal(await deliverIdentityReminder(store, "synthetic-key", retryAfter), "ALREADY_DELIVERED");
});

test("CRM summary has an independent scope and exports only a topic and urgency band", () => {
  const expiry = fact("STAY_EXPIRY", "2028-04-01");
  assert.throws(() => identityConsultationSummary(scope, grant, "RENEWAL", expiry, now), /IDENTITY_SCOPE_DENIED/);
  const crm = { ...grant, purpose: "IDENTITY_CRM" };
  assert.deepEqual(identityConsultationSummary(scope, crm, "RENEWAL", expiry, now), {
    domain: "IDENTITY", topic: "RENEWAL", horizon: "WITHIN_90_DAYS",
  });
  assert.equal(identityConsultationSummary(scope, crm, "DOCUMENT", expiry, now).horizon, "TO_REVIEW");
});

test("policy pathways remain reference-only, with separately indexed investment and residence tracks", () => {
  for (const key of ["TTPS_A", "TTPS_B", "TTPS_C", "QMAS", "ASMTP", "GEP", "STUDENT", "IANG", "NEW_CIES",
    "LEGACY_CIES", "HK_BIRTH_RIGHT_OF_ABODE", "DEPENDANT", "HK_PERMANENT_RESIDENT", "RIGHT_TO_LAND",
    "UNCONDITIONAL_STAY", "TECHTAS", "VPAS", "GEP_TP", "ASMTP_TP", "OTHER"]) {
    assert.equal(identityPathways[key].candidateOnly, true);
    assert.ok(identityPathways[key].policyRuleIds.every(rule => Object.hasOwn(identityPolicyRules, rule)));
  }
  assert.notDeepEqual(identityPathways.NEW_CIES.policyRuleIds, identityPathways.LEGACY_CIES.policyRuleIds);
  assert.notDeepEqual(identityPathways.UNCONDITIONAL_STAY.policyRuleIds, identityPathways.HK_PERMANENT_RESIDENT.policyRuleIds);
  assert.notDeepEqual(identityPathways.STUDENT.policyRuleIds, identityPathways.IANG.policyRuleIds);
});

test("verified sources do not finalize professional review or terminate transitional CIES scope", () => {
  const study = identityPolicyRules["IDP-STUDENT"];
  const legacy = identityPolicyRules[identityPathways.LEGACY_CIES.policyRuleIds[0]];
  assert.equal(study.sourceVerified, true);
  assert.equal(study.officialPolicyVersion, "ID(E) 996 (11/2025) 2-4");
  assert.equal(study.effectiveFrom, null);
  assert.equal(legacy.effectiveTo, null);
  assert.equal(legacy.officialPolicyVersion, null);
  assert.match(legacy.historicalScopeZh, /过渡/);
  assert.ok(Object.values(identityPolicyRules).every(rule => rule.professionalReviewState === "PENDING"));
});
