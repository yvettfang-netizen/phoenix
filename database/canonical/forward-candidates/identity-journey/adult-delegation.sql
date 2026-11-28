-- Isolated candidate for self-issued, case-scoped profile read authority.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_profile_delegations (
  delegation_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(delegation_id)),
  family_id uuid NOT NULL REFERENCES core.families,
  subject_person_id uuid NOT NULL REFERENCES core.people,
  subject_principal_id uuid NOT NULL REFERENCES auth.principals,
  delegate_principal_id uuid NOT NULL REFERENCES auth.principals,
  identity_case_ids uuid[] NOT NULL CHECK (coalesce(array_ndims(identity_case_ids),1)=1
    AND cardinality(identity_case_ids) BETWEEN 1 AND 32 AND array_position(identity_case_ids,NULL) IS NULL),
  issued_at timestamptz NOT NULL,
  valid_until timestamptz NOT NULL CHECK (isfinite(valid_until) AND valid_until>issued_at),
  revoked_at timestamptz CHECK (revoked_at>=issued_at),
  CHECK (subject_principal_id<>delegate_principal_id)
);
CREATE INDEX journey_profile_delegations_lookup_idx ON identity.journey_profile_delegations(
  delegate_principal_id,family_id,valid_until) WHERE revoked_at IS NULL;
ALTER TABLE identity.journey_profile_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_profile_delegations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_profile_delegations
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_service_workbench;

CREATE FUNCTION identity.guard_journey_profile_delegation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_DELEGATION_HISTORY_IMMUTABLE'; END IF;
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR
    ROW(OLD.delegation_id,OLD.family_id,OLD.subject_person_id,OLD.subject_principal_id,OLD.delegate_principal_id,
      OLD.identity_case_ids,OLD.issued_at,OLD.valid_until) IS DISTINCT FROM
    ROW(NEW.delegation_id,NEW.family_id,NEW.subject_person_id,NEW.subject_principal_id,NEW.delegate_principal_id,
      NEW.identity_case_ids,NEW.issued_at,NEW.valid_until)
  THEN RAISE EXCEPTION 'IDENTITY_JOURNEY_DELEGATION_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER journey_profile_delegation_immutable BEFORE UPDATE OR DELETE
  ON identity.journey_profile_delegations FOR EACH ROW EXECUTE FUNCTION identity.guard_journey_profile_delegation();

-- Hold both people while checking their latest verified capacity. Inserting
-- a newer capacity record needs an FK lock on that person.
CREATE FUNCTION identity.lock_journey_adult_profile_pair(
  p_family uuid,p_subject uuid,p_owner uuid,p_delegate uuid
) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  delegate_person uuid;
  locked_people integer;
BEGIN
  SELECT recipient.person_id INTO delegate_person FROM auth.principals owner
    JOIN auth.principals recipient ON recipient.principal_id=p_delegate AND recipient.principal_kind='FAMILY'
    JOIN core.family_memberships owner_membership ON owner_membership.family_id=p_family
      AND owner_membership.person_id=owner.person_id
    JOIN core.family_memberships delegate_membership ON delegate_membership.family_id=p_family
      AND delegate_membership.person_id=recipient.person_id
    WHERE owner.principal_id=p_owner AND owner.person_id=p_subject AND owner.principal_kind='FAMILY'
      AND recipient.person_id<>p_subject AND owner.status='ACTIVE' AND recipient.status='ACTIVE'
      AND owner_membership.valid_from<=clock_timestamp()
      AND (owner_membership.valid_until IS NULL OR owner_membership.valid_until>clock_timestamp())
      AND delegate_membership.valid_from<=clock_timestamp()
      AND (delegate_membership.valid_until IS NULL OR delegate_membership.valid_until>clock_timestamp())
    FOR SHARE OF owner,recipient,owner_membership,delegate_membership;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO locked_people FROM (
    SELECT person.person_id FROM core.people person WHERE person.person_id IN (p_subject,delegate_person)
    ORDER BY person.person_id FOR UPDATE
  ) people;
  RETURN locked_people=2
    AND core.current_civil_capacity(p_subject)='ADULT_VERIFIED'
    AND core.current_civil_capacity(delegate_person)='ADULT_VERIFIED';
END
$fn$;

-- Private serving adapter only. Bind the actor from the trusted FAMILY session
-- after explicit consent and resolve the selected existing cases and recipient
-- server-side. This purpose authorizes no other identity API.
CREATE FUNCTION identity.issue_journey_profile_delegation(
  p_id uuid,p_delegate uuid,p_cases uuid[],p_valid_until timestamptz
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  family uuid := auth.current_family_id();
  subject uuid := auth.current_actor_person_id();
  owner uuid := auth.current_principal_id();
  scope_cases uuid[];
  selected_case uuid;
  issue_instant timestamptz;
  recorded identity.journey_profile_delegations%ROWTYPE;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_id) IS NOT TRUE OR p_delegate IS NULL OR p_cases IS NULL OR p_valid_until IS NULL
    OR NOT isfinite(p_valid_until) OR p_valid_until<=clock_timestamp() OR coalesce(array_ndims(p_cases),1)<>1
    OR cardinality(p_cases) NOT BETWEEN 1 AND 32 OR array_position(p_cases,NULL) IS NOT NULL
  THEN RETURN NULL; END IF;
  IF identity.lock_journey_adult_profile_pair(family,subject,owner,p_delegate) IS NOT TRUE THEN RETURN NULL; END IF;
  SELECT array_agg(DISTINCT case_id ORDER BY case_id) INTO scope_cases FROM unnest(p_cases) AS requested(case_id);
  IF cardinality(scope_cases)<>cardinality(p_cases) THEN RETURN NULL; END IF;
  FOREACH selected_case IN ARRAY scope_cases LOOP
    PERFORM 1 FROM identity.cases c WHERE c.identity_case_id=selected_case
      AND c.family_id=family AND c.subject_person_id=subject FOR SHARE;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END LOOP;
  issue_instant := clock_timestamp();
  IF p_valid_until<=issue_instant OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;

  INSERT INTO identity.journey_profile_delegations(
    delegation_id,family_id,subject_person_id,subject_principal_id,delegate_principal_id,identity_case_ids,issued_at,valid_until)
  VALUES (p_id,family,subject,owner,p_delegate,scope_cases,issue_instant,p_valid_until)
  ON CONFLICT (delegation_id) DO NOTHING;
  IF FOUND THEN
    PERFORM audit.record_write_decision('CREATE','IDENTITY_PROFILE_DELEGATION',p_id,true,'SELF_DELEGATED_PROFILE_READ');
    RETURN p_id;
  END IF;
  SELECT * INTO recorded FROM identity.journey_profile_delegations
    WHERE delegation_id=p_id AND family_id=family AND subject_person_id=subject
      AND subject_principal_id=owner AND delegate_principal_id=p_delegate
      AND identity_case_ids=scope_cases AND valid_until=p_valid_until AND revoked_at IS NULL
      AND valid_until>clock_timestamp() FOR SHARE;
  IF FOUND AND auth.write_context_is_live() THEN RETURN recorded.delegation_id; END IF;
  RETURN NULL;
END
$fn$;

CREATE FUNCTION identity.revoke_journey_profile_delegation(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  recorded identity.journey_profile_delegations%ROWTYPE;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  SELECT * INTO recorded FROM identity.journey_profile_delegations
    WHERE delegation_id=p_id AND family_id=auth.current_family_id() AND subject_person_id=auth.current_actor_person_id()
      AND subject_principal_id=auth.current_principal_id() FOR UPDATE;
  IF NOT FOUND OR auth.write_context_is_live() IS NOT TRUE THEN RETURN false; END IF;
  IF recorded.revoked_at IS NULL THEN
    UPDATE identity.journey_profile_delegations SET revoked_at=clock_timestamp() WHERE delegation_id=p_id;
    PERFORM audit.record_write_decision('REVOKE','IDENTITY_PROFILE_DELEGATION',p_id,true,'PROFILE_DELEGATION_REVOKED');
  END IF;
  RETURN true;
END
$fn$;

CREATE FUNCTION identity.lock_journey_adult_profile_delegation(p_id uuid,p_subject uuid,p_cases uuid[])
RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  recorded identity.journey_profile_delegations%ROWTYPE;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR p_cases IS NULL OR cardinality(p_cases)=0 THEN RETURN false; END IF;
  SELECT * INTO recorded FROM identity.journey_profile_delegations
    WHERE delegation_id=p_id AND family_id=auth.current_family_id() AND subject_person_id=p_subject
      AND delegate_principal_id=auth.current_principal_id() AND issued_at<=clock_timestamp()
      AND revoked_at IS NULL AND valid_until>clock_timestamp() AND p_cases <@ identity_case_ids FOR SHARE;
  IF NOT FOUND OR identity.lock_journey_adult_profile_pair(recorded.family_id,recorded.subject_person_id,
    recorded.subject_principal_id,recorded.delegate_principal_id) IS NOT TRUE THEN RETURN false; END IF;
  RETURN recorded.valid_until>clock_timestamp() AND auth.write_context_is_live();
END
$fn$;

REVOKE ALL ON FUNCTION identity.guard_journey_profile_delegation(),
  identity.lock_journey_adult_profile_pair(uuid,uuid,uuid,uuid),
  identity.issue_journey_profile_delegation(uuid,uuid,uuid[],timestamptz),
  identity.revoke_journey_profile_delegation(uuid),
  identity.lock_journey_adult_profile_delegation(uuid,uuid,uuid[])
  FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_service_workbench;
COMMIT;
