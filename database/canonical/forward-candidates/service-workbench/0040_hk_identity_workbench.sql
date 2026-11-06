BEGIN;

-- Development forward candidate only. This extends the existing workbench
-- settings contract for a Hong Kong identity workflow. It does not create a
-- customer, family, contract, payment, identity-provider or clinical master.
-- External government references remain source events owned by their systems.

ALTER TABLE service.workbench_settings
  DROP CONSTRAINT IF EXISTS workbench_settings_template_kind_check;
ALTER TABLE service.workbench_settings
  ADD CONSTRAINT workbench_settings_template_kind_check
  CHECK (template_kind IN ('HK_MASTERS','HK_IDENTITY','GENERAL'));

ALTER TABLE service.workbench_settings
  DROP CONSTRAINT IF EXISTS workbench_settings_current_stage_check;
ALTER TABLE service.workbench_settings
  ADD CONSTRAINT workbench_settings_current_stage_check
  CHECK (current_stage IN (
    'DISCOVERY','SCHOOL_SELECTION','MATERIALS','SUBMISSION','INTERVIEW',
    'DECISION','DEPOSIT','IDENTITY_ELIGIBILITY','IDENTITY_DOCUMENTS',
    'IDENTITY_SUBMISSION','IDENTITY_APPOINTMENT','IDENTITY_DECISION',
    'IDENTITY_COMPLETION','CLOSED'
  ));

CREATE FUNCTION service.validate_identity_workbench_template() RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,service,pg_temp AS $fn$
BEGIN
  IF NEW.template_kind='HK_IDENTITY' AND NOT EXISTS (
    SELECT FROM service.projects p
    WHERE p.service_project_id=NEW.service_project_id
      AND p.primary_domain='IDENTITY'
  ) THEN
    RAISE EXCEPTION 'IDENTITY_TEMPLATE_DOMAIN_MISMATCH';
  END IF;
  IF NEW.template_kind='HK_IDENTITY' AND NEW.current_stage NOT IN (
    'IDENTITY_ELIGIBILITY','IDENTITY_DOCUMENTS','IDENTITY_SUBMISSION',
    'IDENTITY_APPOINTMENT','IDENTITY_DECISION','IDENTITY_COMPLETION','CLOSED'
  ) THEN
    RAISE EXCEPTION 'IDENTITY_TEMPLATE_STAGE_MISMATCH';
  END IF;
  IF NEW.template_kind<>'HK_IDENTITY' AND NEW.current_stage IN (
    'IDENTITY_ELIGIBILITY','IDENTITY_DOCUMENTS','IDENTITY_SUBMISSION',
    'IDENTITY_APPOINTMENT','IDENTITY_DECISION','IDENTITY_COMPLETION'
  ) THEN
    RAISE EXCEPTION 'IDENTITY_STAGE_TEMPLATE_MISMATCH';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS workbench_identity_template_guard ON service.workbench_settings;
CREATE TRIGGER workbench_identity_template_guard
  BEFORE INSERT OR UPDATE ON service.workbench_settings
  FOR EACH ROW EXECUTE FUNCTION service.validate_identity_workbench_template();

REVOKE ALL ON FUNCTION service.validate_identity_workbench_template() FROM PUBLIC;

-- Private Staging staff guard. The workbench role deliberately has no direct
-- table SELECT on Canonical project tables; this narrow SECURITY DEFINER
-- predicate lets the separately composed private-staging adapter close a
-- mixed HEALTH project before it invokes a staff projection or command.
CREATE FUNCTION service.workbench_staging_staff_mixed_health(p_project uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,auth,service,pg_temp AS $fn$
 SELECT auth.current_channel()='ADVISOR'
    AND EXISTS(
      SELECT FROM service.projects p
      WHERE (p_project IS NULL OR p.service_project_id=p_project)
        AND p.primary_domain<>'HEALTH'
        AND EXISTS(
          SELECT FROM service.project_domains d
          WHERE d.service_project_id=p.service_project_id
            AND d.business_domain='HEALTH'
        )
        AND service.workbench_staff(p.service_project_id)
    )
$fn$;
REVOKE ALL ON FUNCTION service.workbench_staging_staff_mixed_health(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION service.workbench_staging_staff_mixed_health(uuid)
  TO phoenix_canonical_service_workbench;

COMMIT;
