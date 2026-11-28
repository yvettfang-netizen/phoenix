import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readRenewalRecoveryState } from "./verify-recovery-state.mjs";

const transport = fileURLToPath(new URL("./verify-recovery-transport.sh", import.meta.url));
const id = number => `01910000-0000-7000-8100-${String(number).padStart(12, "0")}`;

export async function verifyRenewalRecovery({ container, query, restoredQuery, recipient, timeline, actor }) {
  const scope = { ...recipient, actor, consent: id(62), oldNotice: recipient.noticeId, nextNotice: id(57),
    newDoc: timeline.newDoc, expiredTicket: id(780), nonce: id(781) };
  const recovery = (operation, ...args) => {
    execFileSync("bash", [transport, operation, container, ...args], { timeout: 120_000, stdio: "inherit" });
  };
  const hasTicket = source => source(`SELECT count(*) FROM auth.context_exchange_tickets
    WHERE ticket_id=:'expiredTicket'::uuid;`, scope);
  const withContext = (source, context, statement, role) => {
    const ticket = source(`SELECT auth.issue_context_ticket(:'principal'::uuid, :'person'::uuid,
      :'familyId'::uuid, :'channel', clock_timestamp()+interval '45 seconds', gen_random_uuid(), :'principal'::uuid);`,
    { ...scope, ...context }, "binder");
    assert.match(ticket, /^[0-9a-f-]{36}$/);
    return source(`BEGIN;
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...scope, ...context, ticket }, role);
  };
  const nativeWithdrawal = source => withContext(source, {
    principal: recipient.principalId, person: actor, channel: "FAMILY",
  }, "SELECT docs.withdraw_document(:'newDoc'::uuid), consent.withdraw_grant(:'consent'::uuid);", "app");
  // Build the backup before the withdrawal and cleanup. The expired token is
  // disposable fixture data; its deletion is performed by the native binder.
  assert.equal(query(`SELECT current_database() = 'phoenix_identity_journey_synthetic_ci'
    AND NOT pg_is_in_recovery();`), "t");
  query(`INSERT INTO auth.context_exchange_tickets (
    ticket_id, principal_id, actor_person_id, family_id, channel, request_nonce, expires_at, issued_at, intended_principal_id
  ) VALUES (:'expiredTicket'::uuid, :'principalId'::uuid, :'actor'::uuid, :'familyId'::uuid, 'FAMILY', :'nonce'::uuid,
    clock_timestamp()-interval '5 seconds', clock_timestamp()-interval '15 seconds', :'principalId'::uuid);`, scope);
  assert.equal(hasTicket(query), "1");
  const beforeWithdrawal = readRenewalRecoveryState(query, recipient);
  assert.deepEqual(beforeWithdrawal.notices.map(row => row.id), [scope.nextNotice, scope.oldNotice]);
  assert.ok(beforeWithdrawal.notices.every(row => row.exists && row.read_at && row.published_at));
  assert.deepEqual(beforeWithdrawal.reminders.map(row => row.state), ["CANCELED", "DELIVERED", "PENDING"]);
  assert.deepEqual(beforeWithdrawal.revisions.map(row => [row.id, row.supersedes_id]), [[id(49), null], [id(50), id(49)]]);
  assert.equal(beforeWithdrawal.service_renewal.task_status, "COMPLETED");
  assert.equal(beforeWithdrawal.service_renewal.completion_event_count, 1);
  assert.equal(beforeWithdrawal.service_renewal.workbench_completion_event_count, 1);
  assert.deepEqual([beforeWithdrawal.authorization.crm.consultation_id, beforeWithdrawal.authorization.crm.deal_id],
    [id(70), id(75)]);
  assert.equal(beforeWithdrawal.canonical_ledger.count, 37);
  assert.ok(beforeWithdrawal.candidate_security.grants.every(row => row.allowed === false));
  assert.equal(query(`SELECT count(*) FROM docs.documents d JOIN consent.grants g USING (family_id,subject_person_id)
    JOIN identity_journey_test.timeline_authority t ON t.family_id=g.family_id
    WHERE d.document_id=:'newDoc'::uuid AND d.withdrawn_at IS NULL
      AND g.consent_id=:'consent'::uuid AND g.status='ACTIVE' AND g.withdrawn_at IS NULL
      AND t.case_id=:'caseId'::uuid AND t.principal_id=:'principalId'::uuid AND t.revoked_at IS NULL;`, scope), "1");

  recovery("start");
  try {
    assert.equal(restoredQuery("SELECT pg_is_in_recovery();"), "t");
    assert.equal(hasTicket(restoredQuery), "1");
    assert.deepEqual(readRenewalRecoveryState(restoredQuery, recipient), beforeWithdrawal);

    query("SELECT * FROM auth.cleanup_ephemeral_state();", {}, "binder");
    assert.equal(hasTicket(query), "0");
    await timeline.verifyWithdrawal(() => assert.equal(nativeWithdrawal(query), "t|t"));
    const afterWithdrawal = readRenewalRecoveryState(query, recipient);
    assert.deepEqual(afterWithdrawal.notices, beforeWithdrawal.notices);
    assert.equal(afterWithdrawal.document.id, timeline.newDoc);
    assert.ok(afterWithdrawal.document.withdrawn_at);
    assert.equal(afterWithdrawal.canonical_consent.status, "WITHDRAWN");
    assert.ok(afterWithdrawal.authorization.timeline.revoked_at);
    const flushLsn = query("SELECT pg_current_wal_flush_lsn();");
    assert.match(flushLsn, /^[0-9A-F]+\/[0-9A-F]+$/);
    recovery("promote", flushLsn);

    assert.equal(restoredQuery("SELECT pg_is_in_recovery();"), "f");
    assert.equal(hasTicket(restoredQuery), "0");
    assert.deepEqual(readRenewalRecoveryState(restoredQuery, recipient), afterWithdrawal);
    await timeline.assertRevoked(restoredQuery);
    assert.equal(restoredQuery(`SELECT count(*) FROM identity.journey_date_revisions r
      JOIN identity.journey_renewal_attestations a ON a.decision_id=r.official_fact_id
      JOIN docs.documents d ON d.document_id=r.document_id
      JOIN consent.grants c USING (family_id,subject_person_id)
      WHERE r.date_revision_id=:'revision'::uuid AND r.identity_case_id=:'caseId'::uuid
        AND d.withdrawn_at IS NOT NULL AND c.consent_id=:'consent'::uuid AND c.status='WITHDRAWN'
        AND c.withdrawn_at IS NOT NULL;`, { ...scope, revision: id(50) }), "1");
    assert.throws(() => restoredQuery(
      "SELECT auth.redeem_context_ticket(:'expiredTicket'::uuid, :'principalId'::uuid);", scope, "app",
    ), error => String(error.stderr).includes("CONTEXT_TICKET_INVALID_OR_ALREADY_USED"));
    assert.equal(nativeWithdrawal(restoredQuery), "f|f");
    assert.equal(withContext(restoredQuery, {
      principal: id(41), person: id(40), channel: "ADVISOR",
      decision: id(51), revision: id(50), project: id(80), event: id(151),
      late: id(59), nextLater: id(58),
    }, `SELECT identity.apply_journey_service_renewal(
      :'decision'::uuid, :'revision'::uuid, :'principalId'::uuid, ARRAY[365,7,1]::smallint[],
      ARRAY[:'late'::uuid, :'nextNotice'::uuid, :'nextLater'::uuid], w.revision-1, :'event'::uuid
    ) IS NULL FROM service.workbench_settings w WHERE w.service_project_id=:'project'::uuid;`, "bootstrap"), "t");
    assert.deepEqual(readRenewalRecoveryState(restoredQuery, recipient), afterWithdrawal);
    console.log("PASS Identity Journey physical recovery, post-backup WAL withdrawal and ticket deletion replay, immutable original and next-cycle receipts");
  } finally {
    recovery("stop");
  }
}
