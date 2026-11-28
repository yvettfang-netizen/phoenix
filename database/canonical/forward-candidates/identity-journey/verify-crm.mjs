import assert from "node:assert/strict";
import {
  handleIdentityConsultation, identityConsultationPath, identityConsultationRevision,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-consultation.ts";

export async function verifyCrmHandoff({ query, recipient, authConfig }) {
  const actor = "01910000-0000-7000-8100-000000000002";
  const lead = "01910000-0000-7000-8100-000000000025";
  const client = "01910000-0000-7000-8100-000000000023";
  const clientLink = "01910000-0000-7000-8100-000000000026";
  const contract = "01910000-0000-7000-8100-000000000027";
  const consent = "01910000-0000-7000-8100-000000000028";
  const event = "01910000-0000-7000-8100-000000000029";
  const educationEvent = "01910000-0000-7000-8100-000000000030";
  const withdrawnConsent = "01910000-0000-7000-8100-000000000031";
  const atomicityConsent = "01910000-0000-7000-8100-000000000032";
  const revision = identityConsultationRevision;
  const vars = { ...recipient, actor, lead, client, clientLink, contract, consent, event,
    educationEvent, withdrawnConsent, atomicityConsent, revision };

  // The contract is the same Canonical acquisition object used by the real CRM
  // writer. Its entry metadata is deliberately specific to this consultation
  // path; a generic website/education contract must not authorize this handoff.
  query(`SELECT crm.register_acquisition_contract(:'contract'::uuid,
    '01910000-0000-7000-8100-000000000024', 'identity-consultation-v1',
    jsonb_build_object('entry_ref', 'family-os/identity-consultation', 'entry_revision', :'revision',
      'manifest_ref', 'synthetic/approved-fixture', 'manifest_sha256', repeat('a', 64)),
    'synthetic/approval', repeat('a',64), 'synthetic/retention', repeat('a',64), 'identity_journey_fixture_app',
    clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour', NULL);`, vars);

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

  // The existing CRM need writer remains the only way to create the education
  // baseline. The app LOGIN cannot write CRM or private candidate tables, and
  // cannot call private candidate functions directly.
  assert.equal(asFamily(`SELECT crm.assert_lead_need(:'educationEvent'::uuid, :'lead'::uuid, :'contract'::uuid,
    'EDUCATION','USER_SELECTED','ASSERT',NULL,NULL,'ci-education-context',repeat('b',64));`, { educationEvent }), educationEvent);

  const allowed = query(`SELECT (NOT has_table_privilege(current_user,'crm.clients','INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege(current_user,'crm.lead_events','INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege(current_user,'consent.identity_journey_crm_intents','INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege(current_user,'identity.journey_crm_handoffs','INSERT,UPDATE,DELETE')
    AND NOT pg_has_role(current_user,'phoenix_canonical_context_binder','MEMBER')
    AND NOT has_function_privilege(current_user,
      'identity.submit_journey_crm_consultation(uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text)','EXECUTE'));`, {}, "app");
  assert.equal(allowed, "t");

  const identityNeeds = () => query("SELECT count(*) FROM crm.lead_events WHERE need_domain = 'IDENTITY';");
  const privateIntents = (id) => query(`SELECT count(*) FROM consent.identity_journey_crm_intents
    WHERE consent_id = :'id'::uuid;`, { id });
  const privateHandoffs = (id) => query(`SELECT count(*) FROM identity.journey_crm_handoffs
    WHERE consent_id = :'id'::uuid;`, { id });

  // No synthetic authoritative writer remains. Calling the retired helper must
  // fail closed rather than silently exercising a second data model.
  assert.throws(() => query("SELECT identity_journey_test.record_crm_need(NULL,NULL,NULL,NULL,NULL);", vars, "app"),
    error => String(error.stderr ?? error.message).includes("function identity_journey_test.record_crm_need") ||
      String(error.stderr ?? error.message).includes("does not exist"));

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

        // Resolve the current notice, station grant, verified date, existing
        // lead/client binding and exact acquisition contract without writing.
        // The private candidate performs the same checks again after the HTTP
        // callback asks to append a need.
        const date = query(`SELECT jsonb_build_object('id', r.date_revision_id, 'seriesId', r.episode_id,
          'family', c.family_id, 'subject', c.subject_person_id, 'date', r.target_on, 'kind', r.date_kind,
          'basis', r.date_basis, 'state', r.verification, 'evidenceRef', r.document_id)
          FROM identity.journey_station_notices n
          JOIN identity.journey_station_reminders ticket USING (reminder_id)
          JOIN identity.journey_date_revisions r ON r.date_revision_id = ticket.date_revision_id
          JOIN identity.journey_episodes e ON e.episode_id = r.episode_id
          JOIN identity.cases c ON c.identity_case_id = ticket.identity_case_id
          JOIN docs.documents d ON d.document_id = r.document_id
          JOIN consent.identity_journey_station_grants station
            ON station.identity_case_id = c.identity_case_id
            AND station.family_id = c.family_id
            AND station.subject_person_id = c.subject_person_id
            AND station.recipient_principal_id = ticket.recipient_principal_id
            AND station.granted_at <= clock_timestamp()
            AND station.withdrawn_at IS NULL
            AND station.expires_at > clock_timestamp()
          JOIN crm.leads l ON l.lead_id = :'lead'::uuid
            AND l.family_id = c.family_id AND l.lead_status <> 'MERGED'
          JOIN crm.lead_identity_links link ON link.lead_identity_link_id = :'clientLink'::uuid
            AND link.lead_id = l.lead_id AND link.target_kind = 'CLIENT'
            AND link.status = 'VERIFIED' AND link.revoked_at IS NULL
          JOIN crm.clients client ON client.client_id = link.client_id
            AND client.client_id = :'client'::uuid AND client.family_id = c.family_id
            AND client.lifecycle_status IN ('ACTIVE','PAUSED')
          JOIN crm.acquisition_contract_revisions source ON source.contract_id = :'contract'::uuid
            AND source.allowed_app_login = 'identity_journey_fixture_app'
            AND source.entry_ref = 'family-os/identity-consultation'
            AND source.entry_revision = :'revision'
            AND source.revoked_at IS NULL
            AND source.valid_from <= clock_timestamp() AND source.valid_until > clock_timestamp()
          JOIN crm.lead_sources intake ON intake.lead_source_id = source.lead_source_id
            AND intake.source_channel = 'WEBSITE'
          WHERE n.reminder_id = :'noticeId'::uuid
            AND ticket.recipient_principal_id = :'principalId'::uuid
            AND ticket.state = 'DELIVERED'
            AND c.family_id = :'familyId'::uuid AND c.subject_person_id = :'actor'::uuid
            AND e.ended_before IS NULL AND r.date_kind = 'STAY_EXPIRY'
            AND r.verification = 'VERIFIED' AND d.withdrawn_at IS NULL
            AND d.retention_until > clock_timestamp()
            AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions next
              WHERE next.supersedes_id = r.date_revision_id);`,
          { ...vars, noticeId: selection.noticeId });
        if (!date) return "DENIED";

        const scope = { family: recipient.familyId, subject: actor };
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        return callback({
          scope,
          consultationAuthority: { ...scope, purpose: "IDENTITY_CRM", verified: true,
            revoked: false, validUntil: expiresAt },
          verifiedDate: JSON.parse(date),
          async appendNeed(summary) {
            const expected = selection.topic === "RENEWAL" ? "WITHIN_90_DAYS" : "TO_REVIEW";
            assert.deepEqual(summary, { domain: "IDENTITY", topic: selection.topic, horizon: expected });

            if (revokeBeforeWrite) {
              // This intentionally uses a different topic and consent. The
              // intent is captured only after the HTTP callback requests the
              // write, withdrawn in the same FAMILY context, then rejected by
              // the private writer before a CRM event can be appended.
              const authorized = asFamily(`SELECT COALESCE(
                identity_journey_test.authorize_journey_crm_consultation(
                  :'withdrawnConsent'::uuid, :'boundNotice'::uuid, :'lead'::uuid, :'clientLink'::uuid,
                  :'contract'::uuid, :'topic', :'revision', :'expires'::timestamptz, true)::text, 'DENIED');`, {
                boundNotice: selection.noticeId, topic: selection.topic, expires: expiresAt,
              });
              assert.equal(authorized, withdrawnConsent);
              assert.equal(asFamily(`SELECT identity_journey_test.withdraw_journey_crm_consultation(
                :'withdrawnConsent'::uuid);`), "t");
              return asFamily(`SELECT identity_journey_test.record_journey_crm_need(
                :'withdrawnConsent'::uuid, :'event'::uuid, :'horizon');`, {
                horizon: summary.horizon,
              });
            }

            // The standard API is atomic: an append denial rolls back its new
            // intent, so HTTP never leaves an orphan consent row.
            return asFamily(`SELECT COALESCE(identity_journey_test.submit_journey_crm_consultation(
              :'consent'::uuid, :'event'::uuid, :'boundNotice'::uuid, :'lead'::uuid,
              :'clientLink'::uuid, :'contract'::uuid, :'topic', :'revision',
              :'expires'::timestamptz, true, :'horizon'), 'DENIED');`, {
              boundNotice: selection.noticeId, topic: selection.topic, expires: expiresAt,
              horizon: summary.horizon,
            });
          },
        });
      },
    },
  };

  const submit = (overrides = {}) => handleIdentityConsultation(new Request(authConfig.origin + identityConsultationPath, {
    method: "POST", headers: { origin: authConfig.origin, "content-type": "application/json" },
    body: JSON.stringify({ noticeId: recipient.noticeId, topic: "RENEWAL", accepted: true,
      consentRevision: revision, ...overrides }),
  }), env, authConfig);

  assert.equal((await submit({ accepted: false })).status, 400);
  assert.equal((await submit({ unexpected: true })).status, 400);
  assert.equal((await submit({ noticeId: recipient.caseId })).status, 403);
  assert.equal(identityNeeds(), "0");

  // The route itself must reject an unauthenticated request before the
  // provider is reached.
  const verifySession = authConfig.verifySession;
  authConfig.verifySession = async () => null;
  assert.equal((await submit()).status, 401);
  authConfig.verifySession = verifySession;

  // Exercise withdrawal-before-write with STATUS_REVIEW. The only official
  // fixture date is STAY_EXPIRY, so this topic intentionally resolves to the
  // safe TO_REVIEW band and must still not create an identity need.
  revokeBeforeWrite = true;
  assert.equal((await submit({ topic: "STATUS_REVIEW" })).status, 403);
  assert.equal(identityNeeds(), "0");
  assert.equal(privateIntents(withdrawnConsent), "1");
  assert.equal(privateHandoffs(withdrawnConsent), "0");
  revokeBeforeWrite = false;

  // A deliberately wrong horizon proves the atomic submit wrapper rolls back
  // both the new intent and the CRM need when the append cannot be accepted.
  assert.equal(asFamily(`SELECT COALESCE(identity_journey_test.submit_journey_crm_consultation(
    :'atomicityConsent'::uuid, :'event'::uuid, :'noticeId'::uuid, :'lead'::uuid, :'clientLink'::uuid,
    :'contract'::uuid, 'RENEWAL', :'revision', clock_timestamp()+interval '1 hour', true, 'LATER'), 'DENIED');`), "DENIED");
  assert.equal(privateIntents(atomicityConsent), "0");
  assert.equal(privateHandoffs(atomicityConsent), "0");

  const accepted = await submit();
  assert.equal(accepted.status, 201);
  assert.deepEqual(await accepted.json(), { status: "RECEIVED" });
  assert.equal((await submit()).status, 200);
  assert.equal(identityNeeds(), "1");
  assert.equal(query("SELECT count(*) FROM crm.clients;"), "1");
  assert.equal(query("SELECT count(*) FROM crm.leads;"), "1");
  assert.equal(query(`SELECT count(*) FROM crm.lead_events
    WHERE lead_id = :'lead'::uuid AND need_domain IN ('EDUCATION','IDENTITY') AND need_assertion_kind = 'USER_SELECTED';`, vars), "2");
  assert.equal(query(`SELECT count(*) FROM crm.lead_events e
    JOIN identity.journey_crm_handoffs r ON r.lead_event_id = e.lead_event_id
    JOIN crm.lead_identity_links l ON l.lead_id = e.lead_id AND l.status = 'VERIFIED'
    WHERE e.lead_event_id = :'event'::uuid AND e.recorded_by_login = 'identity_journey_fixture_app'
      AND e.actor_principal_id = :'principalId'::uuid AND l.client_id = :'client'::uuid
      AND r.topic = 'RENEWAL' AND r.horizon = 'WITHIN_90_DAYS' AND r.consent_id = :'consent'::uuid;`, vars), "1");

  // Keep the real candidate receipt live for the downstream CRM/service-chain
  // adapter. The final withdrawal is intentionally exposed as a callback so
  // that the chain can prove a previously-created service link cannot be used
  // for later mutations after the family revokes consultation consent.
  let withdrawn = false;
  async function verifyWithdrawnReceipt() {
    assert.equal(withdrawn, false, "consultation withdrawal is one-way in this fixture");
    assert.equal(query(`SELECT count(*) FROM identity.journey_crm_handoffs
      WHERE consent_id = :'consent'::uuid AND lead_event_id = :'event'::uuid;`, vars), "1");
    assert.equal(asFamily(`SELECT identity_journey_test.withdraw_journey_crm_consultation(
      :'consent'::uuid);`), "t");
    withdrawn = true;
    assert.equal(asFamily(`SELECT identity_journey_test.record_journey_crm_need(
      :'consent'::uuid, :'event'::uuid, 'TO_REVIEW');`), "DENIED");
    assert.equal((await submit()).status, 403);
    assert.equal(identityNeeds(), "1");
    assert.equal(query(`SELECT count(*) FROM identity.journey_crm_handoffs
      WHERE consent_id = :'consent'::uuid AND lead_event_id = :'event'::uuid;`, vars), "1");
    console.log("PASS private CRM receipt withdrawal denies later family handoff");
  }

  console.log("PASS verified stay-expiry notice to Canonical 0036 FAMILY need, exact consultation contract, private intent/handoff idempotency and atomic withdrawal");
  return { actor, lead, client, clientLink, contract, consent, event, educationEvent, verifyWithdrawnReceipt };
}
