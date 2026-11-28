-- Isolated review candidate. A sponsorship fact never confers access.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

CREATE TABLE identity.journey_sponsorship_facts (
  sponsorship_fact_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(sponsorship_fact_id)),
  identity_case_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  sponsor_person_id uuid REFERENCES core.people,
  effective_on date NOT NULL CHECK (effective_on BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'),
  document_version_id uuid NOT NULL REFERENCES docs.document_versions,
  supersedes_id uuid UNIQUE,
  verified_by uuid NOT NULL REFERENCES auth.principals,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (episode_id,identity_case_id) REFERENCES identity.journey_episodes(episode_id,identity_case_id),
  UNIQUE (sponsorship_fact_id,identity_case_id,episode_id),
  FOREIGN KEY (supersedes_id,identity_case_id,episode_id)
    REFERENCES identity.journey_sponsorship_facts(sponsorship_fact_id,identity_case_id,episode_id),
  UNIQUE (episode_id,document_version_id,effective_on),
  CHECK (supersedes_id IS NULL OR supersedes_id <> sponsorship_fact_id),
  CHECK (sponsor_person_id IS NOT NULL OR supersedes_id IS NOT NULL)
);
CREATE UNIQUE INDEX journey_sponsorship_first_fact_idx ON identity.journey_sponsorship_facts(episode_id)
  WHERE supersedes_id IS NULL;
CREATE INDEX journey_sponsorship_episode_idx ON identity.journey_sponsorship_facts(episode_id,supersedes_id);
ALTER TABLE identity.journey_sponsorship_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.journey_sponsorship_facts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON identity.journey_sponsorship_facts
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
CREATE TRIGGER journey_sponsorship_fact_immutable BEFORE UPDATE OR DELETE
  ON identity.journey_sponsorship_facts FOR EACH ROW EXECUTE FUNCTION identity.reject_journey_evidence_rewrite();

-- Trusted adviser adapter only. It must verify the applicant's source and how
-- its named sponsor resolves to the existing person. Null sponsor records an
-- explicit evidenced end, never an unverified or omitted sponsor.
CREATE FUNCTION identity.record_journey_sponsorship(
  p_change uuid,p_case uuid,p_episode uuid,p_sponsor uuid,p_effective_on date,p_document_version uuid,p_supersedes uuid
) RETURNS uuid
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  evidence record;
  target_case identity.cases%ROWTYPE;
  stage identity.journey_episodes%ROWTYPE;
  head identity.journey_sponsorship_facts%ROWTYPE;
  recorded identity.journey_sponsorship_facts%ROWTYPE;
  scope_until timestamptz;
  sponsor_until timestamptz;
BEGIN
  IF auth.current_channel() IS DISTINCT FROM 'ADVISOR' OR auth.write_context_is_live() IS NOT TRUE
    OR core.is_uuid_v7(p_change) IS NOT TRUE OR p_effective_on IS NULL
    OR p_effective_on NOT BETWEEN DATE '1900-01-01' AND (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date
    OR p_change = p_supersedes OR (p_sponsor IS NULL AND p_supersedes IS NULL)
  THEN RETURN NULL; END IF;
  SELECT * INTO evidence FROM identity.lock_journey_residence_evidence(p_case,p_document_version);
  IF NOT FOUND THEN RETURN NULL; END IF;
  scope_until := evidence.valid_until;
  SELECT * INTO target_case FROM identity.cases WHERE identity_case_id=p_case AND case_kind='DEPENDANT';
  IF NOT FOUND OR p_sponsor=target_case.subject_person_id THEN RETURN NULL; END IF;
  PERFORM 1 FROM docs.documents d WHERE d.document_id=evidence.document_id
    AND d.document_kind='HK_DEPENDANT_SPONSORSHIP_RECORD';
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF p_sponsor IS NOT NULL THEN
    SELECT least(coalesce(member.valid_until,'infinity'::timestamptz),g.expires_at) INTO sponsor_until
    FROM core.family_memberships member JOIN consent.grants g
      ON g.family_id=member.family_id AND g.subject_person_id=member.person_id
    WHERE member.family_id=target_case.family_id AND member.person_id=p_sponsor
      AND member.valid_from<=clock_timestamp() AND (member.valid_until IS NULL OR member.valid_until>clock_timestamp())
      AND g.grantor_person_id=p_sponsor AND g.grantee_person_id=auth.current_actor_person_id()
      AND g.purpose='IDENTITY_CASE' AND g.data_class='IDENTITY_SENSITIVE'
      AND g.status='ACTIVE' AND g.withdrawn_at IS NULL AND g.granted_at<=clock_timestamp()
      AND g.expires_at>clock_timestamp()
    FOR SHARE OF member,g;
    IF NOT FOUND THEN RETURN NULL; END IF;
    scope_until := least(scope_until,sponsor_until);
  END IF;

  SELECT * INTO stage FROM identity.journey_episodes WHERE episode_id=p_episode AND identity_case_id=p_case FOR UPDATE;
  IF NOT FOUND OR p_effective_on < stage.started_on OR scope_until <= clock_timestamp()
    OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  SELECT * INTO recorded FROM identity.journey_sponsorship_facts
    WHERE episode_id=p_episode AND document_version_id=p_document_version AND effective_on=p_effective_on;
  IF FOUND THEN
    IF recorded.sponsor_person_id IS NOT DISTINCT FROM p_sponsor
      AND recorded.supersedes_id IS NOT DISTINCT FROM p_supersedes
      AND recorded.verified_by=auth.current_principal_id()
    THEN RETURN recorded.sponsorship_fact_id; END IF;
    RETURN NULL;
  END IF;
  IF stage.ended_before IS NOT NULL THEN RETURN NULL; END IF;
  SELECT * INTO head FROM identity.journey_sponsorship_facts f WHERE f.episode_id=p_episode
    AND NOT EXISTS (
      SELECT 1 FROM identity.journey_sponsorship_facts successor WHERE successor.supersedes_id=f.sponsorship_fact_id
    );
  IF head.sponsorship_fact_id IS DISTINCT FROM p_supersedes OR head.effective_on>p_effective_on
    OR (p_sponsor IS NULL AND head.sponsor_person_id IS NULL)
  THEN RETURN NULL; END IF;
  IF scope_until <= clock_timestamp() OR auth.write_context_is_live() IS NOT TRUE THEN RETURN NULL; END IF;
  INSERT INTO identity.journey_sponsorship_facts(
    sponsorship_fact_id,identity_case_id,episode_id,sponsor_person_id,effective_on,document_version_id,supersedes_id,verified_by
  ) VALUES(p_change,p_case,p_episode,p_sponsor,p_effective_on,p_document_version,p_supersedes,auth.current_principal_id());
  PERFORM audit.record_write_decision('VERIFY','IDENTITY_JOURNEY_SPONSORSHIP',p_change,true,'SPONSORSHIP_FACT_RECORDED');
  RETURN p_change;
END
$fn$;

-- Called by the already-authorized member projection. If the most recent
-- evidence is withdrawn, never fall back to a former sponsor or state.
CREATE FUNCTION identity.read_journey_sponsorship_summary(p_episode uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog
AS $fn$
DECLARE
  summary jsonb;
BEGIN
  SELECT jsonb_build_object('effectiveOn',f.effective_on,
    'status',CASE WHEN f.sponsor_person_id IS NULL THEN 'ENDED' ELSE 'RECORDED' END)
  INTO summary
  FROM identity.journey_sponsorship_facts f
  JOIN identity.journey_episodes e USING (episode_id,identity_case_id)
  JOIN identity.cases c USING (identity_case_id)
  JOIN docs.document_versions v ON v.version_id=f.document_version_id
  JOIN docs.documents d USING (document_id)
  WHERE f.episode_id=p_episode AND c.case_kind='DEPENDANT' AND c.family_id=auth.current_family_id()
    AND auth.current_channel()='FAMILY' AND auth.write_context_is_live() IS TRUE
    AND f.effective_on>=e.started_on
    AND (e.ended_before IS NULL OR f.effective_on<e.ended_before
      OR (f.sponsor_person_id IS NULL AND f.effective_on=e.ended_before))
    AND d.family_id=c.family_id AND d.subject_person_id=c.subject_person_id AND d.data_class='IDENTITY_SENSITIVE'
    AND d.document_kind='HK_DEPENDANT_SPONSORSHIP_RECORD' AND d.withdrawn_at IS NULL AND d.retention_until>clock_timestamp()
    AND NOT EXISTS (
      SELECT 1 FROM identity.journey_sponsorship_facts successor WHERE successor.supersedes_id=f.sponsorship_fact_id
    )
  FOR SHARE OF d;
  RETURN summary;
END
$fn$;

REVOKE ALL ON FUNCTION identity.record_journey_sponsorship(uuid,uuid,uuid,uuid,date,uuid,uuid),
  identity.read_journey_sponsorship_summary(uuid)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader, phoenix_canonical_service_workbench;
COMMIT;
