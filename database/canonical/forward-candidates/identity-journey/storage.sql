-- Review candidate. Only a disposable isolated database may apply this file.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

-- Link the existing case and subject. The candidate creates no people, families,
-- sponsors, identity case registry, document store or CRM objects.
CREATE TABLE identity.journey_episodes (
  episode_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(episode_id)),
  identity_case_id uuid NOT NULL REFERENCES identity.cases,
  started_on date NOT NULL,
  ended_before date,
  recorded_by uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK (ended_before IS NULL OR ended_before > started_on),
  UNIQUE (episode_id, identity_case_id)
);
CREATE INDEX journey_episodes_case_date_idx ON identity.journey_episodes(identity_case_id, started_on);

CREATE TABLE identity.journey_date_revisions (
  date_revision_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(date_revision_id)),
  identity_case_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  date_kind text NOT NULL CHECK (date_kind IN (
    'VISA_ISSUED','FIRST_ENTRY_DEADLINE','FIRST_ENTRY_ACTUAL','STAY_EXPIRY',
    'RENEWAL_WINDOW_OPEN','RETURN_BY','ABSENCE_REVIEW','GRADUATION','STATUS_TRANSITION',
    'EMPLOYMENT_REVIEW','SPONSOR_REVIEW','HKIC_AGE_11','HKIC_AGE_18',
    'PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY'
  )),
  date_basis text NOT NULL CHECK (date_basis IN ('STATUTORY','CASE_APPROVAL','OFFICIAL_WINDOW','INTERNAL')),
  target_on date NOT NULL,
  verification text NOT NULL CHECK (verification IN ('REPORTED','VERIFIED')),
  official_fact_id uuid REFERENCES identity.external_facts,
  document_id uuid REFERENCES docs.documents,
  verified_by uuid REFERENCES auth.principals,
  supersedes_id uuid UNIQUE,
  recorded_by uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  FOREIGN KEY (episode_id, identity_case_id) REFERENCES identity.journey_episodes(episode_id, identity_case_id),
  UNIQUE (date_revision_id, identity_case_id, episode_id, date_kind),
  FOREIGN KEY (supersedes_id, identity_case_id, episode_id, date_kind)
    REFERENCES identity.journey_date_revisions(date_revision_id, identity_case_id, episode_id, date_kind),
  CHECK (supersedes_id IS NULL OR supersedes_id <> date_revision_id),
  CHECK ((verification = 'VERIFIED') = (verified_by IS NOT NULL)),
  CHECK (verification <> 'VERIFIED' OR official_fact_id IS NOT NULL OR document_id IS NOT NULL)
);
CREATE INDEX journey_dates_case_date_idx ON identity.journey_date_revisions(identity_case_id, target_on);

CREATE TABLE identity.journey_residence_intervals (
  interval_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(interval_id)),
  identity_case_id uuid NOT NULL REFERENCES identity.cases,
  from_on date NOT NULL,
  until_before date NOT NULL,
  location_class text NOT NULL CHECK (location_class IN ('HK','AWAY','UNVERIFIED')),
  absence_reason_class text CHECK (absence_reason_class IN ('WORK','STUDY','FAMILY','OTHER','WITHHELD')),
  document_id uuid REFERENCES docs.documents,
  recorded_by uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CHECK (until_before > from_on),
  CHECK (absence_reason_class IS NULL OR location_class = 'AWAY')
);
CREATE INDEX journey_residence_case_date_idx ON identity.journey_residence_intervals(identity_case_id, from_on);

CREATE FUNCTION identity.guard_journey_evidence() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, identity, docs
AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'journey_date_revisions' THEN
    IF NEW.official_fact_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM identity.external_facts f
      WHERE f.fact_id = NEW.official_fact_id AND f.identity_case_id = NEW.identity_case_id
    ) THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_EVIDENCE_SCOPE'; END IF;
    IF NEW.verification = 'REPORTED' AND EXISTS (
      SELECT 1 FROM identity.journey_date_revisions previous
      WHERE previous.date_revision_id = NEW.supersedes_id AND previous.verification = 'VERIFIED'
    ) THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_VERIFIED_REVISION_REQUIRED'; END IF;
  END IF;
  IF NEW.document_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM docs.documents d JOIN identity.cases c ON c.identity_case_id = NEW.identity_case_id
    WHERE d.document_id = NEW.document_id AND d.family_id = c.family_id
      AND d.subject_person_id = c.subject_person_id AND d.data_class = 'IDENTITY_SENSITIVE'
      AND d.withdrawn_at IS NULL AND d.retention_until > transaction_timestamp()
  ) THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_EVIDENCE_SCOPE'; END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION identity.guard_journey_evidence() FROM PUBLIC;
CREATE TRIGGER journey_date_evidence BEFORE INSERT ON identity.journey_date_revisions
FOR EACH ROW EXECUTE FUNCTION identity.guard_journey_evidence();
CREATE TRIGGER journey_residence_evidence BEFORE INSERT ON identity.journey_residence_intervals
FOR EACH ROW EXECUTE FUNCTION identity.guard_journey_evidence();

-- A consent-backed delivery adapter is a separate review gate. The logical key
-- preserves idempotency across retries and same-date evidence corrections.
CREATE TABLE identity.journey_station_reminders (
  reminder_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(reminder_id)),
  identity_case_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  date_revision_id uuid NOT NULL,
  date_kind text NOT NULL,
  target_on date NOT NULL,
  offset_days smallint NOT NULL CHECK (offset_days IN (365,180,90,60,30,14,7,1)),
  send_on date GENERATED ALWAYS AS (target_on - offset_days::integer) STORED,
  recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
  state text NOT NULL CHECK (state IN ('PENDING','RETRY','DELIVERED','CANCELED')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  retry_not_before timestamptz,
  delivered_at timestamptz,
  FOREIGN KEY (date_revision_id, identity_case_id, episode_id, date_kind)
    REFERENCES identity.journey_date_revisions(date_revision_id, identity_case_id, episode_id, date_kind),
  UNIQUE (identity_case_id, episode_id, date_kind, target_on, offset_days, recipient_principal_id),
  CHECK ((state = 'DELIVERED') = (delivered_at IS NOT NULL)),
  CHECK ((state = 'RETRY') = (retry_not_before IS NOT NULL))
);
CREATE INDEX journey_station_due_idx ON identity.journey_station_reminders(send_on, retry_not_before)
  WHERE state IN ('PENDING','RETRY');

CREATE FUNCTION identity.guard_journey_reminder() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, identity
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM identity.journey_date_revisions d
    WHERE d.date_revision_id = NEW.date_revision_id AND d.target_on = NEW.target_on
      AND (d.verification = 'VERIFIED' OR d.date_basis = 'INTERNAL')
      AND CASE
        WHEN d.date_kind IN ('FIRST_ENTRY_DEADLINE','STAY_EXPIRY','PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY')
          THEN d.date_basis = 'CASE_APPROVAL'
        WHEN d.date_kind = 'RENEWAL_WINDOW_OPEN' THEN d.date_basis = 'OFFICIAL_WINDOW'
        WHEN d.date_kind = 'RETURN_BY' THEN d.date_basis IN ('CASE_APPROVAL','INTERNAL')
        WHEN d.date_kind IN ('HKIC_AGE_11','HKIC_AGE_18') THEN d.date_basis IN ('STATUTORY','INTERNAL')
        WHEN d.date_kind IN ('ABSENCE_REVIEW','GRADUATION','STATUS_TRANSITION','EMPLOYMENT_REVIEW','SPONSOR_REVIEW')
          THEN d.date_basis = 'INTERNAL'
        ELSE false
      END
      AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions n WHERE n.supersedes_id = d.date_revision_id)
  ) THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_REMINDER_SOURCE_INVALID'; END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION identity.guard_journey_reminder() FROM PUBLIC;
CREATE TRIGGER journey_reminder_source BEFORE INSERT OR UPDATE OF date_revision_id, target_on ON identity.journey_station_reminders
FOR EACH ROW EXECUTE FUNCTION identity.guard_journey_reminder();

CREATE FUNCTION identity.guard_journey_delivery_receipt() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF OLD.state = 'DELIVERED' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_DELIVERED_RECEIPT_IMMUTABLE';
  END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION identity.guard_journey_delivery_receipt() FROM PUBLIC;
CREATE TRIGGER journey_delivery_receipt BEFORE UPDATE ON identity.journey_station_reminders
FOR EACH ROW EXECUTE FUNCTION identity.guard_journey_delivery_receipt();

-- No operational principals have grants in this candidate; fine-grained API
-- policies and revocation/retention writers require a separately reviewed contract.
ALTER TABLE identity.journey_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_date_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_residence_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_station_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_episodes FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_date_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_residence_intervals FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_station_reminders FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_episodes, identity.journey_date_revisions,
  identity.journey_residence_intervals, identity.journey_station_reminders
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader;
COMMIT;
