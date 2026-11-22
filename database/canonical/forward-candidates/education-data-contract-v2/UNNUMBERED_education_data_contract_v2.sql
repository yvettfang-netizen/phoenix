BEGIN;
-- EDC V2 unnumbered DRAFT; not a formal migration and not approved for installation.
-- No app writes, published resources, real students, SQLite, identity or new sessions.

CREATE TABLE service.education_document_uses (
 use_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(use_id)),
 service_project_id uuid NOT NULL REFERENCES service.projects,
 version_id uuid NOT NULL REFERENCES docs.document_versions,
 family_id uuid NOT NULL REFERENCES core.families,
 subject_person_id uuid NOT NULL REFERENCES core.people,
 purpose_code text NOT NULL CHECK (purpose_code IN ('EDUCATION_APPLICATION','EDUCATION_SUPPORT')),
 review_status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (review_status='PENDING_REVIEW'),
 requested_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE (service_project_id,version_id,purpose_code)
);

CREATE FUNCTION service.edc_enforce_private_use() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,service,docs,core,pg_temp AS $fn$
BEGIN
 IF NOT EXISTS (
  SELECT 1
  FROM docs.document_versions v
  JOIN docs.documents d ON d.document_id=v.document_id
  JOIN service.projects p ON p.service_project_id=NEW.service_project_id
  JOIN service.project_subjects s ON s.service_project_id=p.service_project_id
    AND s.subject_person_id=d.subject_person_id AND s.family_id=d.family_id
  WHERE v.version_id=NEW.version_id
    AND d.family_id=NEW.family_id AND d.subject_person_id=NEW.subject_person_id
    AND p.family_id=d.family_id
    AND p.primary_domain IN ('EDUCATION','MULTI_DOMAIN')
    AND p.project_status IN ('PLANNED','ACTIVE','ON_HOLD')
    AND s.data_scope='EDUCATION'
    AND s.status='ACTIVE' AND s.valid_from<=clock_timestamp()
    AND (s.valid_until IS NULL OR s.valid_until>clock_timestamp())
    AND d.data_class IN ('GENERAL','EDUCATION')
    AND d.withdrawn_at IS NULL AND d.retention_until>clock_timestamp()
 ) THEN
  RAISE EXCEPTION 'EDC_PRIVATE_PROJECT_SCOPE_DENIED' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION service.edc_enforce_private_use() FROM PUBLIC;
CREATE TRIGGER edc_private_scope BEFORE INSERT ON service.education_document_uses
 FOR EACH ROW EXECUTE FUNCTION service.edc_enforce_private_use();
CREATE TRIGGER edc_private_immutable BEFORE UPDATE OR DELETE ON service.education_document_uses
 FOR EACH ROW EXECUTE FUNCTION service.reject_event_change();

-- Metadata only. Public teaching resources are not docs.documents, which
-- requires a real family_id and subject_person_id.
CREATE TABLE learning.teaching_resources (
 resource_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(resource_id)),
 kind text NOT NULL CHECK (kind IN ('COURSE_MATERIAL','LESSON_PLAN','QUESTION_TEMPLATE','TEACHER_GUIDE')),
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
 rights_holder text NOT NULL CHECK (length(btrim(rights_holder)) BETWEEN 1 AND 200),
 created_by_principal_id uuid NOT NULL REFERENCES auth.principals
);
CREATE TABLE learning.teaching_resource_versions (
 resource_version_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(resource_version_id)),
 resource_id uuid NOT NULL REFERENCES learning.teaching_resources,
 version_no integer NOT NULL CHECK (version_no>0),
 content_digest char(64) NOT NULL CHECK(content_digest ~ '^[0-9a-f]{64}$'),
 license_digest char(64) NOT NULL CHECK(license_digest ~ '^[0-9a-f]{64}$'),
 licensed_until timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status='DRAFT'),
 UNIQUE(resource_id,version_no)
);
CREATE TABLE learning.teaching_resource_course_uses (
 resource_version_id uuid NOT NULL REFERENCES learning.teaching_resource_versions,
 course_version_id uuid NOT NULL REFERENCES learning.course_version,
 status text NOT NULL DEFAULT 'PROPOSED' CHECK(status='PROPOSED'),
 PRIMARY KEY(resource_version_id,course_version_id)
);
CREATE TRIGGER edc_resource_version_immutable BEFORE UPDATE OR DELETE
 ON learning.teaching_resource_versions FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();

-- ASKWISE source remains its engine; Canonical may only receive mapped refs
-- and minimized digest evidence in PENDING state. No raw student answers.
CREATE TABLE learning.askwise_assignment_refs (
 assignment_ref_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(assignment_ref_id)),
 source_system text NOT NULL CHECK(source_system IN ('PHOENIX_ACADEMY','PHOENIX_DIRECT')),
 source_assignment_id text NOT NULL CHECK(length(btrim(source_assignment_id)) BETWEEN 8 AND 160),
 source_version bigint NOT NULL CHECK(source_version>0),
 student_person_id uuid NOT NULL REFERENCES core.student_profiles(person_id),
 family_id uuid REFERENCES core.families,
 enrollment_id uuid,
 source_digest char(64) NOT NULL CHECK(source_digest ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'PENDING_AUTHORIZATION' CHECK(status='PENDING_AUTHORIZATION'),
 UNIQUE(source_system,source_assignment_id,source_version),
 FOREIGN KEY(enrollment_id,family_id,student_person_id)
   REFERENCES learning.enrollment(enrollment_id,family_id,student_person_id),
 CHECK(enrollment_id IS NULL OR family_id IS NOT NULL)
);
CREATE TABLE learning.askwise_evidence_inbox (
 event_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(event_id)),
 assignment_ref_id uuid NOT NULL REFERENCES learning.askwise_assignment_refs,
 source_system text NOT NULL CHECK(source_system='ASKWISE'),
 source_event_id text NOT NULL CHECK(length(btrim(source_event_id)) BETWEEN 8 AND 160),
 source_version bigint NOT NULL CHECK(source_version>0),
 evidence_revision integer NOT NULL CHECK(evidence_revision>0),
 summary_digest char(64) NOT NULL CHECK(summary_digest ~ '^[0-9a-f]{64}$'),
 processing_state text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(processing_state='PENDING_REVIEW'),
 UNIQUE(source_system,source_event_id,source_version)
);
CREATE TRIGGER edc_askwise_assignment_immutable BEFORE UPDATE OR DELETE
 ON learning.askwise_assignment_refs FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();
CREATE TRIGGER edc_askwise_inbox_immutable BEFORE UPDATE OR DELETE
 ON learning.askwise_evidence_inbox FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();

-- Zero runtime policies/grants. Even after a successful synthetic DDL test,
-- there is no way for app/reader/binder to access new tables.
DO $rls$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['education_document_uses'] LOOP
  EXECUTE format('ALTER TABLE service.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('ALTER TABLE service.%I FORCE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON service.%I FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder',tbl);
 END LOOP;
 FOREACH tbl IN ARRAY ARRAY['teaching_resources','teaching_resource_versions','teaching_resource_course_uses','askwise_assignment_refs','askwise_evidence_inbox'] LOOP
  EXECUTE format('ALTER TABLE learning.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('ALTER TABLE learning.%I FORCE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON learning.%I FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder',tbl);
 END LOOP;
END $rls$;
COMMIT;
