# ASKWISE Future Nova Migration Mapping

Date: 2026-11-01. Documentation only; no migration or Phoenix database access executed.

| Independent field | Future mapping / rule |
| --- | --- |
| students.id | Preserve as askwise_student_id; never replace with canonical ID |
| canonical_student_id | Reserved null in export envelope; populate only from approved external mapping |
| experiments.id | Preserve askwise_experiment_id |
| daily_tasks.id | Preserve task_id and student/experiment ownership |
| learning_sessions.id | Preserve session_id with task_id association |
| attempts / diagnoses / hints.id | Preserve source row ID plus session_id; do not confuse diagnostic category with canonical student identity |
| learning_evidences.id | Preserve evidence_id and task/student ownership |
| map / reflection.id | Preserve source row ID, day and existing student_id |
| source_system | Export envelope: askwise_independent_pilot |
| schema_version | Export envelope: askwise-sqlite-v1; no DB schema migration |
| created_at / updated_at / timestamp / date | Preserve original event text plus source timezone assumptions; exported_at is export time, not event time |

Future external mapping key: (source_system, askwise_student_id) -> canonical_student_id, with approved provenance and mapping version. Store mappings in an approved adapter, not a second Phoenix student/family/CRM master. Repeated imports must use source table + source row ID + source version for idempotency. Do not use display names for identity matching.

Most existing SQLite CURRENT_TIMESTAMP fields are UTC text without offsets; local date/day helpers need explicit timezone treatment in any future migration. Some records have only created_at. Do not invent missing event timestamps, source versions or historical consent. Schema version and source are export metadata, not newly added columns.

Future steps require approved schema mapping, reconciliation, consent/access/deletion review, dry run with anonymous fixtures and rollback plan. No Canonical PostgreSQL, Education Compass DB, Family OS or Phoenix Core Schema change is authorized by this file.
