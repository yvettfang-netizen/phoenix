BEGIN;
-- Disposable PG16/17 test rollback ONLY. No shared environment.
DROP TABLE learning.askwise_evidence_inbox;
DROP TABLE learning.askwise_assignment_refs;
DROP TABLE learning.teaching_resource_course_uses;
DROP TABLE learning.teaching_resource_versions;
DROP TABLE learning.teaching_resources;
DROP TABLE service.education_document_uses;
DROP FUNCTION service.edc_enforce_private_use();
COMMIT;
