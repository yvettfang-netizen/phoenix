-- Two independently recorded case histories for the same synthetic subject.
-- The labels describe a fixture; no rule estimates either authorized date.
BEGIN;
DO $test$
DECLARE
  family uuid := '01910000-0000-7000-8300-000000000001';
  person uuid := '01910000-0000-7000-8300-000000000002';
  principal uuid := '01910000-0000-7000-8300-000000000003';
  student_case uuid := '01910000-0000-7000-8300-000000000004';
  iang_case uuid := '01910000-0000-7000-8300-000000000005';
  student_episode uuid := '01910000-0000-7000-8300-000000000006';
  iang_episode uuid := '01910000-0000-7000-8300-000000000007';
  student_revision uuid := '01910000-0000-7000-8300-000000000008';
  iang_revision uuid := '01910000-0000-7000-8300-000000000009';
  old_receipt uuid := '01910000-0000-7000-8300-000000000010';
  old_pending uuid := '01910000-0000-7000-8300-000000000011';
  new_pending uuid := '01910000-0000-7000-8300-000000000012';
  student_doc uuid := '01910000-0000-7000-8300-000000000013';
  iang_doc uuid := '01910000-0000-7000-8300-000000000014';
  passport_revision uuid := '01910000-0000-7000-8300-000000000015';
  passport_pending uuid := '01910000-0000-7000-8300-000000000016';
  passport_doc uuid := '01910000-0000-7000-8300-000000000017';
  membership uuid := '01910000-0000-7000-8300-000000000018';
  today_hk date := (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date;
  receipt_at timestamptz;
  old_token uuid;
  new_token uuid;
  passport_token uuid;
BEGIN
  INSERT INTO core.families(family_id,display_name) VALUES (family,'Synthetic transition household');
  INSERT INTO core.people(person_id,display_name) VALUES (person,'Synthetic transitioning student');
  INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES (principal,person,'FAMILY','ACTIVE');
  INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
    VALUES (membership,family,person,'PRIMARY',clock_timestamp()-interval '2 days');
  INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status) VALUES
    (student_case,family,person,'SYNTHETIC_STUDENT','UNDER_REVIEW'),
    (iang_case,family,person,'SYNTHETIC_IANG','UNDER_REVIEW');
  INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by) VALUES
    (student_episode,student_case,today_hk-365,principal),(iang_episode,iang_case,today_hk,principal);
  INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until) VALUES
    (student_doc,family,person,'IDENTITY_SENSITIVE','SYNTHETIC_STUDENT_APPROVAL',clock_timestamp()+interval '1 day'),
    (iang_doc,family,person,'IDENTITY_SENSITIVE','SYNTHETIC_IANG_APPROVAL',clock_timestamp()+interval '1 day'),
    (passport_doc,family,person,'IDENTITY_SENSITIVE','SYNTHETIC_PASSPORT',clock_timestamp()+interval '1 day');
  INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
    target_on,verification,document_id,verified_by,recorded_by) VALUES
    (student_revision,student_case,student_episode,'STAY_EXPIRY','CASE_APPROVAL',today_hk+1,
      'VERIFIED',student_doc,principal,principal),
    (iang_revision,iang_case,iang_episode,'STAY_EXPIRY','CASE_APPROVAL',today_hk+30,
      'VERIFIED',iang_doc,principal,principal),
    (passport_revision,student_case,student_episode,'PASSPORT_EXPIRY','CASE_APPROVAL',today_hk+7,
      'VERIFIED',passport_doc,principal,principal);
  INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,date_kind,
    target_on,offset_days,recipient_principal_id,state) VALUES
    (old_receipt,student_case,student_episode,student_revision,'STAY_EXPIRY',today_hk+1,7,principal,'PENDING'),
    (old_pending,student_case,student_episode,student_revision,'STAY_EXPIRY',today_hk+1,1,principal,'PENDING'),
    (new_pending,iang_case,iang_episode,iang_revision,'STAY_EXPIRY',today_hk+30,30,principal,'PENDING');

  SELECT c.claim_token INTO STRICT old_token FROM identity.claim_journey_station_reminders(1) c WHERE c.reminder_id=old_receipt;
  IF identity.publish_journey_station_notice(old_receipt,principal,student_revision,old_token) <> 'DELIVERED'
    THEN RAISE EXCEPTION 'ACTIVE_STUDENT_NOTICE_NOT_DELIVERED'; END IF;
  SELECT n.published_at INTO STRICT receipt_at FROM identity.journey_station_notices n WHERE n.reminder_id=old_receipt;
  SELECT c.claim_token INTO STRICT old_token FROM identity.claim_journey_station_reminders(1) c WHERE c.reminder_id=old_pending;
  UPDATE identity.journey_episodes SET ended_before=today_hk WHERE episode_id=student_episode;
  IF identity.publish_journey_station_notice(old_pending,principal,student_revision,old_token) <> 'CANCELED'
    OR identity.retry_journey_station_reminder(old_pending,student_revision,old_token)
    OR EXISTS (SELECT 1 FROM identity.journey_station_notices n WHERE n.reminder_id=old_pending)
    THEN RAISE EXCEPTION 'ENDED_STUDENT_REMINDER_STILL_ACTIVE'; END IF;
  UPDATE identity.journey_station_reminders SET claim_until=clock_timestamp()-interval '1 second'
    WHERE reminder_id=old_pending;

  INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,
    date_kind,target_on,offset_days,recipient_principal_id,state)
    VALUES (passport_pending,student_case,student_episode,passport_revision,'PASSPORT_EXPIRY',today_hk+7,7,principal,'PENDING');
  SELECT c.claim_token INTO STRICT new_token FROM identity.claim_journey_station_reminders(1) c WHERE c.reminder_id=new_pending;
  SELECT c.claim_token INTO STRICT passport_token FROM identity.claim_journey_station_reminders(1) c WHERE c.reminder_id=passport_pending;
  IF EXISTS (SELECT 1 FROM identity.claim_journey_station_reminders(1))
    OR identity.publish_journey_station_notice(new_pending,principal,iang_revision,new_token) <> 'DELIVERED'
    OR identity.publish_journey_station_notice(passport_pending,principal,passport_revision,passport_token) <> 'DELIVERED'
    OR (SELECT n.published_at FROM identity.journey_station_notices n WHERE n.reminder_id=old_receipt) IS DISTINCT FROM receipt_at
    THEN RAISE EXCEPTION 'NEW_IANG_REMINDER_OR_HISTORY_INVALID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM identity.list_journey_stay_timeline(family,student_case,principal,10) t
      WHERE t.record_id=student_revision AND t.valid_until=today_hk+1 AND NOT t.is_current)
    OR NOT EXISTS (SELECT 1 FROM identity.list_journey_stay_timeline(family,iang_case,principal,10) t
      WHERE t.record_id=iang_revision AND t.valid_until=today_hk+30 AND t.is_current)
    THEN RAISE EXCEPTION 'IDENTITY_TRANSITION_TIMELINE_INVALID'; END IF;
END
$test$;
ROLLBACK;
SELECT 'PASS same-person Student to IANG candidate: verified dates, historical receipts, independent passport and ended-stage reminder fencing';
