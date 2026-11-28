-- Isolated, read-only extension. The server must hold both the selected
-- profile-reference and independent residence-read grants in this transaction.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE FUNCTION identity.read_journey_member_residence(
  p_subject uuid, p_guardian uuid, p_cases uuid[], p_from date, p_until date
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  result jsonb;
BEGIN
  IF p_guardian IS NULL OR p_from IS NULL OR p_until IS NULL OR p_from < DATE '1900-01-01'
    OR p_from > p_until OR p_until > (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
    OR identity.lock_journey_profile_access(p_subject,p_guardian,p_cases) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_RESIDENCE',p_subject,false,'MEMBER_RESIDENCE_SCOPE_DENIED');
    RETURN NULL;
  END IF;
  result := identity.collect_journey_residence(p_subject,p_cases,p_from,p_until);
  IF identity.lock_journey_profile_access(p_subject,p_guardian,p_cases) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_RESIDENCE',p_subject,false,'MEMBER_RESIDENCE_SCOPE_EXPIRED');
    RETURN NULL;
  END IF;
  PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_RESIDENCE',p_subject,true,'MEMBER_RESIDENCE_SCOPE_CURRENT');
  RETURN result;
END
$fn$;

REVOKE ALL ON FUNCTION identity.read_journey_member_residence(uuid,uuid,uuid[],date,date)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
