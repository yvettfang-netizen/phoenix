-- All writes, including Canonical audit events, roll back at test end.
BEGIN;
DO $check$
DECLARE
  family constant uuid := '01910000-0000-7000-8100-000000000001';
  subject constant uuid := '01910000-0000-7000-8100-000000000002';
  recipient constant uuid := '01910000-0000-7000-8100-000000000003';
  case_id constant uuid := '01910000-0000-7000-8100-000000000005';
  revision constant uuid := '01910000-0000-7000-8100-000000000007';
  sent_notice constant uuid := '01910000-0000-7000-8100-000000000008';
  first_grant constant uuid := '01910000-0000-7000-8100-000000000074';
  expiring_grant constant uuid := '01910000-0000-7000-8100-000000000075';
  new_grant constant uuid := '01910000-0000-7000-8100-000000000076';
  version constant text := '2026-11-28.v1';
  expiry timestamptz := clock_timestamp() + interval '10 minutes';
  short_expiry timestamptz;
  ticket uuid;
  role_name text;
  signature text;
  inventory_count bigint;
  inventory_case uuid;
  inventory_kind text;
  inventory_grant uuid;
  inventory_expiry timestamptz;
BEGIN
  IF current_database() <> 'phoenix_identity_journey_synthetic_ci' THEN
    RAISE EXCEPTION 'SYNTHETIC_STATION_AUTHORIZATION_REQUIRED';
  END IF;
  IF identity.issue_journey_station_authorization(first_grant,case_id,expiry,version,true) IS NOT NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED_STATION_AUTHORIZATION_ACCEPTED';
  END IF;
  IF EXISTS (SELECT 1 FROM identity.list_journey_station_authorizations()) THEN
    RAISE EXCEPTION 'UNAUTHENTICATED_STATION_AUTHORIZATION_INVENTORY_ACCEPTED';
  END IF;
  ticket := auth.issue_context_ticket(recipient,subject,family,'FAMILY',
    clock_timestamp()+interval '45 seconds',gen_random_uuid(),recipient);
  PERFORM auth.redeem_context_ticket(ticket,recipient);

  SELECT count(*) INTO inventory_count
  FROM identity.list_journey_station_authorizations();
  IF inventory_count <> 1 THEN
    RAISE EXCEPTION 'INITIAL_STATION_AUTHORIZATION_INVENTORY_WRONG_COUNT_%', inventory_count;
  END IF;
  SELECT identity_case_id, case_kind, authorization_id, expires_at
    INTO inventory_case, inventory_kind, inventory_grant, inventory_expiry
  FROM identity.list_journey_station_authorizations();
  IF inventory_case IS DISTINCT FROM case_id OR inventory_kind IS DISTINCT FROM 'SYNTHETIC_TTPS_A_RENEWAL'
    OR inventory_grant IS NOT NULL OR inventory_expiry IS NOT NULL THEN
    RAISE EXCEPTION 'INITIAL_STATION_AUTHORIZATION_INVENTORY_NOT_EMPTY';
  END IF;

  IF identity.issue_journey_station_authorization(first_grant,case_id,expiry,version,false) IS NOT NULL
    OR identity.issue_journey_station_authorization(first_grant,case_id,expiry,'2026-11-28.v0',true) IS NOT NULL
    OR identity.issue_journey_station_authorization(first_grant,sent_notice,expiry,version,true) IS NOT NULL
    OR identity.issue_journey_station_authorization(first_grant,case_id,'infinity',version,true) IS NOT NULL THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_ACCEPTED_INVALID_INPUT';
  END IF;
  IF identity.issue_journey_station_authorization(first_grant,case_id,expiry,version,true) IS DISTINCT FROM first_grant
    OR identity.issue_journey_station_authorization(first_grant,case_id,expiry,version,true) IS DISTINCT FROM first_grant
    OR identity.issue_journey_station_authorization(first_grant,case_id,expiry+interval '1 second',version,true) IS NOT NULL
    OR identity.issue_journey_station_authorization(new_grant,case_id,expiry,version,true) IS NOT NULL THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_IDEMPOTENCE_FAILED';
  END IF;
  SELECT identity_case_id, case_kind, authorization_id, expires_at
    INTO inventory_case, inventory_kind, inventory_grant, inventory_expiry
  FROM identity.list_journey_station_authorizations();
  IF inventory_case IS DISTINCT FROM case_id OR inventory_kind IS DISTINCT FROM 'SYNTHETIC_TTPS_A_RENEWAL'
    OR inventory_grant IS DISTINCT FROM first_grant OR inventory_expiry IS DISTINCT FROM expiry THEN
    RAISE EXCEPTION 'ACTIVE_STATION_AUTHORIZATION_INVENTORY_WRONG';
  END IF;
  IF identity.revoke_journey_station_authorization(first_grant) IS NOT TRUE
    OR identity.revoke_journey_station_authorization(first_grant) IS NOT TRUE
    OR identity.issue_journey_station_authorization(first_grant,case_id,expiry,version,true) IS NOT NULL THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_REVOCATION_FAILED';
  END IF;
  SELECT authorization_id INTO inventory_grant
  FROM identity.list_journey_station_authorizations();
  IF inventory_grant IS NOT NULL THEN
    RAISE EXCEPTION 'WITHDRAWN_STATION_AUTHORIZATION_REMAINED_IN_INVENTORY';
  END IF;

  short_expiry := clock_timestamp()+interval '1 second';
  IF identity.issue_journey_station_authorization(expiring_grant,case_id,short_expiry,version,true)
    IS DISTINCT FROM expiring_grant THEN RAISE EXCEPTION 'SHORT_STATION_AUTHORIZATION_NOT_ISSUED'; END IF;
  PERFORM pg_sleep_until(short_expiry);
  IF identity.lock_journey_station_authorization(family,case_id,recipient) IS NOT NULL
    OR EXISTS (SELECT 1 FROM identity.list_authorized_journey_station_notices(family,case_id,recipient,50)) THEN
    RAISE EXCEPTION 'EXPIRED_STATION_AUTHORIZATION_REMAINED_ACTIVE';
  END IF;
  SELECT authorization_id INTO inventory_grant
  FROM identity.list_journey_station_authorizations();
  IF inventory_grant IS NOT NULL THEN
    RAISE EXCEPTION 'EXPIRED_STATION_AUTHORIZATION_REMAINED_IN_INVENTORY';
  END IF;
  IF identity.issue_journey_station_authorization(new_grant,case_id,expiry,version,true)
    IS DISTINCT FROM new_grant THEN RAISE EXCEPTION 'EXPIRED_STATION_AUTHORIZATION_NOT_REPLACED'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='consent.identity_journey_station_grants'::regclass
      AND relrowsecurity AND relforcerowsecurity) THEN RAISE EXCEPTION 'STATION_AUTHORIZATION_RLS_NOT_FORCED'; END IF;
  FOREACH role_name IN ARRAY ARRAY[
    'phoenix_canonical_app','phoenix_canonical_reader','phoenix_canonical_service_workbench'
  ] LOOP
    IF has_table_privilege(role_name, 'consent.identity_journey_station_grants', 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'STATION_AUTHORIZATION_TABLE_GRANTED_TO_%', role_name;
    END IF;
    FOREACH signature IN ARRAY ARRAY[
      'identity.issue_journey_station_authorization(uuid,uuid,timestamptz,text,boolean)',
      'identity.revoke_journey_station_authorization(uuid)',
      'identity.lock_journey_station_authorization(uuid,uuid,uuid)',
      'identity.publish_authorized_journey_station_notice(uuid,uuid,uuid,uuid)',
      'identity.list_authorized_journey_station_notices(uuid,uuid,uuid,integer)',
      'identity.acknowledge_authorized_journey_station_notice(uuid,uuid,uuid,uuid)',
      'identity.list_journey_station_authorizations()'
    ] LOOP
      IF has_function_privilege(role_name,signature,'EXECUTE') THEN
        RAISE EXCEPTION 'STATION_AUTHORIZATION_FUNCTION_GRANTED_TO_%: %', role_name,signature;
      END IF;
    END LOOP;
  END LOOP;

  IF identity.publish_authorized_journey_station_notice(sent_notice,recipient,revision,NULL)
       IS DISTINCT FROM 'ALREADY_DELIVERED'
    OR NOT EXISTS (SELECT 1 FROM identity.list_authorized_journey_station_notices(family,case_id,recipient,50)
      WHERE notice_id=sent_notice AND read_at IS NULL) THEN
    RAISE EXCEPTION 'AUTHORIZED_STATION_HISTORY_NOT_VISIBLE';
  END IF;
  IF identity.revoke_journey_station_authorization(new_grant) IS NOT TRUE THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_REPLACEMENT_NOT_REVOKED';
  END IF;
  IF EXISTS (SELECT 1 FROM identity.list_authorized_journey_station_notices(family,case_id,recipient,50))
    OR identity.acknowledge_authorized_journey_station_notice(family,case_id,recipient,sent_notice) IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_notices WHERE reminder_id=sent_notice)
    OR EXISTS (SELECT 1 FROM identity.journey_station_notice_reads WHERE reminder_id=sent_notice) THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_WITHDRAWAL_DID_NOT_CLOSE_INBOX';
  END IF;

  IF (SELECT count(*) FROM audit.access_events
      WHERE resource_kind='IDENTITY_REMINDER_CONSENT' AND principal_id=recipient AND family_id=family
        AND resource_id IN (first_grant,expiring_grant,new_grant) AND action='CREATE' AND decision='ALLOW') <> 3
    OR (SELECT count(*) FROM audit.access_events
      WHERE resource_kind='IDENTITY_REMINDER_CONSENT' AND principal_id=recipient AND family_id=family
        AND resource_id IN (first_grant,new_grant) AND action='REVOKE' AND decision='ALLOW') <> 2 THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_WRITE_AUDIT_MISMATCH';
  END IF;

  -- The 129th row is an explicit overflow sentinel. It lets the serving
  -- adapter reject an unexpectedly large family inventory instead of silently
  -- presenting a truncated case list.
  INSERT INTO identity.cases(identity_case_id, family_id, subject_person_id, case_kind, status)
  SELECT format('01910000-0000-7000-8200-%s', lpad(series::text, 12, '0'))::uuid,
    family, subject, 'SYNTHETIC_OVERFLOW_' || series, 'UNDER_REVIEW'
  FROM generate_series(1, 128) AS generated(series);
  SELECT count(*) INTO inventory_count FROM identity.list_journey_station_authorizations();
  IF inventory_count <> 129 THEN
    RAISE EXCEPTION 'STATION_AUTHORIZATION_INVENTORY_OVERFLOW_SENTINEL_MISSING_%', inventory_count;
  END IF;
  PERFORM auth.clear_context();
END
$check$;
ROLLBACK;
\echo 'PASS explicit station authorization, idempotent retry, expiry replacement, private boundary, inbox withdrawal and audit'
