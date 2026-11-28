-- Continue with exactly the case and family used by the reminder/CRM fixture.
BEGIN;
DO $test$
DECLARE
  base constant text := '01910000-0000-7000-8100-0000000000';
  home uuid := (base || '01')::uuid;
  subject uuid := (base || '02')::uuid;
  recipient uuid := (base || '03')::uuid;
  journey_case uuid := (base || '05')::uuid;
  episode uuid := (base || '06')::uuid;
  advisor_person uuid := (base || '40')::uuid;
  advisor_principal uuid := (base || '41')::uuid;
  other_home uuid := (base || '42')::uuid;
  casework_case uuid := (base || '43')::uuid;
  doc uuid := (base || '45')::uuid;
  doc_version uuid := (base || '46')::uuid;
  other_doc uuid := (base || '47')::uuid;
  other_version uuid := (base || '48')::uuid;
  prior uuid := (base || '49')::uuid;
  updated uuid := (base || '50')::uuid;
  decision uuid := (base || '51')::uuid;
  invalid_receipt uuid := (base || '52')::uuid;
  wrong_document_decision uuid := (base || '53')::uuid;
  stale_decision uuid := (base || '54')::uuid;
  old_delivered uuid := (base || '55')::uuid;
  old_pending uuid := (base || '56')::uuid;
  new_due uuid := (base || '57')::uuid;
  new_later uuid := (base || '58')::uuid;
  already_late uuid := (base || '59')::uuid;
  spare uuid := (base || '60')::uuid;
  active_consent uuid := (base || '62')::uuid;
  today_hk date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  expected_target date := today_hk + 7;
  delivery_token uuid;
  past_token uuid;
  past_receipt timestamptz;
  advisor_ticket uuid;
BEGIN
  IF has_function_privilege('phoenix_canonical_app', 'identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader', 'identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])', 'EXECUTE')
    OR has_table_privilege('phoenix_canonical_app','identity.journey_renewal_attestations','SELECT,INSERT,UPDATE,DELETE')
  THEN RAISE EXCEPTION 'RENEWAL_SCOPE_NOT_CLOSED'; END IF;

  INSERT INTO core.people(person_id,display_name) VALUES(advisor_person,'Synthetic renewal verifier');
  INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES(advisor_principal,advisor_person,'ADVISOR','ACTIVE');
  INSERT INTO core.families(family_id,display_name) VALUES(other_home,'Synthetic unrelated household');
  INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
    VALUES(casework_case,home,subject,'Synthetic renewal review','OPEN','IDENTITY_CASE',journey_case);
  INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
    VALUES((base || '44')::uuid,casework_case,advisor_person,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour');
  INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
    VALUES(doc,home,subject,'IDENTITY_SENSITIVE','SYNTHETIC_RENEWAL_RESULT',clock_timestamp()+interval '1 day'),
          (other_doc,other_home,subject,'IDENTITY_SENSITIVE','SYNTHETIC_WRONG_FAMILY',clock_timestamp()+interval '1 day');
  INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
    VALUES(doc_version,doc,1,repeat('a',64),'synthetic/renewal-evidence-a',1),
          (other_version,other_doc,1,repeat('b',64),'synthetic/renewal-evidence-b',1);
  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,document_id,verified_by,recorded_by)
    VALUES(prior,journey_case,episode,'STAY_EXPIRY','CASE_APPROVAL',today_hk+1,'VERIFIED',doc,advisor_principal,advisor_principal);
  INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
    VALUES(decision,journey_case,'DECISION','Synthetic fixture','synthetic-approved',clock_timestamp()),
          (invalid_receipt,journey_case,'OFFICIAL_RECEIPT','Synthetic fixture','synthetic-receipt',clock_timestamp()),
          (wrong_document_decision,journey_case,'DECISION','Synthetic fixture','synthetic-wrong-document',clock_timestamp()),
          (stale_decision,journey_case,'DECISION','Synthetic fixture','synthetic-stale-prior',clock_timestamp());
  INSERT INTO identity.journey_renewal_attestations(decision_id,prior_revision_id,document_version_id,verified_target_on,verified_by)
    VALUES(decision,prior,doc_version,expected_target,advisor_principal),
          (invalid_receipt,prior,doc_version,expected_target,advisor_principal),
          (wrong_document_decision,prior,other_version,expected_target,advisor_principal),
          (stale_decision,prior,doc_version,expected_target+30,advisor_principal);
  INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,
    date_kind,target_on,offset_days,recipient_principal_id,state)
    VALUES(old_delivered,journey_case,episode,prior,'STAY_EXPIRY',today_hk+1,7,recipient,'PENDING'),
          (old_pending,journey_case,episode,prior,'STAY_EXPIRY',today_hk+1,1,recipient,'PENDING');
  PERFORM * FROM identity.claim_journey_station_reminders(2);
  SELECT claim_token INTO STRICT delivery_token FROM identity.journey_station_reminders WHERE reminder_id = old_delivered;
  SELECT claim_token INTO STRICT past_token FROM identity.journey_station_reminders WHERE reminder_id = old_pending;
  IF identity.publish_journey_station_notice(old_delivered,recipient,prior,delivery_token) <> 'DELIVERED'
    OR past_token IS NULL THEN RAISE EXCEPTION 'RENEWAL_FIXTURE_OLD_NOTICE_NOT_READY'; END IF;
  SELECT published_at INTO STRICT past_receipt FROM identity.journey_station_notices WHERE reminder_id = old_delivered;

  advisor_ticket := auth.issue_context_ticket(advisor_principal,advisor_person,home,'ADVISOR',
    clock_timestamp()+interval '45 seconds',gen_random_uuid(),advisor_principal);
  PERFORM auth.redeem_context_ticket(advisor_ticket,advisor_principal);
  INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
    purpose,data_class,status,granted_at,expires_at)
    VALUES((base || '61')::uuid,home,subject,advisor_person,subject,'IDENTITY_CASE','IDENTITY_SENSITIVE',
      'ACTIVE',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour');
  IF identity.apply_journey_renewal(decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    THEN RAISE EXCEPTION 'EXPIRED_RENEWAL_AUTHORITY_ACCEPTED'; END IF;
  INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
    purpose,data_class,status,granted_at,expires_at)
    VALUES(active_consent,home,subject,advisor_person,subject,'IDENTITY_CASE','IDENTITY_SENSITIVE',
      'ACTIVE',clock_timestamp()-interval '5 minutes',clock_timestamp()+interval '1 hour');

  IF identity.apply_journey_renewal(spare,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(invalid_receipt,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(wrong_document_decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(decision,updated,advisor_principal,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
  THEN RAISE EXCEPTION 'RENEWAL_ACCEPTED_UNVERIFIED_OR_WRONG_SCOPE'; END IF;
  BEGIN
    PERFORM identity.apply_journey_renewal(decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[old_delivered]);
    RAISE EXCEPTION 'UNEXPECTED_RENEWAL_REMINDER_COLLISION_SUCCESS';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id = updated)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = old_pending AND claim_token = past_token)
  THEN RAISE EXCEPTION 'RENEWAL_ROLLBACK_LOST_OLD_LEASE'; END IF;

  IF identity.apply_journey_renewal(decision,updated,recipient,ARRAY[365,7,1]::smallint[],ARRAY[already_late,new_due,new_later])
    IS DISTINCT FROM updated THEN RAISE EXCEPTION 'RENEWAL_NOT_APPLIED'; END IF;
  IF identity.apply_journey_renewal(decision,spare,recipient,ARRAY[7]::smallint[],ARRAY[already_late]) IS DISTINCT FROM updated
    OR identity.apply_journey_renewal(stale_decision,spare,recipient,ARRAY[7]::smallint[],ARRAY[already_late]) IS NOT NULL
    OR (SELECT count(*) FROM identity.journey_station_reminders WHERE date_revision_id = updated) <> 2
    OR NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id = updated
      AND target_on = expected_target AND supersedes_id = prior AND official_fact_id = decision AND verified_by = advisor_principal)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = old_pending AND state = 'CANCELED'
      AND claim_token IS NULL AND retry_not_before IS NULL)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_notices WHERE reminder_id = old_delivered AND published_at = past_receipt)
    OR identity.publish_journey_station_notice(old_pending,recipient,prior,past_token) <> 'CANCELED'
  THEN RAISE EXCEPTION 'RENEWAL_HISTORY_OR_REPLAY_INVALID'; END IF;
  IF (SELECT count(*) FROM audit.access_events a WHERE a.resource_id = updated AND a.resource_kind = 'IDENTITY_JOURNEY_RENEWAL'
      AND a.principal_id = advisor_principal AND a.family_id = home AND a.decision = 'ALLOW') <> 1
  THEN RAISE EXCEPTION 'RENEWAL_AUDIT_MISSING_OR_DUPLICATE'; END IF;

  PERFORM auth.clear_context();
  SELECT claimed.claim_token INTO STRICT delivery_token FROM identity.claim_journey_station_reminders(1) claimed
    WHERE claimed.reminder_id = new_due;
  IF identity.publish_journey_station_notice(new_due,recipient,updated,delivery_token) <> 'DELIVERED'
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = new_later AND state = 'PENDING')
  THEN RAISE EXCEPTION 'RENEWAL_NEXT_CYCLE_NOT_DELIVERABLE'; END IF;
  RAISE NOTICE 'PASS same-family verified renewal, rollback, old receipt, next-cycle delivery and canonical audit';
END
$test$;
ROLLBACK;
