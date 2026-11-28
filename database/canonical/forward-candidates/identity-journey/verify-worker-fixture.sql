-- Committed only into the disposable CI database so two independent sessions can
-- act on one due reminder. This is a synthetic scheduling fixture.
BEGIN;
INSERT INTO core.families (family_id, display_name)
VALUES ('01910000-0000-7000-8100-000000000001', 'Synthetic worker family');
INSERT INTO core.people (person_id, display_name)
VALUES ('01910000-0000-7000-8100-000000000002', 'Synthetic worker recipient');
INSERT INTO auth.principals (principal_id, person_id, principal_kind, status)
VALUES ('01910000-0000-7000-8100-000000000003', '01910000-0000-7000-8100-000000000002', 'FAMILY', 'ACTIVE');
INSERT INTO core.family_memberships (membership_id, family_id, person_id, membership_role, valid_from)
VALUES ('01910000-0000-7000-8100-000000000004', '01910000-0000-7000-8100-000000000001',
  '01910000-0000-7000-8100-000000000002', 'PRIMARY', clock_timestamp() - interval '1 day');
INSERT INTO identity.cases (identity_case_id, family_id, subject_person_id, case_kind, status)
VALUES ('01910000-0000-7000-8100-000000000005', '01910000-0000-7000-8100-000000000001',
  '01910000-0000-7000-8100-000000000002', 'SYNTHETIC_WORKER', 'UNDER_REVIEW');
INSERT INTO identity.journey_episodes (episode_id, identity_case_id, started_on, recorded_by)
VALUES ('01910000-0000-7000-8100-000000000006', '01910000-0000-7000-8100-000000000005',
  (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date - 30, '01910000-0000-7000-8100-000000000003');
INSERT INTO identity.journey_date_revisions (date_revision_id, identity_case_id, episode_id, date_kind,
  date_basis, target_on, verification, recorded_by)
VALUES ('01910000-0000-7000-8100-000000000007', '01910000-0000-7000-8100-000000000005',
  '01910000-0000-7000-8100-000000000006', 'ABSENCE_REVIEW', 'INTERNAL',
  (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date, 'REPORTED', '01910000-0000-7000-8100-000000000003');
INSERT INTO identity.journey_station_reminders (reminder_id, identity_case_id, episode_id, date_revision_id,
  date_kind, target_on, offset_days, recipient_principal_id, state, attempt_count, retry_not_before)
SELECT '01910000-0000-7000-8100-000000000008', identity_case_id, episode_id, date_revision_id,
  date_kind, target_on, 1, '01910000-0000-7000-8100-000000000003', 'RETRY', 2,
  clock_timestamp() - interval '1 hour'
FROM identity.journey_date_revisions WHERE date_revision_id = '01910000-0000-7000-8100-000000000007';
COMMIT;
