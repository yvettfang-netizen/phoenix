BEGIN;
-- Entirely synthetic fixtures. Run only in an owned disposable PostgreSQL cluster.
INSERT INTO core.families(family_id,display_name) VALUES
 ('01940000-0000-7000-8000-000000000100','EDC Family A'),
 ('01940000-0000-7000-8000-000000000101','EDC Family B');
INSERT INTO core.people(person_id,display_name) VALUES
 ('01940000-0000-7000-8000-000000000001','EDC Student A'),
 ('01940000-0000-7000-8000-000000000002','EDC Student B');
INSERT INTO core.student_profiles(person_id) VALUES
 ('01940000-0000-7000-8000-000000000001'),
 ('01940000-0000-7000-8000-000000000002');
INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label)
VALUES ('01940000-0000-7000-8000-000000000900',NULL,'SERVICE','ACTIVE','canonical_service_v2');
INSERT INTO crm.clients(client_id,family_id,client_code,lifecycle_status,relationship_started_at,created_by_principal_id,updated_by_principal_id) VALUES
 ('01940000-0000-7000-8000-000000000500','01940000-0000-7000-8000-000000000100','EDC_CLIENT_A','ACTIVE',now()-interval '1 day','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000501','01940000-0000-7000-8000-000000000101','EDC_CLIENT_B','ACTIVE',now()-interval '1 day','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900');
INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id) VALUES
 ('01940000-0000-7000-8000-000000000300','01940000-0000-7000-8000-000000000500','01940000-0000-7000-8000-000000000100','EDC-PROJECT-A1','Synthetic A1','ACTIVE','EDUCATION','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000301','01940000-0000-7000-8000-000000000500','01940000-0000-7000-8000-000000000100','EDC-PROJECT-A2','Synthetic A2','ACTIVE','EDUCATION','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000302','01940000-0000-7000-8000-000000000501','01940000-0000-7000-8000-000000000101','EDC-PROJECT-B','Synthetic B','ACTIVE','EDUCATION','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900');
INSERT INTO service.project_subjects(project_subject_id,service_project_id,family_id,subject_person_id,subject_role,data_scope,created_by_principal_id) VALUES
 ('01940000-0000-7000-8000-000000000800','01940000-0000-7000-8000-000000000300','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','SERVICE_RECIPIENT','EDUCATION','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000801','01940000-0000-7000-8000-000000000301','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','SERVICE_RECIPIENT','EDUCATION','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000802','01940000-0000-7000-8000-000000000302','01940000-0000-7000-8000-000000000101','01940000-0000-7000-8000-000000000002','SERVICE_RECIPIENT','EDUCATION','01940000-0000-7000-8000-000000000900');
INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
VALUES ('01940000-0000-7000-8000-000000000701','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','EDUCATION','SYNTHETIC_TRANSCRIPT',now()+interval '7 days');
INSERT INTO docs.document_versions(version_id,document_id,version_no,content_sha256,storage_key,size_bytes)
VALUES ('01940000-0000-7000-8000-000000000702','01940000-0000-7000-8000-000000000701',1,repeat('a',64),'edc-synthetic-storage-only',11);
INSERT INTO service.education_document_uses(use_id,service_project_id,version_id,family_id,subject_person_id,purpose_code,requested_by_principal_id) VALUES
 ('01940000-0000-7000-8000-000000000730','01940000-0000-7000-8000-000000000300','01940000-0000-7000-8000-000000000702','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','EDUCATION_APPLICATION','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000000731','01940000-0000-7000-8000-000000000301','01940000-0000-7000-8000-000000000702','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','EDUCATION_APPLICATION','01940000-0000-7000-8000-000000000900');

DO $checks$
BEGIN
 IF (SELECT count(*) FROM service.education_document_uses WHERE version_id='01940000-0000-7000-8000-000000000702')<>2
 OR (SELECT count(*) FROM service.education_document_uses WHERE review_status='PENDING_REVIEW')<>2 THEN
  RAISE EXCEPTION 'D01_D02_CROSS_PROJECT_PENDING_FAILED';
 END IF;
 BEGIN
  INSERT INTO service.education_document_uses(use_id,service_project_id,version_id,family_id,subject_person_id,purpose_code,requested_by_principal_id)
  VALUES ('01940000-0000-7000-8000-000000000732','01940000-0000-7000-8000-000000000302','01940000-0000-7000-8000-000000000702','01940000-0000-7000-8000-000000000101','01940000-0000-7000-8000-000000000002','EDUCATION_APPLICATION','01940000-0000-7000-8000-000000000900');
  RAISE EXCEPTION 'D03_CROSS_FAMILY_NOT_DENIED';
 EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END $checks$;

INSERT INTO learning.course(course_id,course_code,title,status,created_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000710','EDC-SYNTH','Synthetic EDC course','PUBLISHED','01940000-0000-7000-8000-000000000900');
INSERT INTO learning.course_version(course_version_id,course_id,version_no,effective_from,effective_until,status,created_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000711','01940000-0000-7000-8000-000000000710',1,now()-interval '1 day',now()+interval '7 days','ACTIVE','01940000-0000-7000-8000-000000000900');
INSERT INTO learning.enrollment(enrollment_id,family_id,student_person_id,course_version_id,status,created_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000712','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','01940000-0000-7000-8000-000000000711','ACTIVE','01940000-0000-7000-8000-000000000900');
INSERT INTO learning.teaching_resources(resource_id,kind,title,rights_holder,created_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000740','TEACHER_GUIDE','Synthetic guide','Synthetic license','01940000-0000-7000-8000-000000000900');
INSERT INTO learning.teaching_resource_versions(resource_version_id,resource_id,version_no,content_digest,license_digest,licensed_until)
VALUES ('01940000-0000-7000-8000-000000000741','01940000-0000-7000-8000-000000000740',1,repeat('b',64),repeat('c',64),now()+interval '5 days');
INSERT INTO learning.teaching_resource_course_uses(resource_version_id,course_version_id)
VALUES ('01940000-0000-7000-8000-000000000741','01940000-0000-7000-8000-000000000711');
INSERT INTO learning.askwise_assignment_refs(assignment_ref_id,source_system,source_assignment_id,source_version,student_person_id,family_id,enrollment_id,source_digest,expires_at)
VALUES ('01940000-0000-7000-8000-000000000750','PHOENIX_ACADEMY','EDC-SYN-ASSIGN-01',1,'01940000-0000-7000-8000-000000000001','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000712',repeat('d',64),now()+interval '1 hour');
INSERT INTO learning.askwise_evidence_inbox(event_id,assignment_ref_id,source_system,source_event_id,source_version,evidence_revision,summary_digest)
VALUES ('01940000-0000-7000-8000-000000000751','01940000-0000-7000-8000-000000000750','ASKWISE','EDC-SYN-EVENT-01',1,1,repeat('e',64));

DO $checks$
DECLARE t text; r text;
BEGIN
 IF (SELECT count(*) FROM learning.teaching_resource_course_uses)<>1 THEN RAISE EXCEPTION 'D06_SHARED_METADATA_FAILED'; END IF;
 IF (SELECT count(*) FROM learning.askwise_evidence_inbox WHERE processing_state='PENDING_REVIEW')<>1 THEN RAISE EXCEPTION 'A05_EVIDENCE_NOT_PENDING'; END IF;
 BEGIN
  INSERT INTO learning.askwise_evidence_inbox(event_id,assignment_ref_id,source_system,source_event_id,source_version,evidence_revision,summary_digest)
  VALUES ('01940000-0000-7000-8000-000000000752','01940000-0000-7000-8000-000000000750','ASKWISE','EDC-SYN-EVENT-01',1,1,repeat('f',64));
  RAISE EXCEPTION 'A04_CONFLICT_NOT_DENIED';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 FOREACH t IN ARRAY ARRAY['service.education_document_uses','learning.teaching_resources','learning.teaching_resource_versions','learning.teaching_resource_course_uses','learning.askwise_assignment_refs','learning.askwise_evidence_inbox'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=t::regclass AND relrowsecurity AND relforcerowsecurity) THEN
   RAISE EXCEPTION 'RLS_FORCE_MISSING %',t;
  END IF;
  FOREACH r IN ARRAY ARRAY['phoenix_canonical_app','phoenix_canonical_reader','phoenix_canonical_context_binder'] LOOP
   IF has_table_privilege(r,t,'SELECT') OR has_table_privilege(r,t,'INSERT') THEN
    RAISE EXCEPTION 'DIRECT_ACCESS_NOT_DENIED % %',r,t;
   END IF;
  END LOOP;
 END LOOP;
END $checks$;
COMMIT;
