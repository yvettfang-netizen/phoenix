# ASKWISE SQLite Runtime Audit

Date: 2026-11-01. Scope: independent Web pilot, not Phoenix Core.

## Read-only findings before implementation

Actual existing file: `D:/CODEX/PhoenixNova/askwise/askwise-learning-engine/data/askwise.db`.
The file was opened with `readonly:true,fileMustExist:true`. `integrity_check=ok`; `foreign_key_check=[]`. WAL sidecar existed; copying only the main file would not be a safe backup.

Git root: `D:/CODEX/PhoenixNova`. Start HEAD `e1e0b84a401f7430e0f448b8e25d4dc68e7ef3f6`. Development branch: `codex/askwise-independent-pilot-db-20261101`. Existing dirty changes were preserved. `git ls-files -- askwise/askwise-learning-engine/data` returned no tracked files.

Counts: students=1, experiments=1, daily_tasks=2; sessions, attempts, diagnoses, hints, evidence, both maps, reflections and both advisor tables=0. The named David row is created by the old initializer. Both tasks have `is_placeholder=1`. This proves initialization, not David's completed work. No submitted learning content was found by these counts. Provenance of any future manually added rows cannot be inferred from names alone; do not import the old file into Pilot.

## Existing business schema (unchanged)

| Table | Fields | Relationships / unique keys |
| --- | --- | --- |
| students | id, name | PK id; UNIQUE name |
| experiments | id, student_id, start_date, total_days, created_at | student_id -> students; UNIQUE student_id |
| daily_tasks | id, student_id, experiment_id, day, subject, topic, question, confidence, status, is_placeholder, created_at | student_id -> students; experiment_id -> experiments |
| learning_sessions | id, task_id, attempt_number, hint_count, retry_count, solved, independent, final_result, created_at, updated_at | task_id -> daily_tasks |
| attempts | id, session_id, attempt_number, student_response, hint_level, is_correct, timestamp | session_id -> learning_sessions |
| diagnoses | id, session_id, diagnosis_type, diagnosis_reason, confidence, created_at | session_id -> learning_sessions |
| hints | id, session_id, hint_level, content, solved_after_hint, timestamp | session_id -> learning_sessions |
| learning_evidences | id, student_id, task_id, date, subject, topic, question, initial_attempt, diagnosis, hint_level, hint_count, retry_count, final_result, independence, reflection, created_at | student_id -> students; task_id -> tasks; UNIQUE task_id |
| political_knowledge_map | id, student_id, topic, core_concept, key_point, connection, trigger_question, my_own_explanation, day, created_at | student_id -> students; UNIQUE student_id/topic/day |
| math_strategy_map | id, student_id, problem_type, recognition_signal, possible_strategy, why_this_strategy, common_mistake, example, day, created_at | student_id -> students; UNIQUE student_id/problem_type/day |
| daily_reflections | id, student_id, day, q1, q2, q3, created_at | student_id -> students; UNIQUE student_id/day |
| advisor_cases | case_id, sanitized_payload, source_system, source_version, created_at, updated_at | PK case_id |
| advisor_assessments | id, case_id, input_fingerprint, assessment_status, result_payload, rule_ids, source_system, source_version, created_at, updated_at | case_id -> advisor_cases; UNIQUE case_id/input_fingerprint |

INTEGER primary keys use AUTOINCREMENT except advisor_cases TEXT key. Content/time columns are TEXT; confidence is REAL. Existing unique constraints create SQLite automatic indexes; no custom index was returned. No ON DELETE CASCADE exists; deletion must follow dependency order in one transaction. No schema migration or new business table is introduced.

Old code seeded a global student at module import and queried tasks/sessions by unscoped IDs. No verified backup/restore operation existed. Independent Pilot replaces implicit student selection with authenticated ID checks and uses a separate empty file with this same schema.

Authoritative test results are recorded in ASKWISE_AUTH_ISOLATION_TEST.md and ASKWISE_BACKUP_RESTORE_TEST.md. Audit alone is not readiness approval.
