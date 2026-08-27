# Phoenix Family OS™ Data Boundary V0.1

## Local logical records

| Record | Relationship | Current use |
|---|---|---|
| `users` | `id`, local identity, role | Family or internal Demo identity |
| `families` | `user_id` | Family Profile |
| `students` | `family_id` | Child Profile; `students.id` is the current child identifier |
| `assessments` | `student_id` | Education Compass answers and sync intent |
| `reports` | `assessment_id` | rule-assisted 成长洞察 |
| `timelineEvents` | `family_id` | local relationship-event history |
| `advisorRequests` | `family_id`, `user_id` | Family-initiated Advisor Service request |
| `advisorNotes` | `family_id`, `advisor_id` | internal Demo follow-up |
| `analyticsEvents` | `user_id`, `family_id` | local product events, not security audit |
| partner preview records | family/student references | isolated Demo data; not current P0 |

The source schema still contains unused legacy enum/placeholders for future compass/partner types. They are not implemented product modules and must not be shown as available. No schema removal is included in this UX/documentation change.

## Persistence

- primary Local Demo store: `wx` storage key `PFS_DB_V01`
- current user key: `PFS_CURRENT_USER_ID`
- questionnaire sync: local outbox/receipt keys
- backend Demo: local SQLite with users, demo sessions, families, students, questionnaire submissions, migration ledger, and metadata audit

## Integrity limits

- local arrays do not enforce database foreign keys, unique constraints, transactions, version history, source/confirmation, or production retention
- current profile updates overwrite values
- Timeline events are not a full Timeline Item/reminder/change-history contract
- Partner consent checkbox is not Family Consent
- analytics events are not AuditLog

Real family data remains prohibited until an approved managed data layer, migrations, encryption, backup/recovery, RBAC, consent, audit, export/deletion, and retention are implemented and tested.
