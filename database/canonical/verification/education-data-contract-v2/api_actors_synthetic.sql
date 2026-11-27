BEGIN;
-- Disposable-cluster actors only. Applied after synthetic.sql.
INSERT INTO core.people(person_id,display_name) VALUES
 ('01940000-0000-7000-8000-000000000003','Synthetic Guardian A'),
 ('01940000-0000-7000-8000-000000000010','Synthetic Advisor A');
INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES
 ('01940000-0000-7000-8000-000000001001','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','MEMBER',now()-interval '1 day'),
 ('01940000-0000-7000-8000-000000001002','01940000-0000-7000-8000-000000000101','01940000-0000-7000-8000-000000000002','MEMBER',now()-interval '1 day'),
 ('01940000-0000-7000-8000-000000001003','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000003','MEMBER',now()-interval '1 day');
INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES
 ('01940000-0000-7000-8000-000000000201','01940000-0000-7000-8000-000000000001','FAMILY','ACTIVE'),
 ('01940000-0000-7000-8000-000000000202','01940000-0000-7000-8000-000000000002','FAMILY','ACTIVE'),
 ('01940000-0000-7000-8000-000000000203','01940000-0000-7000-8000-000000000003','FAMILY','ACTIVE'),
 ('01940000-0000-7000-8000-000000000210','01940000-0000-7000-8000-000000000010','ADVISOR','ACTIVE');
INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,evidence_level,scope,valid_from,valid_until)
VALUES ('01940000-0000-7000-8000-000000001303','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000003','01940000-0000-7000-8000-000000000001','VERIFIED','EDUCATION',now()-interval '1 day',now()+interval '2 days');
INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status)
VALUES ('01940000-0000-7000-8000-000000001250','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','Synthetic case A','OPEN');
INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
VALUES ('01940000-0000-7000-8000-000000001260','01940000-0000-7000-8000-000000001250','01940000-0000-7000-8000-000000000010',now()-interval '1 day',now()+interval '2 days');
INSERT INTO service.project_assignments(project_assignment_id,service_project_id,principal_id,assignment_role,status,valid_from,assigned_by_principal_id) VALUES
 ('01940000-0000-7000-8000-000000001330','01940000-0000-7000-8000-000000000300','01940000-0000-7000-8000-000000000210','SPECIALIST','ACTIVE',now()-interval '1 day','01940000-0000-7000-8000-000000000900'),
 ('01940000-0000-7000-8000-000000001331','01940000-0000-7000-8000-000000000301','01940000-0000-7000-8000-000000000210','SPECIALIST','ACTIVE',now()-interval '1 day','01940000-0000-7000-8000-000000000900');

INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at)
SELECT ('01940000-0000-7000-8000-'||lpad(x.n::text,12,'0'))::uuid,
  f.family_id,f.subject,f.grantee,f.subject,f.purpose,'EDUCATION','ACTIVE',now()-interval '1 hour',now()+interval '2 days'
FROM (
 VALUES
  (1401,100,1,1,'DOCUMENT_READ'),(1402,100,1,1,'EDUCATION_CASE'),
  (1403,100,1,3,'DOCUMENT_READ'),(1404,100,1,3,'EDUCATION_CASE'),
  (1405,100,1,10,'DOCUMENT_READ'),(1406,100,1,10,'EDUCATION_CASE'),
  (1411,101,2,2,'DOCUMENT_READ'),(1412,101,2,2,'EDUCATION_CASE')
) AS x(n,fam,subj,grantee,mode)
CROSS JOIN LATERAL (
 SELECT ('01940000-0000-7000-8000-'||lpad(x.fam::text,12,'0'))::uuid AS family_id,
        ('01940000-0000-7000-8000-'||lpad(x.subj::text,12,'0'))::uuid AS subject,
        ('01940000-0000-7000-8000-'||lpad(x.grantee::text,12,'0'))::uuid AS grantee,
        x.mode::text AS purpose
) f;

-- Project 303 has no existing document use, so the API must create one.
INSERT INTO service.projects(service_project_id,client_id,family_id,project_code,project_name,project_status,primary_domain,created_by_principal_id,updated_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000303','01940000-0000-7000-8000-000000000500','01940000-0000-7000-8000-000000000100','EDC-PROJECT-A3','Synthetic A3','ACTIVE','EDUCATION','01940000-0000-7000-8000-000000000900','01940000-0000-7000-8000-000000000900');
INSERT INTO service.project_subjects(project_subject_id,service_project_id,family_id,subject_person_id,subject_role,data_scope,created_by_principal_id)
VALUES ('01940000-0000-7000-8000-000000000803','01940000-0000-7000-8000-000000000303','01940000-0000-7000-8000-000000000100','01940000-0000-7000-8000-000000000001','SERVICE_RECIPIENT','EDUCATION','01940000-0000-7000-8000-000000000900');
COMMIT;
