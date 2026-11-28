-- Isolated candidate for explicit, case-scoped self-consent to station notices.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE consent.identity_journey_station_grants (
  authorization_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(authorization_id)),
  identity_case_id uuid NOT NULL REFERENCES identity.cases,
  family_id uuid NOT NULL REFERENCES core.families,
  subject_person_id uuid NOT NULL REFERENCES core.people,
  recipient_principal_id uuid NOT NULL REFERENCES auth.principals,
  notice_version text NOT NULL CHECK (notice_version = '2026-11-28.v1'),
  granted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (isfinite(expires_at) AND expires_at > granted_at),
  withdrawn_at timestamptz CHECK (withdrawn_at >= granted_at)
);
CREATE INDEX identity_station_grant_lookup_idx ON consent.identity_journey_station_grants
  (identity_case_id, recipient_principal_id, expires_at) WHERE withdrawn_at IS NULL;
ALTER TABLE consent.identity_journey_station_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent.identity_journey_station_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON consent.identity_journey_station_grants
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;

CREATE FUNCTION consent.guard_identity_station_grant_history() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'IDENTITY_STATION_GRANT_HISTORY_IMMUTABLE'; END IF;
  IF OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR
    ROW(OLD.authorization_id, OLD.identity_case_id, OLD.family_id, OLD.subject_person_id,
      OLD.recipient_principal_id, OLD.notice_version, OLD.granted_at, OLD.expires_at) IS DISTINCT FROM
    ROW(NEW.authorization_id, NEW.identity_case_id, NEW.family_id, NEW.subject_person_id,
      NEW.recipient_principal_id, NEW.notice_version, NEW.granted_at, NEW.expires_at)
  THEN RAISE EXCEPTION 'IDENTITY_STATION_GRANT_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER identity_station_grant_history_immutable BEFORE UPDATE OR DELETE
  ON consent.identity_journey_station_grants FOR EACH ROW EXECUTE FUNCTION consent.guard_identity_station_grant_history();

-- The caller binds the FAMILY actor through Canonical before presenting a
-- user-confirmed, server-resolved case and stable request ID.
CREATE FUNCTION identity.issue_journey_station_authorization(
  p_id uuid, p_case uuid, p_expires timestamptz, p_notice_version text, p_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  family uuid := auth.current_family_id();
  subject uuid := auth.current_actor_person_id();
  recipient uuid := auth.current_principal_id();
  authorized_at timestamptz;
  active_grant consent.identity_journey_station_grants%ROWTYPE;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_id) IS NOT TRUE OR p_expires IS NULL OR NOT isfinite(p_expires)
    OR p_notice_version IS DISTINCT FROM '2026-11-28.v1' OR p_confirmed IS NOT TRUE
  THEN RETURN NULL; END IF;
  -- Serialize competing grants for this existing case before taking any
  -- shared locks. Consumers lock the case and grant in that order.
  PERFORM 1 FROM identity.cases c WHERE c.identity_case_id = p_case
    AND c.family_id = family AND c.subject_person_id = subject FOR NO KEY UPDATE;
  IF NOT FOUND OR identity.lock_journey_station_self_scope(family, p_case, recipient) IS NOT TRUE
    THEN RETURN NULL; END IF;
  SELECT * INTO active_grant FROM consent.identity_journey_station_grants g
    WHERE g.identity_case_id = p_case AND g.family_id = family AND g.subject_person_id = subject
      AND g.recipient_principal_id = recipient AND g.granted_at <= clock_timestamp()
      AND g.withdrawn_at IS NULL AND g.expires_at > clock_timestamp() FOR SHARE;
  authorized_at := clock_timestamp();
  IF p_expires <= authorized_at OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  IF FOUND AND active_grant.expires_at > authorized_at THEN
    IF active_grant.authorization_id = p_id AND active_grant.expires_at = p_expires
      AND active_grant.notice_version = p_notice_version THEN RETURN p_id; END IF;
    RETURN NULL;
  END IF;
  INSERT INTO consent.identity_journey_station_grants(authorization_id, identity_case_id, family_id,
    subject_person_id, recipient_principal_id, notice_version, granted_at, expires_at)
  VALUES (p_id, p_case, family, subject, recipient, p_notice_version, authorized_at, p_expires)
  ON CONFLICT (authorization_id) DO NOTHING;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM audit.record_write_decision('CREATE', 'IDENTITY_REMINDER_CONSENT', p_id, true, 'SELF_STATION_REMINDERS_AUTHORIZED');
  RETURN p_id;
END
$fn$;

CREATE FUNCTION identity.revoke_journey_station_authorization(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  recorded consent.identity_journey_station_grants%ROWTYPE;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  SELECT * INTO recorded FROM consent.identity_journey_station_grants g
    WHERE g.authorization_id = p_id AND g.family_id = auth.current_family_id()
      AND g.subject_person_id = auth.current_actor_person_id() AND g.recipient_principal_id = auth.current_principal_id()
    FOR UPDATE;
  IF NOT FOUND OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  IF recorded.withdrawn_at IS NULL THEN
    UPDATE consent.identity_journey_station_grants SET withdrawn_at = clock_timestamp() WHERE authorization_id = p_id;
    PERFORM audit.record_write_decision('REVOKE', 'IDENTITY_REMINDER_CONSENT', p_id, true, 'SELF_STATION_REMINDERS_WITHDRAWN');
  END IF;
  RETURN true;
END
$fn$;

-- Keep withdrawal serialized with an authorized operation. Check expiry
-- against a fresh wall clock after obtaining the row locks.
CREATE FUNCTION identity.lock_journey_station_authorization(p_family uuid, p_case uuid, p_recipient uuid)
RETURNS timestamptz
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  valid_through timestamptz;
BEGIN
  IF identity.lock_journey_station_self_scope(p_family, p_case, p_recipient) IS NOT TRUE THEN RETURN NULL; END IF;
  SELECT g.expires_at INTO valid_through FROM consent.identity_journey_station_grants g
    JOIN identity.cases c ON c.identity_case_id = g.identity_case_id AND c.subject_person_id = g.subject_person_id
    WHERE g.family_id = p_family AND g.identity_case_id = p_case AND g.recipient_principal_id = p_recipient
      AND g.withdrawn_at IS NULL AND g.granted_at <= clock_timestamp() AND g.expires_at > clock_timestamp()
    FOR SHARE OF g;
  IF valid_through > clock_timestamp() THEN RETURN valid_through; END IF;
  RETURN NULL;
END
$fn$;

CREATE FUNCTION identity.publish_authorized_journey_station_notice(
  p_reminder uuid, p_recipient uuid, p_revision uuid, p_claim uuid
) RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  scope record;
  valid_through timestamptz;
  result text;
BEGIN
  SELECT c.family_id, c.identity_case_id, r.date_revision_id INTO scope FROM identity.journey_station_reminders r
    JOIN identity.cases c USING (identity_case_id)
    WHERE r.reminder_id = p_reminder AND r.recipient_principal_id = p_recipient;
  IF NOT FOUND THEN RETURN 'AUTHORIZATION_DENIED'; END IF;
  valid_through := identity.lock_journey_station_authorization(scope.family_id, scope.identity_case_id, p_recipient);
  IF valid_through IS NULL THEN RETURN 'AUTHORIZATION_DENIED'; END IF;
  IF scope.date_revision_id IS DISTINCT FROM p_revision THEN RETURN 'REVISION_CHANGED'; END IF;
  BEGIN
    result := identity.publish_journey_station_notice(p_reminder, p_recipient, p_revision, p_claim);
    IF valid_through <= clock_timestamp() THEN RAISE SQLSTATE 'PNW01'; END IF;
    RETURN result;
  EXCEPTION WHEN SQLSTATE 'PNW01' THEN
    RETURN 'AUTHORIZATION_DENIED';
  END;
END
$fn$;

CREATE FUNCTION identity.list_authorized_journey_station_notices(
  p_family uuid, p_case uuid, p_recipient uuid, p_limit integer
) RETURNS TABLE (notice_id uuid, published_at timestamptz, read_at timestamptz)
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  valid_through timestamptz := identity.lock_journey_station_authorization(p_family, p_case, p_recipient);
BEGIN
  IF valid_through IS NULL THEN RETURN; END IF;
  RETURN QUERY WITH authorized_notices AS MATERIALIZED (
    SELECT * FROM identity.list_journey_station_notices(p_family, p_case, p_recipient, p_limit)
  )
  SELECT n.notice_id, n.published_at, n.read_at FROM authorized_notices n
    WHERE valid_through > clock_timestamp()
    ORDER BY n.published_at DESC, n.notice_id DESC;
END
$fn$;

CREATE FUNCTION identity.acknowledge_authorized_journey_station_notice(
  p_family uuid, p_case uuid, p_recipient uuid, p_notice uuid
) RETURNS timestamptz
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  valid_through timestamptz := identity.lock_journey_station_authorization(p_family, p_case, p_recipient);
  first_read timestamptz;
BEGIN
  IF valid_through IS NULL THEN RETURN NULL; END IF;
  BEGIN
    first_read := identity.acknowledge_journey_station_notice(p_family, p_case, p_recipient, p_notice);
    IF valid_through <= clock_timestamp() THEN RAISE SQLSTATE 'PNW01'; END IF;
    RETURN first_read;
  EXCEPTION WHEN SQLSTATE 'PNW01' THEN
    RETURN NULL;
  END;
END
$fn$;

REVOKE ALL ON FUNCTION consent.guard_identity_station_grant_history(),
  identity.issue_journey_station_authorization(uuid,uuid,timestamptz,text,boolean),
  identity.revoke_journey_station_authorization(uuid),
  identity.lock_journey_station_authorization(uuid,uuid,uuid),
  identity.publish_authorized_journey_station_notice(uuid,uuid,uuid,uuid),
  identity.list_authorized_journey_station_notices(uuid,uuid,uuid,integer),
  identity.acknowledge_authorized_journey_station_notice(uuid,uuid,uuid,uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
