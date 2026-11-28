BEGIN;
DO $test$
DECLARE
  candidate_tables text[] := ARRAY['journey_episodes','journey_date_revisions',
    'journey_residence_intervals','journey_station_reminders'];
  candidate_table text;
  family uuid := '01910000-0000-7000-8000-000000000001';
  other_family uuid := '01910000-0000-7000-8000-000000000002';
  person uuid := '01910000-0000-7000-8000-000000000003';
  principal uuid := '01910000-0000-7000-8000-000000000004';
  identity_case uuid := '01910000-0000-7000-8000-000000000005';
  episode uuid := '01910000-0000-7000-8000-000000000006';
  doc uuid := '01910000-0000-7000-8000-000000000007';
  other_doc uuid := '01910000-0000-7000-8000-000000000008';
  revision uuid := '01910000-0000-7000-8000-000000000009';
  invalid_revision uuid := '01910000-0000-7000-8000-000000000010';
  reminder uuid := '01910000-0000-7000-8000-000000000011';
BEGIN
  IF (SELECT count(*) FROM canonical_migrations.applied) <> 37 THEN
    RAISE EXCEPTION 'FORMAL_LEDGER_CHANGED';
  END IF;
  FOREACH candidate_table IN ARRAY candidate_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('identity.' || candidate_table)
      AND relrowsecurity AND relforcerowsecurity)
      OR has_table_privilege('phoenix_canonical_app', 'identity.' || candidate_table, 'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('phoenix_canonical_reader', 'identity.' || candidate_table, 'SELECT,INSERT,UPDATE,DELETE')
    THEN RAISE EXCEPTION 'CANDIDATE_SCOPE_NOT_CLOSED'; END IF;
  END LOOP;

  INSERT INTO core.families(family_id,display_name) VALUES (family,'Synthetic family'),(other_family,'Synthetic other family');
  INSERT INTO core.people(person_id,display_name) VALUES (person,'Synthetic adult');
  INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES (principal,person,'FAMILY','ACTIVE');
  INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
    VALUES (identity_case,family,person,'SYNTHETIC_IDENTITY_CASE','UNDER_REVIEW');
  INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
    VALUES (episode,identity_case,'2028-01-01',principal);
  INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
    VALUES (doc,family,person,'IDENTITY_SENSITIVE','SYNTHETIC_STATUS',now()+interval '1 day'),
      (other_doc,other_family,person,'IDENTITY_SENSITIVE','SYNTHETIC_WRONG_FAMILY',now()+interval '1 day');
  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,document_id,verified_by,recorded_by)
    VALUES (revision,identity_case,episode,'STAY_EXPIRY','CASE_APPROVAL','2028-03-01','VERIFIED',doc,principal,principal);
  BEGIN
    INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
      target_on,verification,document_id,verified_by,recorded_by)
      VALUES (invalid_revision,identity_case,episode,'STAY_EXPIRY','CASE_APPROVAL','2028-06-01','VERIFIED',other_doc,principal,principal);
    RAISE EXCEPTION 'WRONG_FAMILY_EVIDENCE_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDENTITY_JOURNEY_EVIDENCE_SCOPE' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
      target_on,verification,supersedes_id,recorded_by)
      VALUES (invalid_revision,identity_case,episode,'STAY_EXPIRY','CASE_APPROVAL','2028-07-01','REPORTED',revision,principal);
    RAISE EXCEPTION 'UNVERIFIED_REPLACEMENT_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDENTITY_JOURNEY_VERIFIED_REVISION_REQUIRED' THEN RAISE; END IF;
  END;
  INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,
    date_kind,target_on,offset_days,recipient_principal_id,state)
    VALUES (reminder,identity_case,episode,revision,'STAY_EXPIRY','2028-03-01',1,principal,'PENDING');
  IF (SELECT send_on FROM identity.journey_station_reminders WHERE reminder_id = reminder) <> DATE '2028-02-29'
  THEN RAISE EXCEPTION 'INVALID_LEAP_DAY'; END IF;
  BEGIN
    INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,
      date_kind,target_on,offset_days,recipient_principal_id,state)
      VALUES (invalid_revision,identity_case,episode,revision,'STAY_EXPIRY','2028-03-01',1,principal,'PENDING');
    RAISE EXCEPTION 'DUPLICATE_REMINDER_ACCEPTED';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  UPDATE identity.journey_station_reminders SET state = 'RETRY', attempt_count = 2,
    retry_not_before = '2028-02-29 09:30:00+08' WHERE reminder_id = reminder;
  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,document_id,verified_by,supersedes_id,recorded_by)
    VALUES (invalid_revision,identity_case,episode,'STAY_EXPIRY','CASE_APPROVAL',
      '2028-03-01','VERIFIED',doc,principal,revision,principal);
  UPDATE identity.journey_station_reminders SET date_revision_id = invalid_revision
    WHERE reminder_id = reminder AND state IN ('PENDING','RETRY');
  IF NOT EXISTS (
    SELECT 1 FROM identity.journey_station_reminders WHERE reminder_id = reminder
      AND date_revision_id = invalid_revision AND state = 'RETRY' AND attempt_count = 2
      AND retry_not_before = TIMESTAMPTZ '2028-02-29 09:30:00+08'
      AND send_on = DATE '2028-02-29' AND delivered_at IS NULL
  ) THEN RAISE EXCEPTION 'REMINDER_REBIND_LOST_RETRY_STATE'; END IF;
END
$test$;
ROLLBACK;
