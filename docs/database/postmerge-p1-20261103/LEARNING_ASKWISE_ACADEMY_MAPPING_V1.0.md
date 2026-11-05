# Learning / ASKWISE / Academy Mapping V1.0

2026-11-03 · **PASS: code/contract mapping; HOLD: real identity mapping and import.** [Source index](SOURCE_INDEX.json) fixes the branch commits and file digests. Existing Canonical Learning is [0022](https://github.com/yvettfang-netizen/phoenix/blob/9355d28667ee9cf4761b4abcdaf959f0ad154820/database/canonical/migrations/0022_learning_core.sql). This is a draft adapter contract, not an executed migration.

## Product and identity boundary

Public teaching service: **凤启学苑**; internal learning space: **启明堂**; AI product: **ASKWISE™｜问思**. The inspected Notion naming freeze has a later §8 Founder amendment restoring the public descriptive name; preserve the older sections as history. No second legal entity, Student, teacher, course, CMS or database follows from the naming layer. Existing academy/learning paths need no destructive rename.

ASKWISE pilot source is `codex/askwise-independent-pilot-db-20261101` at `644fab93ccfdd7557c432c57363873c7f62ed9be`. Although its branch name says Nov 1, the actual commit API confirms **2026-11-02 16:10:18 Asia/Shanghai**. Its mapping, rule-card, database source and learning-session orchestration were read; no real pilot records were read. A source branch and its synthetic tests are not proof of Canonical persistence.

## Reuse map

| Actual existing authority | Reuse / missing part |
|---|---|
| `learning.course`, `course_version` | Single course/version authority. Public content describes approved offerings; no duplicate ASKWISE course master. |
| `learning.teacher`, `teacher_assignment` | Existing Person/Principal and scoped class assignment. An AI assistant is not automatically a teacher principal. |
| `learning.class`, `enrollment`, `enrollment_class`, `enrollment_status_event` | Existing student/family enrollment and terminal history; Operations entitlement is a reference, not consent or a finance transaction. |
| `learning.schedule_slot` | Existing schedule/create/advance API. Self-booking, rescheduling lineage, cancellation notice/cutoff and concurrency rules need a new approved contract; do not model a reschedule by silently replacing old times. |
| `learning.attendance_record`, `attendance_correction` | Attendance and append-only correction. Not a purchased/consumed/remaining-hours account. Refunds and financial balances remain Finance HOLD. |
| `learning.after_class_card`, `publication`, `stage_report` | Reuse publication/retraction and authorized family projection. Teacher follow-up, parent acknowledgment and approved ASKWISE references are remaining candidates. Do not send raw attempts/reflections to ordinary Timeline. |
| ASKWISE `students.id` | Preserve source ID; canonical target is an existing Student authority, resolved through a controlled explicit map. No name match. |
| ASKWISE `daily_tasks.id`, `learning_sessions.id` | Preserve task/session and student ownership. Not `service.tasks` or a commercial Service Project. |
| ASKWISE attempts / diagnoses / hints | Source record + session/task; preserve source semantics and rules/model versions if actually available. No fabricated historical version. |
| ASKWISE `learning_evidences`, map / reflection records | Source record ID and student/task/day ownership; metadata reference only under separately approved content/retention permissions. |
| ASKWISE Rule Card | Existing `ruleId`, `version`, domain, trigger, requiredEvidence, decisionLogic, boundary and source. Keep procedural support separate from a medical/education diagnosis claim. |

## Controlled mapping draft

Source-qualified key `(source_system, askwise_student_id)` maps to one existing Canonical student/person reference, with verified family scope, approval evidence digest, mapping version, creator/reviewer principals and validity/revocation history. The approved Canonical identifier must be resolved through the current Student contract; do not assume a new physical `canonical_student_id` column or replace the source ID. `canonical_student_id` is currently reserved NULL in ASKWISE's export envelope.

The actual 0035 mapping authorities are `integration.legacy_id_mappings`, `integration.public_ids` and `auth.external_identities`; there is no inspected `integration.external_id_map`. The legacy table supports entity kind `STUDENT_PROFILE`, but the controlled 0024/0025 management functions deliberately restrict source `PHOENIX_FAMILY_OS` and entity `FAMILY`. Therefore they cannot simply register ASKWISE students. First approve a source/Student mapping lifecycle and a narrowly controlled adapter/function reusing the appropriate authority; do not directly insert into the table or overload the Family API. A source ID already bound to a different target must be denied pending explicit reviewed correction. Name/email similarity, display names and public `stu_` parsing cannot authorize the map. Missing mapping, withdrawn learning consent, expired teacher/class scope, cross-student and cross-family requests fail closed.

Idempotency should preserve `(source system, source table, source row ID, source version)` and payload hash; same key/conflicting payload denies. Existing export schema `askwise-sqlite-v1` is metadata, not a Canonical Migration. The inspected `db.ts` actually exports source system `askwise_independent_pilot` and a NULL Canonical student reference; `learning-session.ts` reuses the existing diagnosis/mode/hint engines. Retry is stored on the session/evidence, not a separate commercial task. No per-row immutable rule/model revision was found in the inspected table DDL; preserve available Rule Card versions and require a versioned execution envelope for future evidence. Some timestamps are offset-free UTC strings/local dates and records lack update/version fields: keep missing provenance explicit; do not invent event time, consent or version. A versioned export/timezone and deleted/revoked-record reconciliation contract is required before any import.

Remaining decision package: mapping owner/API, verified student/family evidence, learning consent purposes, teacher/supervisor disclosure, evidence storage and retention, booking/reschedule policies, lesson-hour authority and follow-up publication. Tests may use synthetic source IDs only. **No real ASKWISE database, student page, file, backup or pilot row was opened/imported.**
