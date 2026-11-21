# Canonical reuse and gap matrix

Evidence is **source-code evidence**, not proof of a deployed table. Formal migration files 0001–0037 are present and immutable on `main@9db147ac`. 0038/0039 live under `forward-candidates/service-workbench/` and are not formal migrations.

| Exact current authority | Verified in formal source | P0 reuse | Remaining gap / status |
| --- | --- | --- | --- |
| `core.people`, `core.student_profiles`, `core.families`, `core.family_memberships`, `core.guardian_authorities` (0003) | YES | One student/family/guardian identity and relationship check | Trusted real identity and device/session handoff HOLD |
| `auth.principals`, `auth.session_contexts` (0003), `auth.context_exchange_tickets` (0007), `auth.external_identities` (0017) | YES | One principal, broker ticket, bounded DB context | Multi-capability selector must prove current actor; no second context table PROPOSED |
| `consent.grants` and `learning.has_learning_consent` (0022) | YES | Purpose `LEARNING_RECORD`; check withdrawal/expiry on sensitive reads | Student assent and Guardian consent evidence at real integration HOLD |
| `learning.course`, `course_version`, `teacher`, `class`, `enrollment`, `teacher_assignment`, `enrollment_class` (0022) | YES | Existing catalogue, classes and student enrolment | Package purchase/activation and per-slot booking missing; PROPOSED |
| `learning.schedule_slot`, `attendance_record`, `attendance_correction` (0022) | YES | Teaching slots and append-only attendance correction | 0022 exclusion prevents teacher overlap only; student/room and mixed-mode collisions missing; PROPOSED |
| `learning.after_class_card`, `publication`, `stage_report` (0022) | YES | Teacher evidence and family-visible publication | Unified growth timeline, assessment provenance and access-specific projection missing; PROPOSED |
| `education.academic_record`, `score_record`, `language_test`, `plan` (0019) | YES | Existing academic and language facts, with source | No CAT4/DSE/A-Level/IELTS/JLPT/Cantonese instrument version, score-scale and attempt authority; PROPOSED |
| `education.study_enrollments` | **NO: no CREATE TABLE in 0001–0037** | None | Do not substitute it for `learning.enrollment`; source/need must be decided separately; HOLD |
| `operations_ref.entitlement_ref`, `entitlement_event` (0021) | YES | Bounded reference to externally approved entitlement | Not a payment, refund, lesson-hour or payroll ledger; commercial source HOLD |
| `service.projects`, `project_assignments` (0028 onward) | YES | Existing service scope and staff assignments | Do not use project activation as proof of a paid lesson package; PROPOSED |
| `core.organizations` (0026) | YES | Current institution facts, if actually needed | No franchise-school/multi-company tenant extension for Academic Studio; Founder decision |
| Service Workbench 0038/0039 | CANDIDATE ONLY | Keep independent | No implicit Academy dependency or installation |
| PR #77 0042 | CANDIDATE ONLY | Re-review only | Present form HOLD; see [0042 review](CANDIDATE_0042_REVIEW.md) |

No separate Person, Family, Student, Principal, Client, payment master or Academic Studio database is proposed. Formal schema changes must be additive forward migrations after a source-verified number allocation.
