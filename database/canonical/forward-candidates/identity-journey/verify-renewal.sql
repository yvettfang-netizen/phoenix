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
  old_delivered uuid := (base || '09')::uuid;
  review_task uuid := '01910000-0000-7000-8100-000000000115';
  review_event uuid := '01910000-0000-7000-8100-000000000151';
  review_collision_event uuid := '01910000-0000-7000-8100-000000000152';
  review_stale_event uuid := '01910000-0000-7000-8100-000000000153';
  review_replay_event uuid := '01910000-0000-7000-8100-000000000154';
  review_expired_event uuid := '01910000-0000-7000-8100-000000000155';
  old_pending uuid := (base || '56')::uuid;
  new_due uuid := (base || '57')::uuid;
  new_later uuid := (base || '58')::uuid;
  already_late uuid := (base || '59')::uuid;
  spare uuid := (base || '60')::uuid;
  active_consent uuid := (base || '62')::uuid;
  today_hk date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  expected_target date := today_hk + 7;
  original_target date;
  past_token uuid;
  past_receipt timestamptz;
  advisor_ticket uuid;
  review_project uuid;
  workbench_revision integer;
  bridge_result uuid;
BEGIN
  IF current_database() <> 'phoenix_identity_journey_synthetic_ci' THEN RAISE EXCEPTION 'SYNTHETIC_RENEWAL_FIXTURE_REQUIRED'; END IF;
  IF has_function_privilege('phoenix_canonical_app', 'identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader', 'identity.apply_journey_renewal(uuid,uuid,uuid,smallint[],uuid[])', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_app', 'identity.apply_journey_service_renewal(uuid,uuid,uuid,smallint[],uuid[],integer,uuid)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_reader', 'identity.apply_journey_service_renewal(uuid,uuid,uuid,smallint[],uuid[],integer,uuid)', 'EXECUTE')
    OR has_function_privilege('phoenix_canonical_service_workbench', 'identity.apply_journey_service_renewal(uuid,uuid,uuid,smallint[],uuid[],integer,uuid)', 'EXECUTE')
    OR has_table_privilege('phoenix_canonical_app','identity.journey_renewal_attestations','SELECT,INSERT,UPDATE,DELETE')
  THEN RAISE EXCEPTION 'RENEWAL_SCOPE_NOT_CLOSED'; END IF;

  INSERT INTO core.families(family_id,display_name) VALUES(other_home,'Synthetic unrelated household');
  INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
    VALUES(doc,home,subject,'IDENTITY_SENSITIVE','SYNTHETIC_RENEWAL_RESULT',clock_timestamp()+interval '1 day'),
          (other_doc,other_home,subject,'IDENTITY_SENSITIVE','SYNTHETIC_WRONG_FAMILY',clock_timestamp()+interval '1 day');
  INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
    VALUES(doc_version,doc,1,repeat('a',64),'synthetic/renewal-evidence-a',1),
          (other_version,other_doc,1,repeat('b',64),'synthetic/renewal-evidence-b',1);
  INSERT INTO identity.external_facts(fact_id,identity_case_id,fact_kind,source_name,external_reference,observed_at)
    VALUES(decision,journey_case,'DECISION','Synthetic fixture','synthetic-approved',clock_timestamp()),
          (invalid_receipt,journey_case,'OFFICIAL_RECEIPT','Synthetic fixture','synthetic-receipt',clock_timestamp()),
          (wrong_document_decision,journey_case,'DECISION','Synthetic fixture','synthetic-wrong-document',clock_timestamp()),
          (stale_decision,journey_case,'DECISION','Synthetic fixture','synthetic-stale-prior',clock_timestamp());
  INSERT INTO identity.journey_renewal_attestations(decision_id,prior_revision_id,document_version_id,verified_target_on,verified_by,review_task_id)
    VALUES(decision,prior,doc_version,expected_target,advisor_principal,review_task),
          (invalid_receipt,prior,doc_version,expected_target,advisor_principal,NULL),
          (wrong_document_decision,prior,other_version,expected_target,advisor_principal,NULL),
          (stale_decision,prior,doc_version,expected_target+30,advisor_principal,NULL);
  IF NOT EXISTS (SELECT 1 FROM service.tasks t JOIN service.workbench_task_scope scope USING (task_id)
    WHERE t.task_id=review_task AND t.task_status='IN_PROGRESS' AND t.assigned_principal_id=advisor_principal
      AND scope.audience='STAFF' AND scope.subject_person_id=subject)
  THEN RAISE EXCEPTION 'RENEWAL_RESULT_REVIEW_TASK_NOT_STARTED'; END IF;
  INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,
    date_kind,target_on,offset_days,recipient_principal_id,state)
    SELECT old_pending,identity_case_id,episode_id,date_revision_id,date_kind,target_on,1,recipient,'PENDING'
    FROM identity.journey_date_revisions WHERE date_revision_id=prior;
  SELECT c.claim_token INTO STRICT past_token FROM identity.claim_journey_station_reminders(1) c WHERE c.reminder_id=old_pending;
  SELECT notice.published_at INTO STRICT past_receipt FROM identity.journey_station_notices notice
    JOIN identity.journey_station_reminders reminder USING (reminder_id)
    WHERE notice.reminder_id=old_delivered AND reminder.date_revision_id=prior AND reminder.state='DELIVERED';
  SELECT target_on INTO STRICT original_target FROM identity.journey_date_revisions WHERE date_revision_id=prior;

  advisor_ticket := auth.issue_context_ticket(advisor_principal,advisor_person,home,'ADVISOR',
    clock_timestamp()+interval '45 seconds',gen_random_uuid(),advisor_principal);
  PERFORM auth.redeem_context_ticket(advisor_ticket,advisor_principal);
  SELECT t.service_project_id,w.revision INTO STRICT review_project,workbench_revision
    FROM service.tasks t JOIN service.workbench_settings w USING (service_project_id)
    WHERE t.task_id=review_task AND t.task_status='IN_PROGRESS'
      AND t.assigned_principal_id=advisor_principal;
  INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
    purpose,data_class,status,granted_at,expires_at)
    VALUES((base || '61')::uuid,home,subject,advisor_person,subject,'IDENTITY_CASE','IDENTITY_SENSITIVE',
      'ACTIVE',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour');
  IF identity.apply_journey_renewal(decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    THEN RAISE EXCEPTION 'EXPIRED_RENEWAL_AUTHORITY_ACCEPTED'; END IF;
  IF identity.apply_journey_service_renewal(decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due],
      workbench_revision,review_expired_event) IS NOT NULL
  THEN RAISE EXCEPTION 'EXPIRED_RENEWAL_BRIDGE_AUTHORITY_ACCEPTED'; END IF;
  IF (SELECT task_status FROM service.tasks WHERE task_id=review_task) IS DISTINCT FROM 'IN_PROGRESS'
    OR (SELECT revision FROM service.workbench_settings WHERE service_project_id=review_project)
      IS DISTINCT FROM workbench_revision
    OR EXISTS (SELECT 1 FROM service.workbench_events WHERE event_id=review_expired_event)
  THEN RAISE EXCEPTION 'EXPIRED_RENEWAL_BRIDGE_NOT_ROLLED_BACK'; END IF;
  INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,
    purpose,data_class,status,granted_at,expires_at)
    VALUES(active_consent,home,subject,advisor_person,subject,'IDENTITY_CASE','IDENTITY_SENSITIVE',
      'ACTIVE',clock_timestamp()-interval '5 minutes',clock_timestamp()+interval '1 hour');
  PERFORM 1 FROM identity_journey_test.station_grant
    WHERE identity_case_id=journey_case AND family_id=home AND subject_person_id=subject
      AND recipient_principal_id=recipient AND withdrawn_at IS NULL AND expires_at>clock_timestamp()
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RENEWAL_STATION_AUTHORITY_MISSING'; END IF;

  IF identity.apply_journey_renewal(spare,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(invalid_receipt,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(wrong_document_decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
    OR identity.apply_journey_renewal(decision,updated,advisor_principal,ARRAY[7]::smallint[],ARRAY[new_due]) IS NOT NULL
  THEN RAISE EXCEPTION 'RENEWAL_ACCEPTED_UNVERIFIED_OR_WRONG_SCOPE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM identity.list_journey_stay_timeline(home,journey_case,recipient,10)
    WHERE record_id = prior AND is_current AND valid_until = original_target)
  THEN RAISE EXCEPTION 'RENEWAL_TIMELINE_PRIOR_NOT_CURRENT'; END IF;
  BEGIN
    PERFORM identity.apply_journey_renewal(decision,updated,recipient,ARRAY[7]::smallint[],ARRAY[old_delivered]);
    RAISE EXCEPTION 'UNEXPECTED_RENEWAL_REMINDER_COLLISION_SUCCESS';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id = updated)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = old_pending AND claim_token = past_token)
  THEN RAISE EXCEPTION 'RENEWAL_ROLLBACK_LOST_OLD_LEASE'; END IF;

  -- A reminder-id collision must roll back both the attempted supersession
  -- and the Workbench completion event.  The function may surface the
  -- canonical unique violation; the nested block keeps this fixture alive so
  -- the rollback state can be inspected below.
  BEGIN
    bridge_result := identity.apply_journey_service_renewal(decision,updated,recipient,
      ARRAY[365,7,1]::smallint[],ARRAY[already_late,old_delivered,new_later],workbench_revision,review_collision_event);
    IF bridge_result IS NOT NULL THEN RAISE EXCEPTION 'RENEWAL_BRIDGE_COLLISION_ACCEPTED'; END IF;
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id=updated)
    OR EXISTS (SELECT 1 FROM service.workbench_events WHERE event_id=review_collision_event)
    OR (SELECT task_status FROM service.tasks WHERE task_id=review_task) IS DISTINCT FROM 'IN_PROGRESS'
  THEN RAISE EXCEPTION 'RENEWAL_BRIDGE_COLLISION_NOT_ATOMIC'; END IF;

  IF identity.apply_journey_service_renewal(decision,updated,recipient,
      ARRAY[365,7,1]::smallint[],ARRAY[already_late,new_due,new_later],workbench_revision-1,review_stale_event)
    IS NOT NULL
  THEN RAISE EXCEPTION 'RENEWAL_BRIDGE_STALE_WORKBENCH_ACCEPTED'; END IF;
  IF EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id=updated)
    OR EXISTS (SELECT 1 FROM service.workbench_events WHERE event_id=review_stale_event)
    OR (SELECT task_status FROM service.tasks WHERE task_id=review_task) IS DISTINCT FROM 'IN_PROGRESS'
  THEN RAISE EXCEPTION 'RENEWAL_BRIDGE_STALE_WORKBENCH_MUTATED'; END IF;

  bridge_result := identity.apply_journey_service_renewal(decision,updated,recipient,
    ARRAY[365,7,1]::smallint[],ARRAY[already_late,new_due,new_later],workbench_revision,review_event);
  IF bridge_result IS DISTINCT FROM updated THEN RAISE EXCEPTION 'RENEWAL_NOT_APPLIED'; END IF;
  -- The original input can be retried without producing a second task event.
  IF identity.apply_journey_service_renewal(decision,updated,recipient,
      ARRAY[365,7,1]::smallint[],ARRAY[already_late,new_due,new_later],workbench_revision,review_event)
    IS DISTINCT FROM updated
    OR identity.apply_journey_service_renewal(decision,updated,recipient,
      ARRAY[365,7,1]::smallint[],ARRAY[already_late,new_due,new_later],workbench_revision,review_replay_event)
    IS DISTINCT FROM updated
  THEN RAISE EXCEPTION 'RENEWAL_BRIDGE_REPLAY_INVALID'; END IF;
  IF identity.apply_journey_renewal(decision,spare,recipient,ARRAY[7]::smallint[],ARRAY[already_late]) IS DISTINCT FROM updated
    OR identity.apply_journey_renewal(stale_decision,spare,recipient,ARRAY[7]::smallint[],ARRAY[already_late]) IS NOT NULL
    OR (SELECT count(*) FROM identity.journey_station_reminders WHERE date_revision_id = updated) <> 2
    OR NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions WHERE date_revision_id = updated
      AND target_on = expected_target AND supersedes_id = prior AND official_fact_id = decision AND verified_by = advisor_principal)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = old_pending AND state = 'CANCELED'
      AND claim_token IS NULL AND retry_not_before IS NULL)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_notices WHERE reminder_id = old_delivered AND published_at = past_receipt)
    OR (SELECT count(*) FROM service.workbench_events WHERE service_project_id=review_project
      AND command_kind='TASK_STATUS' AND result->>'toStatus'='COMPLETED') <> 1
    OR (SELECT count(*) FROM service.task_events WHERE task_id=review_task
      AND event_kind='STATUS_CHANGED' AND to_status='COMPLETED'
      AND reason_code='IDENTITY_RENEWAL_RESULT_VERIFIED') <> 1
    OR identity.publish_journey_station_notice(old_pending,recipient,prior,past_token) <> 'CANCELED'
  THEN RAISE EXCEPTION 'RENEWAL_HISTORY_OR_REPLAY_INVALID'; END IF;
  IF (SELECT count(*) FROM audit.access_events a WHERE a.resource_id = updated AND a.resource_kind = 'IDENTITY_JOURNEY_RENEWAL'
      AND a.principal_id = advisor_principal AND a.family_id = home AND a.decision = 'ALLOW') <> 1
  THEN RAISE EXCEPTION 'RENEWAL_AUDIT_MISSING_OR_DUPLICATE'; END IF;

  PERFORM auth.clear_context();
  IF NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders
      WHERE reminder_id = new_due AND date_revision_id=updated AND state='PENDING'
        AND claim_token IS NULL AND retry_not_before IS NULL)
    OR NOT EXISTS (SELECT 1 FROM identity.journey_station_reminders
      WHERE reminder_id = new_later AND date_revision_id=updated AND state='PENDING'
        AND claim_token IS NULL AND retry_not_before IS NULL)
  THEN RAISE EXCEPTION 'RENEWAL_NEXT_CYCLE_NOT_DELIVERABLE'; END IF;
  RAISE NOTICE 'PASS same-family verified renewal, Workbench completion, rollback, old receipt and next-cycle reminders % %', new_due, new_later;
END
$test$;
-- Persist into the disposable database so HTTP and Chromium read the result.
COMMIT;
