import assert from "node:assert/strict";
import test from "node:test";
import {
  handleIdentityConsultation, identityConsultationPath, identityConsultationRevision,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-consultation.ts";
import { hkCivilDate } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey.ts";

const origin = "https://family.synthetic.invalid";
const noticeId = "01910000-0000-7000-8100-000000000009";
const otherNotice = "01910000-0000-7000-8100-000000000051";
const selection = { noticeId, topic: "RENEWAL", accepted: true, consentRevision: identityConsultationRevision };
const request = (body = selection, headers = {}) => new Request(origin + identityConsultationPath, {
  method: "POST",
  headers: { origin, "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

function fixture() {
  const scope = { family: "synthetic-family", subject: "synthetic-subject" };
  const authority = { ...scope, verified: true, revoked: false, purpose: "IDENTITY_CRM",
    validUntil: new Date(Date.now() + 60_000).toISOString() };
  const verifiedDate = { ...scope, id: "synthetic-date", seriesId: "synthetic-identity-record",
    kind: "STAY_EXPIRY", state: "VERIFIED", basis: "CASE_APPROVAL",
    date: hkCivilDate(new Date(Date.now() + 7 * 86400000)), evidenceRef: "synthetic-doc" };
  const writes = [];
  const audits = [];
  const callbacks = [];
  const state = { signedIn: true, receiverAvailable: true, authority, verifiedDate, failAudit: false };
  const config = {
    origin,
    async verifySession() {
      return state.signedIn ? { id: "fixture-account", username: "fixture", token_hash: "server-session-hash",
        created_at: Date.now() - 1000, valid_until: Date.now() + 60_000 } : null;
    },
    async recordAccess(actor, action) {
      if (state.failAudit) throw Error("Audit unavailable");
      audits.push({ actor, action });
    },
  };
  const accepted = new Map();
  const env = {
    FAMILY_IDENTITY_INBOX_ENABLED: "true",
    FAMILY_IDENTITY_INBOX_PROVIDER: {
      async resolve() { throw Error("The consultation route must not use inbox readership as consent"); },
    },
    FAMILY_IDENTITY_CONSULTATION_ENABLED: "true",
    FAMILY_IDENTITY_CONSULTATION_CONSENT_REVISION: identityConsultationRevision,
    FAMILY_IDENTITY_CONSULTATION_PROVIDER: {
      async withAuthorizedIntent(intent, callback) {
        callbacks.push(intent);
        assert.equal(intent.customerId, "fixture-account");
        assert.equal(intent.sessionHash, "server-session-hash");
        assert.equal(intent.consentRevision, identityConsultationRevision);
        assert.ok(intent.requestId);
        if (!state.receiverAvailable) throw Error("Existing CRM receiver unavailable");
        if (intent.noticeId !== noticeId) return "DENIED";
        return callback({
          scope, consultationAuthority: state.authority, verifiedDate: state.verifiedDate,
          async appendNeed(summary) {
            const key = intent.noticeId + ":" + intent.topic;
            if (accepted.has(key)) return "ALREADY_RECEIVED";
            accepted.set(key, summary);
            writes.push(summary);
            return "RECEIVED";
          },
        });
      },
    },
  };
  return { config, env, state, writes, audits, callbacks };
}

test("an explicit authorized intent sends only a minimal CRM summary; replay reuses the receipt", async () => {
  const { config, env, writes, audits } = fixture();
  const result = await handleIdentityConsultation(request(), env, config);
  assert.equal(result.status, 201);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await result.json(), { status: "RECEIVED" });
  assert.deepEqual(writes, [{ domain: "IDENTITY", topic: "RENEWAL", horizon: "WITHIN_90_DAYS" }]);
  assert.deepEqual(audits, [{ actor: "fixture-account", action: "IDENTITY_CONSULTATION_ATTEMPT" }]);
  assert.equal((await handleIdentityConsultation(request(), env, config)).status, 200);
  assert.equal(writes.length, 1);
});

test("opening a notice, missing user intent, stale copy and identity parameters cannot reach CRM", async () => {
  const { config, env, callbacks, writes } = fixture();
  assert.equal((await handleIdentityConsultation(new Request(origin + identityConsultationPath), env, config)).status, 405);
  for (const body of [
    { ...selection, accepted: false },
    { ...selection, consentRevision: "OLD_COPY" },
    { ...selection, topic: "UNKNOWN" },
    { ...selection, familyId: "another-family" },
    { ...selection, verifiedDate: "2029-04-01" },
  ]) assert.equal((await handleIdentityConsultation(request(body), env, config)).status, 400);
  assert.equal((await handleIdentityConsultation(request(selection, { origin: "https://other.invalid" }), env, config)).status, 403);
  assert.equal((await handleIdentityConsultation(request(selection, { "X-Family-ID": "another-family" }), env, config)).status, 403);
  assert.equal(callbacks.length, 0);
  assert.equal(writes.length, 0);
});

test("reminder consent, expired or revoked consultation consent, and a different family's notice are denied", async () => {
  const { config, env, state, writes } = fixture();
  const active = state.authority;
  for (const authority of [
    null, { ...active, purpose: "IDENTITY_REMINDER" },
    { ...active, validUntil: "2000-01-01T00:00:00Z" },
    { ...active, revoked: true }, { ...active, subject: "another-subject" },
  ]) {
    state.authority = authority;
    assert.equal((await handleIdentityConsultation(request(), env, config)).status, 403);
  }
  state.authority = active;
  assert.equal((await handleIdentityConsultation(request({ ...selection, noticeId: otherNotice }), env, config)).status, 403);
  assert.equal(writes.length, 0);
});

test("session, environment, CRM and audit failure do not produce a receipt", async () => {
  const { config, env, state, writes } = fixture();
  const { FAMILY_IDENTITY_CONSULTATION_PROVIDER: provider, ...disabled } = env;
  assert.ok(provider);
  assert.equal((await handleIdentityConsultation(request(), disabled, config)).status, 404);
  state.signedIn = false;
  assert.equal((await handleIdentityConsultation(request(), env, config)).status, 401);
  state.signedIn = true;
  state.failAudit = true;
  assert.equal((await handleIdentityConsultation(request(), env, config)).status, 503);
  state.failAudit = false;
  state.receiverAvailable = false;
  assert.equal((await handleIdentityConsultation(request(), env, config)).status, 503);
  assert.equal(writes.length, 0);
});
