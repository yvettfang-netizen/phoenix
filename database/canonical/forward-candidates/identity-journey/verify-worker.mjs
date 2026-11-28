import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { runStationReminderBatch } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-reminder-worker.ts";

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
