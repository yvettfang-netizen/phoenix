-- Review candidate for isolated PostgreSQL only.
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^phoenix_identity_journey_synthetic_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END
$guard$;

-- This is an identity-tab projection over the append-only source, not an
-- additional global Timeline event type or a second history table. The caller
-- must lock independent IDENTITY_READ authority within the same transaction.
CREATE FUNCTION identity.list_journey_stay_timeline(
  p_family uuid, p_case uuid, p_recipient uuid, p_limit integer
) RETURNS TABLE (record_id uuid, valid_until date, recorded_at timestamptz, is_current boolean)
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'INVALID_TIMELINE_LIMIT'; END IF;
  IF NOT identity.lock_journey_station_self_scope(p_family, p_case, p_recipient) THEN RETURN; END IF;

  RETURN QUERY SELECT r.date_revision_id, r.target_on, coalesce(a.verified_at, r.recorded_at),
    e.ended_before IS NULL AND NOT EXISTS (
      SELECT 1 FROM identity.journey_date_revisions successor WHERE successor.supersedes_id = r.date_revision_id
    ) AS active
    FROM identity.journey_date_revisions r
    JOIN identity.journey_episodes e USING (episode_id, identity_case_id)
    JOIN identity.cases c USING (identity_case_id)
    JOIN docs.documents document ON document.document_id = r.document_id
    LEFT JOIN identity.journey_renewal_attestations a ON a.decision_id = r.official_fact_id
    WHERE r.identity_case_id = p_case AND c.family_id = p_family
      AND r.date_kind = 'STAY_EXPIRY' AND r.date_basis = 'CASE_APPROVAL' AND r.verification = 'VERIFIED'
      AND isfinite(r.target_on)
      AND document.family_id = p_family AND document.subject_person_id = c.subject_person_id
      AND document.data_class = 'IDENTITY_SENSITIVE' AND document.withdrawn_at IS NULL
      AND document.retention_until > clock_timestamp()
      AND (r.official_fact_id IS NULL OR (a.prior_revision_id = r.supersedes_id AND a.verified_target_on = r.target_on))
    ORDER BY active DESC, coalesce(a.verified_at, r.recorded_at) DESC, r.date_revision_id DESC
    LIMIT p_limit
    FOR SHARE OF document, e;
END
$fn$;
REVOKE ALL ON FUNCTION identity.list_journey_stay_timeline(uuid,uuid,uuid,integer)
  FROM PUBLIC, phoenix_canonical_app, phoenix_canonical_reader;
COMMIT;
