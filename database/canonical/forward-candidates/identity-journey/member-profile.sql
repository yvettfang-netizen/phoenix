-- Isolated profile projection. The serving adapter must lock its independent
-- profile-read grant and bind the member reference to the trusted session.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

ALTER TABLE identity.journey_date_revisions
  DROP CONSTRAINT journey_date_revisions_date_kind_check,
  ADD CONSTRAINT journey_date_revisions_date_kind_check CHECK (date_kind IN (
    'APPROVAL_DATE','VISA_ISSUED','FIRST_ENTRY_DEADLINE','FIRST_ENTRY_ACTUAL','STAY_EXPIRY',
    'RENEWAL_WINDOW_OPEN','RETURN_BY','ABSENCE_REVIEW','GRADUATION','STATUS_TRANSITION',
    'EMPLOYMENT_REVIEW','SPONSOR_REVIEW','HKIC_AGE_11','HKIC_AGE_18','PASSPORT_EXPIRY','TRAVEL_DOCUMENT_EXPIRY',
    'INVESTMENT_REVIEW','PERMANENT_RESIDENCE_PREPARATION'
  ));

CREATE FUNCTION identity.lock_journey_profile_access(p_subject uuid,p_guardian uuid,p_cases uuid[],p_delegation uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  caller uuid := auth.current_actor_person_id();
  family uuid := auth.current_family_id();
  now_at timestamptz := clock_timestamp();
  case_id uuid;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'FAMILY' OR auth.write_context_is_live() IS NOT TRUE
    OR family IS NULL OR caller IS NULL OR p_subject IS NULL OR p_cases IS NULL
    OR coalesce(array_ndims(p_cases),1) <> 1 OR cardinality(p_cases) > 32 OR array_position(p_cases,NULL) IS NOT NULL
    OR (p_delegation IS NULL AND (caller=p_subject) IS DISTINCT FROM (p_guardian IS NULL))
    OR (p_delegation IS NOT NULL AND (p_guardian IS NOT NULL OR caller=p_subject))
  THEN RETURN false; END IF;

  IF p_delegation IS NOT NULL THEN
    IF identity.lock_journey_adult_profile_delegation(p_delegation,p_subject,p_cases) IS NOT TRUE THEN RETURN false; END IF;
  ELSE
    PERFORM 1 FROM auth.principals p
      JOIN core.family_memberships actor ON actor.family_id = family AND actor.person_id = caller
      JOIN core.family_memberships subject ON subject.family_id = family AND subject.person_id = p_subject
      WHERE p.principal_id = auth.current_principal_id() AND p.person_id = caller
        AND p.principal_kind = 'FAMILY' AND p.status = 'ACTIVE'
        AND actor.valid_from <= now_at AND (actor.valid_until IS NULL OR actor.valid_until > now_at)
        AND subject.valid_from <= now_at AND (subject.valid_until IS NULL OR subject.valid_until > now_at)
      FOR SHARE OF p, actor, subject;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;

  IF p_guardian IS NOT NULL THEN
    -- A change to capacity appends a row with a foreign key to this person.
    -- Hold the person row so that a new latest capacity record cannot race this read.
    PERFORM 1 FROM core.people person WHERE person.person_id = p_subject FOR UPDATE;
    IF NOT FOUND OR core.current_civil_capacity(p_subject) IS DISTINCT FROM 'MINOR_VERIFIED' THEN RETURN false; END IF;
    PERFORM 1 FROM core.guardian_authorities guardian WHERE guardian.authority_id = p_guardian
      AND guardian.family_id = family AND guardian.guardian_person_id = caller AND guardian.subject_person_id = p_subject
      AND guardian.scope = 'IDENTITY' AND guardian.evidence_level = 'VERIFIED'
      AND guardian.lifecycle_status = 'ACTIVE' AND guardian.revoked_at IS NULL
      AND guardian.verified_by_principal_id IS NOT NULL AND nullif(btrim(guardian.evidence_ref),'') IS NOT NULL
      AND guardian.valid_from <= clock_timestamp() AND guardian.valid_until > clock_timestamp()
    FOR SHARE OF guardian;
    IF NOT FOUND THEN RETURN false; END IF;
  END IF;

  FOREACH case_id IN ARRAY p_cases LOOP
    PERFORM 1 FROM identity.cases c WHERE c.identity_case_id = case_id
      AND c.family_id = family AND c.subject_person_id = p_subject FOR SHARE OF c;
    IF NOT FOUND THEN RETURN false; END IF;
  END LOOP;
  RETURN auth.write_context_is_live();
END
$fn$;

CREATE FUNCTION identity.read_journey_member_profile(p_subject uuid,p_guardian uuid,p_cases uuid[],p_delegation uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
DECLARE
  output jsonb;
BEGIN
  IF identity.lock_journey_profile_access(p_subject,p_guardian,p_cases,p_delegation) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_PROFILE',p_subject,false,'PROFILE_SCOPE_DENIED');
    RETURN NULL;
  END IF;

  WITH episode_scope AS MATERIALIZED (
    SELECT e.episode_id, e.identity_case_id, e.started_on, e.ended_before, c.case_kind,
      CASE WHEN a.stay_term='NO_FIXED_EXPIRY' THEN
        identity.has_journey_transition_no_fixed_expiry(a.decision_id,e.episode_id)
      END AS verified_no_fixed_expiry,
      CASE WHEN c.case_kind='DEPENDANT' THEN
        identity.read_journey_sponsorship_summary(e.episode_id)
      END AS sponsorship
    FROM identity.journey_episodes e JOIN identity.cases c USING(identity_case_id)
    LEFT JOIN identity.journey_transition_attestations a ON a.decision_id=e.transition_decision_id
    WHERE e.identity_case_id = ANY(p_cases) AND e.started_on BETWEEN DATE '1000-01-01' AND DATE '9999-12-31'
      AND (e.ended_before IS NULL OR e.ended_before <= DATE '9999-12-31')
    ORDER BY e.started_on DESC, e.episode_id
    LIMIT 65 FOR SHARE OF e
  ), view_rows AS (
    SELECT e.episode_id,e.started_on,e.ended_before,e.case_kind,e.verified_no_fixed_expiry,e.sponsorship,
      (SELECT coalesce(jsonb_agg(to_jsonb(item) ORDER BY item.current DESC,item."on" DESC,item.kind),'[]')
        FROM (
          SELECT r.date_kind AS kind, r.date_basis AS basis, r.target_on AS "on", r.verification,
            (e.ended_before IS NULL OR NOT identity.journey_reminder_needs_open_episode(r.date_kind))
              AND NOT EXISTS (SELECT 1 FROM identity.journey_date_revisions successor
                WHERE successor.supersedes_id = r.date_revision_id) AS current
          FROM identity.journey_date_revisions r
          WHERE r.episode_id = e.episode_id AND r.identity_case_id = e.identity_case_id
            AND r.target_on BETWEEN DATE '1000-01-01' AND DATE '9999-12-31'
            AND (r.verification = 'REPORTED' OR r.document_id IS NOT NULL)
            AND (r.document_id IS NULL OR EXISTS (
              SELECT 1 FROM docs.documents d WHERE d.document_id = r.document_id
                AND d.family_id = auth.current_family_id() AND d.subject_person_id = p_subject
                AND d.data_class = 'IDENTITY_SENSITIVE' AND d.withdrawn_at IS NULL AND d.retention_until > clock_timestamp()
              FOR SHARE OF d))
            AND (r.official_fact_id IS NULL OR EXISTS (
              SELECT 1 FROM identity.external_facts f WHERE f.fact_id = r.official_fact_id
                AND f.identity_case_id = r.identity_case_id
                AND (r.date_kind <> 'APPROVAL_DATE' OR f.fact_kind = 'DECISION')))
            AND (r.date_kind <> 'STAY_EXPIRY' OR r.official_fact_id IS NULL OR EXISTS (
              SELECT 1 FROM identity.journey_renewal_attestations a WHERE a.decision_id = r.official_fact_id
                AND a.prior_revision_id = r.supersedes_id AND a.verified_target_on = r.target_on)
              OR identity.has_journey_transition_stay_source(
                r.official_fact_id,e.episode_id,r.identity_case_id,r.target_on,r.document_id,r.verified_by))
          ORDER BY current DESC,r.target_on DESC,r.date_revision_id
          LIMIT 97
        ) item) AS milestones
    FROM episode_scope e
  )
  SELECT jsonb_build_object('episodes',coalesce(jsonb_agg(jsonb_build_object(
      'path',CASE WHEN verified_no_fixed_expiry IS FALSE THEN NULL ELSE case_kind END,
      'startedOn',started_on,'endedBefore',ended_before,'milestones',milestones)
      || CASE WHEN verified_no_fixed_expiry THEN jsonb_build_object('stayTerm','NO_FIXED_EXPIRY') ELSE '{}'::jsonb END
      || CASE WHEN sponsorship IS NOT NULL THEN jsonb_build_object('sponsorship',sponsorship) ELSE '{}'::jsonb END
      ORDER BY ended_before IS NOT NULL,started_on DESC,episode_id),'[]'))
  INTO output FROM view_rows;

  IF identity.lock_journey_profile_access(p_subject,p_guardian,p_cases,p_delegation) IS NOT TRUE THEN
    PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_PROFILE',p_subject,false,'PROFILE_SCOPE_EXPIRED');
    RETURN NULL;
  END IF;
  PERFORM audit.record_write_decision('READ','IDENTITY_JOURNEY_PROFILE',p_subject,true,
    CASE WHEN p_delegation IS NOT NULL THEN 'DELEGATED_PROFILE_SCOPE_CURRENT' ELSE 'PROFILE_SCOPE_CURRENT' END);
  RETURN output;
END
$fn$;

-- Existing self and guardian callers cannot implicitly enter the delegation path.
CREATE FUNCTION identity.lock_journey_profile_access(p_subject uuid,p_guardian uuid,p_cases uuid[])
RETURNS boolean LANGUAGE sql SET search_path = pg_catalog
AS $fn$ SELECT identity.lock_journey_profile_access(p_subject,p_guardian,p_cases,NULL::uuid); $fn$;
CREATE FUNCTION identity.read_journey_member_profile(p_subject uuid,p_guardian uuid,p_cases uuid[])
RETURNS jsonb LANGUAGE sql SET search_path = pg_catalog
AS $fn$ SELECT identity.read_journey_member_profile(p_subject,p_guardian,p_cases,NULL::uuid); $fn$;

REVOKE ALL ON FUNCTION identity.lock_journey_profile_access(uuid,uuid,uuid[]),
  identity.lock_journey_profile_access(uuid,uuid,uuid[],uuid),
  identity.read_journey_member_profile(uuid,uuid,uuid[]),
  identity.read_journey_member_profile(uuid,uuid,uuid[],uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
