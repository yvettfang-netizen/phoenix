-- This file is confined to the synthetic acceptance cluster. The permission
-- and consent fixtures here are not candidates for installation.
DO $guard$
BEGIN
  IF current_database() <> 'phoenix_identity_journey_synthetic_ci' THEN
    RAISE EXCEPTION 'SYNTHETIC_CRM_FIXTURE_REQUIRED';
  END IF;
END
$guard$;

INSERT INTO auth.principals(principal_id, principal_kind, status, service_label) VALUES
  ('01910000-0000-7000-8100-000000000021', 'SERVICE', 'ACTIVE', 'canonical_crm_v2'),
  ('01910000-0000-7000-8100-000000000022', 'SERVICE', 'ACTIVE', 'canonical_crm_v2');
INSERT INTO crm.clients(client_id, family_id, client_code, relationship_started_at, created_by_principal_id, updated_by_principal_id)
VALUES ('01910000-0000-7000-8100-000000000023', '01910000-0000-7000-8100-000000000001', 'SYN_IDENTITY_CLIENT',
  clock_timestamp() - interval '1 day', '01910000-0000-7000-8100-000000000021', '01910000-0000-7000-8100-000000000021');
INSERT INTO crm.lead_sources(lead_source_id, source_system, source_channel, status, created_by_principal_id)
VALUES ('01910000-0000-7000-8100-000000000024', 'synthetic_identity_journey', 'WEBSITE', 'ACTIVE',
  '01910000-0000-7000-8100-000000000021');
INSERT INTO crm.leads(lead_id, lead_source_id, family_id, contact_person_id, lead_status, qualification_status,
  created_by_principal_id, updated_by_principal_id)
VALUES ('01910000-0000-7000-8100-000000000025', '01910000-0000-7000-8100-000000000024',
  '01910000-0000-7000-8100-000000000001', '01910000-0000-7000-8100-000000000002', 'QUALIFIED', 'QUALIFIED',
  '01910000-0000-7000-8100-000000000021', '01910000-0000-7000-8100-000000000022');
INSERT INTO crm.lead_identity_links(lead_identity_link_id, lead_id, target_kind, client_id, status, evidence_sha256,
  linked_by_principal_id, verified_by_principal_id, verified_at)
VALUES ('01910000-0000-7000-8100-000000000026', '01910000-0000-7000-8100-000000000025', 'CLIENT',
  '01910000-0000-7000-8100-000000000023', 'VERIFIED', repeat('a', 64),
  '01910000-0000-7000-8100-000000000021', '01910000-0000-7000-8100-000000000022', clock_timestamp());

-- This independent test grant and receipt exercise the boundary without
-- changing the approved Canonical purpose enum or assigning live authority.
CREATE TABLE identity_journey_test.crm_intent (
  consent_id uuid PRIMARY KEY,
  notice_id uuid NOT NULL REFERENCES identity.journey_station_notices,
  recipient_id uuid NOT NULL REFERENCES auth.principals,
  lead_id uuid NOT NULL REFERENCES crm.leads,
  source_contract_id uuid NOT NULL REFERENCES crm.acquisition_contract_revisions,
  accepted_topic text NOT NULL CHECK (accepted_topic IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')),
  consent_revision text NOT NULL,
  expires_at timestamptz NOT NULL,
  withdrawn_at timestamptz,
  UNIQUE (notice_id, recipient_id, accepted_topic, consent_revision)
);
CREATE TABLE identity_journey_test.crm_receipt (
  consent_id uuid PRIMARY KEY REFERENCES identity_journey_test.crm_intent,
  lead_event_id uuid NOT NULL UNIQUE REFERENCES crm.lead_events,
  topic text NOT NULL CHECK (topic IN ('RENEWAL','DOCUMENT','STATUS_REVIEW')),
  horizon text NOT NULL CHECK (horizon IN ('WITHIN_90_DAYS','WITHIN_180_DAYS','LATER','TO_REVIEW'))
);

-- No generic query or CRM storage privilege is granted to the test app LOGIN.
-- Canonical itself evaluates the eligible source contract and FAMILY actor.
CREATE FUNCTION identity_journey_test.record_crm_need(
  p_notice uuid, p_revision text, p_event uuid, p_topic text, p_horizon text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
DECLARE
  intent identity_journey_test.crm_intent%ROWTYPE;
  found_event uuid;
BEGIN
  IF session_user <> 'identity_journey_fixture_app' OR auth.current_channel() IS DISTINCT FROM 'FAMILY' THEN
    RETURN 'DENIED';
  END IF;
  SELECT i.* INTO intent FROM identity_journey_test.crm_intent i
    JOIN crm.acquisition_contract_revisions source ON source.contract_id = i.source_contract_id
    JOIN identity.journey_station_reminders r ON r.reminder_id = i.notice_id AND r.state = 'DELIVERED'
    JOIN identity.cases c USING (identity_case_id)
    JOIN auth.principals principal ON principal.principal_id = i.recipient_id
      AND principal.person_id = c.subject_person_id AND principal.principal_kind = 'FAMILY' AND principal.status = 'ACTIVE'
    JOIN core.family_memberships m ON m.family_id = c.family_id AND m.person_id = c.subject_person_id
    JOIN crm.leads l ON l.lead_id = i.lead_id AND l.family_id = c.family_id
    JOIN crm.lead_identity_links link ON link.lead_id = l.lead_id AND link.target_kind = 'CLIENT' AND link.status = 'VERIFIED'
    JOIN crm.clients client ON client.client_id = link.client_id AND client.family_id = c.family_id
    WHERE i.notice_id = p_notice AND i.accepted_topic = p_topic AND i.consent_revision = p_revision
      AND c.family_id = auth.current_family_id() AND c.subject_person_id = auth.current_actor_person_id()
      AND i.recipient_id = auth.current_principal_id() AND r.recipient_principal_id = i.recipient_id
      AND i.withdrawn_at IS NULL AND i.expires_at > clock_timestamp()
      AND m.valid_from <= clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until > clock_timestamp())
      AND l.lead_status <> 'MERGED' AND client.lifecycle_status IN ('ACTIVE', 'PAUSED')
      AND source.allowed_app_login = session_user AND source.revoked_at IS NULL
      AND source.valid_from <= clock_timestamp() AND source.valid_until > clock_timestamp()
    FOR UPDATE OF l, i
    FOR SHARE OF c, principal, m, link, client, source;
  IF NOT FOUND OR intent.expires_at <= clock_timestamp() THEN RETURN 'DENIED'; END IF;
  IF EXISTS (SELECT 1 FROM identity_journey_test.crm_receipt receipt WHERE receipt.consent_id = intent.consent_id) THEN
    RETURN 'ALREADY_RECEIVED';
  END IF;
  SELECT crm.assert_lead_need(p_event, intent.lead_id, intent.source_contract_id, 'IDENTITY',
    'USER_SELECTED', 'ASSERT', NULL, NULL, intent.consent_id::text,
    encode(sha256(convert_to(intent.consent_id::text || ':' || p_revision || ':' || p_topic, 'UTF8')), 'hex'))
  INTO found_event;
  IF found_event IS NULL THEN RETURN 'DENIED'; END IF;
  INSERT INTO identity_journey_test.crm_receipt VALUES (intent.consent_id, found_event, p_topic, p_horizon);
  RETURN 'RECEIVED';
END
$fn$;
REVOKE ALL ON FUNCTION identity_journey_test.record_crm_need(uuid,text,uuid,text,text) FROM PUBLIC;
GRANT USAGE ON SCHEMA identity_journey_test TO identity_journey_fixture_app;
GRANT EXECUTE ON FUNCTION identity_journey_test.record_crm_need(uuid,text,uuid,text,text) TO identity_journey_fixture_app;
