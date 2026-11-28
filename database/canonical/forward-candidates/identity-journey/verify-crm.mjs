import assert from "node:assert/strict";
import {
  handleIdentityConsultation, identityConsultationPath, identityConsultationRevision,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-consultation.ts";

export async function verifyCrmHandoff({ query, recipient, authConfig }) {
  const actor = "01910000-0000-7000-8100-000000000002";
  const lead = "01910000-0000-7000-8100-000000000025";
  const client = "01910000-0000-7000-8100-000000000023";
  const contract = "01910000-0000-7000-8100-000000000027";
  const consent = "01910000-0000-7000-8100-000000000028";
  const event = "01910000-0000-7000-8100-000000000029";
  const revision = identityConsultationRevision;
  const vars = { ...recipient, actor, lead, client, contract, consent, event, revision };

  query(`SELECT crm.register_acquisition_contract(:'contract'::uuid,
    '01910000-0000-7000-8100-000000000024', 'fixture-1',
    jsonb_build_object('entry_ref', 'synthetic/family-os', 'entry_revision', 'fixture-1',
      'manifest_ref', 'synthetic/approved-fixture', 'manifest_sha256', repeat('a', 64)),
    'synthetic/approval', repeat('a',64), 'synthetic/retention', repeat('a',64), 'identity_journey_fixture_app',
    clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour', NULL);
    INSERT INTO identity_journey_test.crm_intent(consent_id, notice_id, recipient_id, lead_id, source_contract_id,
      accepted_topic, consent_revision, expires_at)
    VALUES (:'consent'::uuid, :'noticeId'::uuid, :'principalId'::uuid, :'lead'::uuid, :'contract'::uuid,
      'RENEWAL', :'revision', clock_timestamp() + interval '1 hour');`, vars);

  function asFamily(sql, values = {}) {
    const ticket = query(`SELECT auth.issue_context_ticket(:'principalId'::uuid, :'actor'::uuid, :'familyId'::uuid,
      'FAMILY', clock_timestamp() + interval '45 seconds', gen_random_uuid(), :'principalId'::uuid);`, vars, "binder");
    assert.match(ticket, /^[0-9a-f-]{36}$/);
    const output = query(`BEGIN;
      SET LOCAL statement_timeout = '4s';
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principalId'::uuid);
      ${sql}
      SELECT auth.clear_context();
      COMMIT;`, { ...vars, ...values, ticket }, "app");
    return output.split("\n").filter(Boolean).at(-1);
  }

  const educationEvent = "01910000-0000-7000-8100-000000000030";
  assert.equal(asFamily(`SELECT crm.assert_lead_need(:'educationEvent'::uuid, :'lead'::uuid, :'contract'::uuid,
    'EDUCATION','USER_SELECTED','ASSERT',NULL,NULL,'ci-education-context',repeat('b',64));`, { educationEvent }), educationEvent);

  const allowed = query(`SELECT (NOT has_table_privilege(current_user,'crm.clients','INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege(current_user,'crm.lead_events','INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege(current_user,'identity_journey_test.crm_intent','INSERT,UPDATE,DELETE')
    AND NOT pg_has_role(current_user,'phoenix_canonical_context_binder','MEMBER')); `, {}, "app");
  assert.equal(allowed, "t");
  assert.equal(query(`SELECT identity_journey_test.record_crm_need(:'noticeId'::uuid,:'revision',:'event'::uuid,'RENEWAL','TO_REVIEW');`,
    vars, "app"), "DENIED");

  let revokeBeforeWrite = false;
  const env = {
    FAMILY_IDENTITY_INBOX_ENABLED: "true",
    FAMILY_IDENTITY_INBOX_PROVIDER: { resolve() { throw new Error("Inbox access is not CRM consent"); } },
    FAMILY_IDENTITY_CONSULTATION_ENABLED: "true",
    FAMILY_IDENTITY_CONSULTATION_CONSENT_REVISION: revision,
    FAMILY_IDENTITY_CONSULTATION_PROVIDER: {
      async withAuthorizedIntent(selection, callback) {
        assert.equal(selection.customerId, "ci-only-account");
        assert.equal(selection.sessionHash, "ci-only-session");
        const expiration = query(`SELECT expires_at FROM identity_journey_test.crm_intent
          WHERE notice_id = :'noticeId'::uuid AND accepted_topic = :'topic' AND consent_revision = :'revision'
            AND recipient_id = :'principalId'::uuid AND withdrawn_at IS NULL AND expires_at > clock_timestamp();`,
          { ...vars, topic: selection.topic, noticeId: selection.noticeId });
        if (!expiration) return "DENIED";
        const scope = { family: recipient.familyId, subject: actor };
        return callback({
          scope,
          consultationAuthority: { ...scope, purpose: "IDENTITY_CRM", verified: true,
            revoked: false, validUntil: new Date(expiration).toISOString() },
          verifiedDate: null,
          async appendNeed(summary) {
            assert.deepEqual(summary, { domain: "IDENTITY", topic: "RENEWAL", horizon: "TO_REVIEW" });
            if (revokeBeforeWrite) query("UPDATE identity_journey_test.crm_intent SET withdrawn_at = clock_timestamp();");
            return asFamily(`SELECT identity_journey_test.record_crm_need(
              :'boundNotice'::uuid, :'revision', :'event'::uuid, :'topic', :'horizon');`,
              { boundNotice: selection.noticeId, topic: summary.topic, horizon: summary.horizon });
          },
        });
      },
    },
  };

  const submit = (overrides = {}) => handleIdentityConsultation(new Request(authConfig.origin + identityConsultationPath, {
    method: "POST", headers: { origin: authConfig.origin, "content-type": "application/json" },
    body: JSON.stringify({ noticeId: recipient.noticeId, topic: "RENEWAL", accepted: true, consentRevision: revision, ...overrides }),
  }), env, authConfig);
  const identityNeeds = () => query("SELECT count(*) FROM crm.lead_events WHERE need_domain = 'IDENTITY';");
  assert.equal((await submit({ accepted: false })).status, 400);
  assert.equal((await submit({ noticeId: recipient.caseId })).status, 403);
  assert.equal(identityNeeds(), "0");
  revokeBeforeWrite = true;
  assert.equal((await submit()).status, 403);
  assert.equal(identityNeeds(), "0");
  revokeBeforeWrite = false;
  query("UPDATE identity_journey_test.crm_intent SET withdrawn_at = NULL;");
  assert.equal((await submit()).status, 201);
  assert.equal((await submit()).status, 200);
  assert.equal(identityNeeds(), "1");
  assert.equal(query("SELECT count(*) FROM crm.clients;"), "1");
  assert.equal(query("SELECT count(*) FROM crm.leads;"), "1");
  assert.equal(query(`SELECT count(*) FROM crm.lead_events
    WHERE lead_id = :'lead'::uuid AND need_domain IN ('EDUCATION','IDENTITY') AND need_assertion_kind = 'USER_SELECTED';`, vars), "2");
  assert.equal(query(`SELECT count(*) FROM crm.lead_events e
    JOIN identity_journey_test.crm_receipt r USING (lead_event_id)
    JOIN crm.lead_identity_links l ON l.lead_id = e.lead_id AND l.status = 'VERIFIED'
    WHERE e.lead_event_id = :'event'::uuid AND e.recorded_by_login = 'identity_journey_fixture_app'
      AND e.actor_principal_id = :'principalId'::uuid AND l.client_id = :'client'::uuid
      AND r.topic = 'RENEWAL' AND r.horizon = 'TO_REVIEW' AND r.consent_id = :'consent'::uuid;`, vars), "1");
  query("UPDATE identity_journey_test.crm_intent SET withdrawn_at = clock_timestamp();");
  assert.equal((await submit()).status, 403);
  assert.equal(identityNeeds(), "1");
  console.log("PASS same-notice HTTP handoff to Canonical 0036 FAMILY need, verified existing Client/Lead, withdrawal and idempotency");
}
