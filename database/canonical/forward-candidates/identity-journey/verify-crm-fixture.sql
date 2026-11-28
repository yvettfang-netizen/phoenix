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

-- The private candidate owns the authoritative intent and handoff rows.  The
-- synthetic app LOGIN gets only these test-only SECURITY DEFINER adapters so
-- the CI path still exercises the real session_user and FAMILY context.  No
-- synthetic intent/receipt tables are created and no consent is pre-seeded.
CREATE FUNCTION identity_journey_test.authorize_journey_crm_consultation(
  p_consent uuid, p_notice uuid, p_lead uuid, p_link uuid, p_contract uuid,
  p_topic text, p_version text, p_expires timestamptz, p_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF session_user <> 'identity_journey_fixture_app' THEN RETURN NULL; END IF;
  RETURN identity.authorize_journey_crm_consultation(
    p_consent, p_notice, p_lead, p_link, p_contract,
    p_topic, p_version, p_expires, p_confirmed);
END
$fn$;

CREATE FUNCTION identity_journey_test.record_journey_crm_need(
  p_consent uuid, p_event uuid, p_expected_horizon text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF session_user <> 'identity_journey_fixture_app' THEN RETURN 'DENIED'; END IF;
  RETURN identity.record_journey_crm_need(p_consent, p_event, p_expected_horizon);
END
$fn$;

CREATE FUNCTION identity_journey_test.submit_journey_crm_consultation(
  p_consent uuid, p_event uuid, p_notice uuid, p_lead uuid, p_link uuid, p_contract uuid,
  p_topic text, p_version text, p_expires timestamptz, p_confirmed boolean,
  p_expected_horizon text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF session_user <> 'identity_journey_fixture_app' THEN RETURN 'DENIED'; END IF;
  RETURN identity.submit_journey_crm_consultation(
    p_consent, p_event, p_notice, p_lead, p_link, p_contract,
    p_topic, p_version, p_expires, p_confirmed, p_expected_horizon);
END
$fn$;

CREATE FUNCTION identity_journey_test.withdraw_journey_crm_consultation(p_consent uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF session_user <> 'identity_journey_fixture_app' THEN RETURN false; END IF;
  RETURN identity.withdraw_journey_crm_consultation(p_consent);
END
$fn$;

REVOKE ALL ON FUNCTION identity_journey_test.authorize_journey_crm_consultation(
  uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean),
  identity_journey_test.record_journey_crm_need(uuid,uuid,text),
  identity_journey_test.submit_journey_crm_consultation(
    uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text),
  identity_journey_test.withdraw_journey_crm_consultation(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA identity_journey_test TO identity_journey_fixture_app;
GRANT EXECUTE ON FUNCTION identity_journey_test.authorize_journey_crm_consultation(
  uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean),
  identity_journey_test.record_journey_crm_need(uuid,uuid,text),
  identity_journey_test.submit_journey_crm_consultation(
    uuid,uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,boolean,text),
  identity_journey_test.withdraw_journey_crm_consultation(uuid)
  TO identity_journey_fixture_app;
