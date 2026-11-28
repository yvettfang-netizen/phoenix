import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { handleIdentityStationConsent } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-station-consent.ts";
import {
  identityStationConsentPath, identityStationNoticeVersion, identityStationToday,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-station-consent-contract.ts";
import { handleIdentityProfile } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile.ts";
import { identityProfilePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-profile-contract.ts";

export async function verifyStationConsent({ query, recipient, inboxEnv, deliver, verifyReceipt, browser }) {
  const owner = { customerId: "synthetic-station-owner", sessionHash: "synthetic-station-owner-session" };
  const personId = "01910000-0000-7000-8100-000000000002";
  const noticeId = "01910000-0000-7000-8100-000000000087";
  const deliveredSeed = "01910000-0000-7000-8100-000000000008";
  const origin = "https://family.synthetic.invalid";
  const caseLabel = "Synthetic station case";
  const through = identityStationToday();
  const requests = new Map();
  const grantRefs = new Map();
  let sequence = 88;
  const secret = randomBytes(32);
  const opaque = (kind, key) =>
    kind + "_" + createHmac("sha256", secret).update(kind + "|" + owner.sessionHash + "|" + key).digest("base64url");
  const memberRef = opaque("member", personId);
  const refForCase = id => opaque("station_case", id);
  const selectedCaseRef = refForCase(recipient.caseId);

  function canonical(statement, variables = {}) {
    return query(`BEGIN;
      SELECT auth.issue_context_ticket(:'principalId'::uuid, :'personId'::uuid, :'familyId'::uuid,
        'FAMILY', clock_timestamp()+interval '45 seconds', gen_random_uuid(), :'principalId'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principalId'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...recipient, personId, ...variables });
  }

  function ownCases() {
    return JSON.parse(canonical(`SELECT coalesce(jsonb_agg(to_jsonb(item)),'[]') FROM (
      SELECT c.identity_case_id AS "caseId", c.authorization_id AS "grantId",
        to_char((c.expires_at AT TIME ZONE 'Asia/Hong_Kong')::date - 1,'YYYY-MM-DD') AS through
      FROM identity.list_journey_station_authorizations() c
      ORDER BY c.identity_case_id
    ) item;`));
  }
  function grantForCase() {
    return ownCases().find(row => row.caseId === recipient.caseId)?.grantId;
  }
  function isCurrent(session) {
    return session.customerId === owner.customerId && session.sessionHash === owner.sessionHash;
  }
  const profile = {
    async resolveRoster(session) {
      if (!isCurrent(session)) return null;
      return { assertCurrent: async () => true,
        listAuthorized: async () => [{ ref: memberRef, label: "Synthetic station owner", access: "SELF" }] };
    },
    async resolveMember(session, ref) {
      if (!isCurrent(session) || ref !== memberRef) return null;
      return { access: "SELF", assertCurrent: async () => true, readAuthorized: async () => ({ episodes: [] }) };
    },
  };
  const actions = [];
  let authReads = 0;
  let cutoff = Infinity;
  let simulateLostResponse = false;
  const auth = (url, signedIn = true) => ({
    origin: url,
    async verifySession() {
      return signedIn && ++authReads < cutoff
        ? { id: owner.customerId, username: "synthetic", token_hash: owner.sessionHash,
          created_at: Date.now() - 1000, valid_until: Date.now() + 60_000 }
        : null;
    },
    async recordAccess(_, action) { actions.push(action); },
  });
  const inboxAvailable = {
    FAMILY_IDENTITY_INBOX_ENABLED: inboxEnv.FAMILY_IDENTITY_INBOX_ENABLED,
    FAMILY_IDENTITY_INBOX_PROVIDER: inboxEnv.FAMILY_IDENTITY_INBOX_PROVIDER,
  };
  const env = { ...inboxAvailable,
    FAMILY_IDENTITY_PROFILE_ENABLED: "true",
    FAMILY_IDENTITY_PROFILE_PROVIDER: profile,
    FAMILY_IDENTITY_STATION_CONSENT_ENABLED: "true",
    FAMILY_IDENTITY_STATION_CONSENT_PROVIDER: {
      async resolveSelf(session, ref) {
        if (!isCurrent(session) || ref !== memberRef) return null;
        return {
          async assertCurrent() { return ownCases().some(row => row.caseId === recipient.caseId); },
          async listAuthorized() {
            return ownCases().map(({ caseId, grantId, through }, index) => {
              const grantRef = grantId ? opaque("station_grant", grantId) : null;
              if (grantRef) grantRefs.set(grantRef, grantId);
              return {
                ref: refForCase(caseId), label: caseId === recipient.caseId ? caseLabel : "Synthetic identity case " + (index + 1),
                authorization: grantRef ? { ref: grantRef, through, grantId } : null, caseId,
              };
            });
          },
          async issueAuthorized(change) {
            const selected = ownCases().find(row => refForCase(row.caseId) === change.caseRef);
            if (!selected) return "DENIED";
            const { caseId } = selected;
            const previous = requests.get(change.requestRef);
            if (previous && (previous.caseId !== caseId || previous.through !== change.through)) return "CONFLICT";
            const id = previous?.id ?? "01910000-0000-7000-8100-" + String(sequence++).padStart(12, "0");
            requests.set(change.requestRef, { id, caseId, through: change.through });
            const actual = canonical(`SELECT identity.issue_journey_station_authorization(
              :'id'::uuid, :'caseId'::uuid, (:'through'::date + 1)::timestamp AT TIME ZONE 'Asia/Hong_Kong',
              :'noticeVersion', :'confirmed'::boolean);`, { id, caseId, ...change });
            if (actual === id && simulateLostResponse) throw new Error("Synthetic response lost after commit");
            return actual === id ? "ISSUED" : "CONFLICT";
          },
          async revokeAuthorized(ref) {
            const id = grantRefs.get(ref);
            if (!id) return "DENIED";
            return canonical("SELECT identity.revoke_journey_station_authorization(:'id'::uuid);", { id }) === "t"
              ? "REVOKED" : "DENIED";
          },
        };
      },
    },
  };

  const handleManagement = (request, url, signedIn) => handleIdentityStationConsent(request, env, auth(url, signedIn));
  const handleProfile = (request, url, signedIn) => handleIdentityProfile(request, env, auth(url, signedIn));
  const request = (body, { signedIn = true, from = origin, headers = {} } = {}) => handleManagement(
    new Request(origin + identityStationConsentPath, { method: "POST",
      headers: { origin: from, "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), origin, signedIn);
  const list = () => request({ action: "list", memberRef });
  const issue = { action: "issue", memberRef, caseRef: selectedCaseRef, through,
    noticeVersion: identityStationNoticeVersion, confirmed: true, requestRef: randomUUID() };
  const readCase = data => data.cases.find(row => row.ref === selectedCaseRef);
  const getInventory = async () => {
    const response = await list();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    return response.json();
  };

  assert.equal(grantForCase(), null);
  assert.equal((await request(issue, { signedIn: false })).status, 401);
  assert.equal((await request(issue, { from: "https://cross-origin.invalid" })).status, 403);
  assert.equal((await request(issue, { headers: { "x-family-id": recipient.familyId } })).status, 403);
  assert.equal((await request({ ...issue, memberRef: opaque("member", "different-member") })).status, 403);
  assert.equal((await request({ ...issue, caseRef: opaque("station_case", "different-case") })).status, 403);
  assert.equal((await request({ ...issue, noticeVersion: "obsolete" })).status, 400);
  assert.equal((await request({ ...issue, through: "2026-02-30" })).status, 400);
  assert.equal((await request({ ...issue, confirmed: false })).status, 400);
  assert.equal((await request({ ...issue, familyId: recipient.familyId })).status, 400);
  assert.equal((await request({ action: "revoke", memberRef, grantRef: opaque("station_grant", "stale") })).status, 403);
  env.FAMILY_IDENTITY_STATION_CONSENT_ENABLED = "false";
  assert.equal((await list()).status, 404);
  env.FAMILY_IDENTITY_STATION_CONSENT_ENABLED = "true";
  env.FAMILY_IDENTITY_INBOX_ENABLED = "false";
  assert.equal((await request(issue)).status, 403);
  assert.equal((await getInventory()).canIssue, false);
  env.FAMILY_IDENTITY_INBOX_ENABLED = "true";
  const initial = await getInventory();
  assert.deepEqual(readCase(initial), { ref: selectedCaseRef, label: caseLabel, authorization: null });

  cutoff = authReads + 3;
  assert.equal((await list()).status, 401);
  cutoff = Infinity;
  simulateLostResponse = true;
  assert.equal((await request(issue)).status, 503);
  simulateLostResponse = false;
  const retryId = grantForCase();
  assert.ok(retryId);
  assert.deepEqual(await (await request(issue)).json(), { status: "ISSUED" });
  assert.equal(grantForCase(), retryId);
  assert.equal((await request({ ...issue, requestRef: randomUUID() })).status, 409);
  const granted = readCase(await getInventory()).authorization;
  assert.equal(granted.through, through);
  assert.deepEqual(Object.keys(granted).sort(), ["ref", "through"]);
  env.FAMILY_IDENTITY_INBOX_ENABLED = "false";
  assert.equal((await request({ action: "revoke", memberRef, grantRef: granted.ref })).status, 200);
  assert.equal((await request({ action: "revoke", memberRef, grantRef: granted.ref })).status, 200);
  env.FAMILY_IDENTITY_INBOX_ENABLED = "true";
  assert.deepEqual(JSON.parse(query(`SELECT jsonb_object_agg(action, total) FROM (
    SELECT action,count(*) AS total FROM audit.access_events WHERE resource_id=:'retryId'::uuid
      AND resource_kind='IDENTITY_REMINDER_CONSENT' GROUP BY action
  ) t;`, { retryId })), { CREATE: 1, REVOKE: 1 });

  query(`INSERT INTO identity.journey_station_reminders(reminder_id, identity_case_id, episode_id, date_revision_id,
    date_kind, target_on, offset_days, recipient_principal_id, state)
    SELECT :'noticeId'::uuid, identity_case_id, episode_id, date_revision_id, date_kind, target_on, 90,
      recipient_principal_id, 'PENDING'
    FROM identity.journey_station_reminders WHERE reminder_id=:'deliveredSeed'::uuid;`, { noticeId, deliveredSeed });
  async function verifyIssued() {
    const id = grantForCase();
    assert.ok(id && id !== retryId);
    assert.equal(await deliver(), 1);
    verifyReceipt(1, noticeId);
    assert.equal(query(`SELECT count(*) FROM identity.list_authorized_journey_station_notices(
      :'familyId'::uuid, :'caseId'::uuid, :'principalId'::uuid,50) WHERE notice_id=:'noticeId'::uuid;`,
    { ...recipient, noticeId }), "1");
  }
  async function verifyRevoked() {
    assert.equal(grantForCase(), null);
    assert.equal(query(`SELECT count(*) FROM identity.list_authorized_journey_station_notices(
      :'familyId'::uuid, :'caseId'::uuid, :'principalId'::uuid,50);`, recipient), "0");
    verifyReceipt(1, noticeId);
  }
  if (browser) {
    await browser({ handleProfile, profilePath: identityProfilePath, handleManagement,
      managementPath: identityStationConsentPath, caseLabel, through, verifyIssued, verifyRevoked });
  } else {
    assert.equal((await request({ ...issue, requestRef: randomUUID() })).status, 200);
    await verifyIssued();
    const { ref } = readCase(await getInventory()).authorization;
    assert.equal((await request({ action: "revoke", memberRef, grantRef: ref })).status, 200);
    await verifyRevoked();
  }
  assert.ok(actions.includes("IDENTITY_STATION_CONSENT_ISSUE_ATTEMPT"));
  assert.ok(actions.includes("IDENTITY_STATION_CONSENT_REVOKE_ATTEMPT"));
  console.log("PASS self-service station consent HTTP, lost-response replay, Worker delivery and audited withdrawal");
}
