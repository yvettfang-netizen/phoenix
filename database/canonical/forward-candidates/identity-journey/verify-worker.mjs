import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { runStationReminderBatch } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-reminder-worker.ts";
import { handleIdentityInbox, identityNoticePath } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-inbox.ts";

const container = process.argv[2];
assert.match(container ?? "", /^[0-9a-f]{64}$/);
assert.equal(execFileSync("docker", ["inspect", "--format",
  '{{.HostConfig.NetworkMode}}/{{index .Config.Labels "phoenix.identity-journey"}}', container],
{ encoding: "utf8" }).trim(), "none/synthetic");

function query(sql, variables = {}) {
  const args = Object.entries(variables).flatMap(([key, value]) => ["-v", `${key}=${value}`]);
  return execFileSync("docker", ["exec", "-i", "-e", "PGPASSFILE=/tmp/canonical-premerge.pgpass",
    container, "psql", "-XqAt", "-h", "127.0.0.1", "-U", "phoenix_bootstrap",
    "-d", "phoenix_identity_journey_synthetic_ci", "-v", "ON_ERROR_STOP=1", ...args],
  { input: sql, encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

let injectRollback = false;
const queue = {
  async claimDue(limit) {
    return JSON.parse(query(`
      SELECT coalesce(jsonb_agg(jsonb_build_object('reminderId', reminder_id,
        'recipientPrincipalId', recipient_principal_id, 'revisionId', revision_id, 'claimToken', claim_token)), '[]')
      FROM identity.claim_journey_station_reminders(:'limit'::integer);
    `, { limit }));
  },
  async publishWithAuthorization(claim) {
    return query(`
      BEGIN;
      SET LOCAL statement_timeout = '4s';
      WITH authorized AS MATERIALIZED (
        SELECT grant_row.expires_at FROM identity.journey_station_reminders r
        JOIN identity.cases c USING (identity_case_id)
        JOIN identity_journey_test.station_grant grant_row
          ON grant_row.identity_case_id = c.identity_case_id
          AND grant_row.family_id = c.family_id AND grant_row.subject_person_id = c.subject_person_id
          AND grant_row.recipient_principal_id = r.recipient_principal_id
        WHERE r.reminder_id = :'reminderId'::uuid AND r.recipient_principal_id = :'recipientPrincipalId'::uuid
          AND grant_row.withdrawn_at IS NULL
        FOR SHARE OF grant_row
      )
      SELECT CASE WHEN EXISTS (SELECT 1 FROM authorized WHERE expires_at > clock_timestamp())
        THEN identity.publish_journey_station_notice(
          :'reminderId'::uuid, :'recipientPrincipalId'::uuid, :'revisionId'::uuid, :'claimToken'::uuid)
        ELSE 'AUTHORIZATION_DENIED' END;
      ${injectRollback ? "SELECT 1 / 0;" : ""}
      COMMIT;
    `, claim);
  },
  async deferWithBackoff(claim) {
    return query(`SELECT identity.retry_journey_station_reminder(
      :'reminderId'::uuid, :'revisionId'::uuid, :'claimToken'::uuid);`, claim) === "t";
  },
};

const candidate = "01910000-0000-7000-8100-000000000009";
function makeDue() {
  query(`UPDATE identity.journey_station_reminders SET retry_not_before = clock_timestamp() - interval '1 second'
    WHERE reminder_id = :'id'::uuid AND state = 'RETRY';`, { id: candidate });
}
function verifyReceipt(expectedCount) {
  assert.equal(query(`SELECT count(*) FROM identity.journey_station_notices n
    JOIN identity.journey_station_reminders r USING (reminder_id)
    WHERE n.reminder_id = :'id'::uuid AND r.state = 'DELIVERED'
      AND n.published_at = r.delivered_at AND r.claim_token IS NULL;`, { id: candidate }), String(expectedCount));
}

makeDue();
const revoked = await runStationReminderBatch(queue, 1);
assert.equal(revoked.claimed, 1);
assert.equal(revoked.denied, 1);
assert.equal(revoked.deferred, 1);
verifyReceipt(0);
assert.equal((await runStationReminderBatch(queue, 1)).claimed, 0);

query("UPDATE identity_journey_test.station_grant SET withdrawn_at = NULL;");
makeDue();
injectRollback = true;
const failed = await runStationReminderBatch(queue, 1);
assert.equal(failed.delivered, 0);
assert.equal(failed.deferred, 1);
verifyReceipt(0);

makeDue();
injectRollback = false;
const delivered = await runStationReminderBatch(queue, 1);
assert.equal(delivered.delivered, 1);
verifyReceipt(1);
assert.equal((await runStationReminderBatch(queue, 1)).claimed, 0);
console.log("PASS station scheduler, revoked synthetic grant, delivery rollback and backoff, recovery and one notice/receipt");

const recipient = {
  familyId: "01910000-0000-7000-8100-000000000001",
  caseId: "01910000-0000-7000-8100-000000000005",
  principalId: "01910000-0000-7000-8100-000000000003",
  noticeId: candidate,
};
const scopeArgs = ":'familyId'::uuid, :'caseId'::uuid, :'principalId'::uuid";
const list = `SELECT COALESCE(jsonb_agg(to_jsonb(n)), '[]') FROM locked_grant g
  CROSS JOIN LATERAL identity.list_journey_station_notices(${scopeArgs}, g.page_limit) n;`;
const acknowledge = `SELECT identity.acknowledge_journey_station_notice(${scopeArgs}, g.notice_id) FROM locked_grant g;`;

function inbox(statement, scope = recipient) {
  return query(`BEGIN;
    WITH locked_grant AS MATERIALIZED (
      SELECT 50 AS page_limit, :'noticeId'::uuid AS notice_id
      FROM identity_journey_test.station_grant
      WHERE family_id = :'familyId'::uuid AND identity_case_id = :'caseId'::uuid
        AND recipient_principal_id = :'principalId'::uuid AND withdrawn_at IS NULL
        AND expires_at > clock_timestamp()
      FOR SHARE
    )
    ${statement}
    COMMIT;`, scope);
}

const notices = JSON.parse(inbox(list));
assert.equal(notices.length, 2);
assert.equal(notices.find(row => row.notice_id === candidate).read_at, null);
assert.deepEqual(Object.keys(notices[0]).sort(), ["notice_id", "published_at", "read_at"]);
assert.equal(query("SELECT count(*) FROM identity.journey_station_notice_reads;"), "0");

const firstReadAt = inbox(acknowledge);
assert.ok(Number.isFinite(Date.parse(firstReadAt)));
assert.equal(inbox(acknowledge), firstReadAt);
assert.equal(Date.parse(JSON.parse(inbox(list)).find(row => row.notice_id === candidate).read_at), Date.parse(firstReadAt));
assert.equal(query("SELECT count(*) FROM identity.journey_station_notice_reads;"), "1");
assert.equal(inbox(acknowledge, { ...recipient, noticeId: recipient.familyId }), "");

// Even a trusted resolver calling with a wrong scope must not reach this inbox.
assert.equal(query(`SELECT count(*) FROM identity.list_journey_station_notices(${scopeArgs}, 50);`,
  { ...recipient, familyId: recipient.caseId }), "0");
assert.equal(query(`SELECT identity.acknowledge_journey_station_notice(${scopeArgs}, :'noticeId'::uuid);`,
  { ...recipient, principalId: recipient.caseId }), "");

query(`UPDATE core.family_memberships SET valid_until = clock_timestamp()
  WHERE family_id = :'familyId'::uuid;`, recipient);
assert.deepEqual(JSON.parse(inbox(list)), []);
assert.equal(inbox(acknowledge), "");
query(`UPDATE core.family_memberships SET valid_until = NULL WHERE family_id = :'familyId'::uuid;
  UPDATE identity_journey_test.station_grant SET withdrawn_at = clock_timestamp();`, recipient);
assert.deepEqual(JSON.parse(inbox(list)), []);
assert.equal(inbox(acknowledge), "");
verifyReceipt(1);
assert.equal(query("SELECT count(*) FROM identity.journey_station_notice_reads;"), "1");

for (const table of ["journey_station_notices", "journey_station_notice_reads"]) {
  for (const role of ["phoenix_canonical_app", "phoenix_canonical_reader"]) {
    assert.equal(query("SELECT has_table_privilege(:'role', :'table', 'SELECT,UPDATE,DELETE');",
      { role, table: `identity.${table}` }), "f");
  }
}
assert.throws(() => query("UPDATE identity.journey_station_notice_reads SET read_at = clock_timestamp();"),
  error => String(error.stderr).includes("IDENTITY_JOURNEY_STATION_RECEIPT_IMMUTABLE"));
assert.throws(() => query("UPDATE identity.journey_station_notices SET published_at = clock_timestamp();"),
  error => String(error.stderr).includes("IDENTITY_JOURNEY_STATION_RECEIPT_IMMUTABLE"));
console.log("PASS scoped inbox, acknowledgement idempotency, access withdrawal and immutable timestamps");

// Run the same delivered notification through the HTTP handler and SQL
// transactions using a CI-only session/provider. The browser receives only
// notice identity and timestamps; fixture subjects never cross the response.
query("UPDATE identity_journey_test.station_grant SET withdrawn_at = NULL;");
const origin = "https://family.synthetic.invalid";
const events = [];
let authActive = true;
const authConfig = {
  origin,
  async verifySession() {
    return authActive ? { id: "ci-only-account", username: "fixture", token_hash: "ci-only-session",
      created_at: Date.now() - 1000, valid_until: Date.now() + 60_000 } : null;
  },
  async recordAccess(_, action) { events.push(action); },
};
const env = {
  FAMILY_IDENTITY_INBOX_ENABLED: "true",
  FAMILY_IDENTITY_INBOX_PROVIDER: {
    async resolve(session) {
      assert.deepEqual(session, { customerId: "ci-only-account", sessionHash: "ci-only-session" });
      return {
        async assertCurrent() {
          return query(`SELECT count(*) FROM identity_journey_test.station_grant
            WHERE withdrawn_at IS NULL AND expires_at > clock_timestamp();`) === "1";
        },
        async listAuthorized() {
          return JSON.parse(inbox(list)).map(n => ({ id: n.notice_id, publishedAt: n.published_at, readAt: n.read_at }));
        },
        async acknowledgeAuthorized(id) { return inbox(acknowledge, { ...recipient, noticeId: id }) || null; },
      };
    },
  },
};
const get = (headers = {}) => handleIdentityInbox(new Request(origin + identityNoticePath, { headers }), env, authConfig);
const post = (id, writeOrigin = origin) => handleIdentityInbox(new Request(origin + identityNoticePath,
  { method: "POST", headers: { origin: writeOrigin, "content-type": "application/json" }, body: JSON.stringify({ id }) }), env, authConfig);
const response = await get();
assert.equal(response.status, 200);
assert.equal(response.headers.get("Cache-Control"), "private, no-store");
const publicNotices = (await response.json()).notices;
assert.equal(publicNotices.length, 2);
assert.deepEqual(Object.keys(publicNotices[0]).sort(), ["id", "publishedAt", "readAt"]);
const unread = publicNotices.find(notice => notice.readAt === null);
assert.ok(unread);
assert.equal((await post(candidate, "https://cross-origin.invalid")).status, 403);
assert.equal((await get({ "x-family-id": recipient.familyId })).status, 403);
assert.equal((await post(recipient.familyId)).status, 403);
const acknowledged = await post(candidate);
assert.equal(acknowledged.status, 200);
assert.equal((await acknowledged.json()).readAt, new Date(firstReadAt).toISOString());
const newAcknowledgement = await post(unread.id);
assert.equal(newAcknowledgement.status, 200);
const newReadAt = (await newAcknowledgement.json()).readAt;
assert.equal((await (await post(unread.id)).json()).readAt, newReadAt);
assert.equal(query("SELECT count(*) FROM identity.journey_station_notice_reads;"), "2");
assert.ok(events.includes("IDENTITY_INBOX_ACKNOWLEDGE_PREPARED"));
authActive = false;
assert.equal((await get()).status, 401);
authActive = true;
query("UPDATE identity_journey_test.station_grant SET withdrawn_at = clock_timestamp();");
assert.equal((await get()).status, 403);
assert.equal((await post(candidate)).status, 403);
console.log("PASS Family OS inbox HTTP session, same-origin, minimized response, acknowledgement and revocation");

if (process.env.IDENTITY_BROWSER_EVIDENCE_DIR) {
  const { verifyFamilyInboxBrowser } = await import("./verify-browser.mjs");
  query(`UPDATE identity_journey_test.station_grant SET withdrawn_at = NULL;
    INSERT INTO identity.journey_station_reminders (reminder_id, identity_case_id, episode_id,
      date_revision_id, date_kind, target_on, offset_days, recipient_principal_id, state)
    SELECT '01910000-0000-7000-8100-000000000010', identity_case_id, episode_id, date_revision_id,
      date_kind, target_on, 14, recipient_principal_id, 'PENDING'
    FROM identity.journey_station_reminders WHERE reminder_id = :'noticeId'::uuid;`, recipient);
  assert.equal((await runStationReminderBatch(queue, 1)).delivered, 1);
  await verifyFamilyInboxBrowser({
    noticePath: identityNoticePath,
    handle(request, browserOrigin, hasSession) {
      return handleIdentityInbox(request, env, {
        ...authConfig,
        origin: browserOrigin,
        verifySession: async () => hasSession ? authConfig.verifySession() : null,
      });
    },
    revokeGrant() { query("UPDATE identity_journey_test.station_grant SET withdrawn_at = clock_timestamp();"); },
    receiptCount() { return Number(query("SELECT count(*) FROM identity.journey_station_notice_reads;")); },
  });
  console.log("PASS Chromium desktop and mobile inbox over HTTP and isolated PostgreSQL");
}
