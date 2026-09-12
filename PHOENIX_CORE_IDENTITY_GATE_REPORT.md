# Phoenix Core Identity Gate 1 Report

Date: 2026-08-30  
Status: `PASS — DESIGN COMPLETE, FOUNDER REVIEW REQUIRED BEFORE GATE 2`

## Evidence baseline

- Repository: `https://github.com/yvettfang-netizen/phoenix.git`
- Working tree: `D:\CODEX\PhoenixNova`
- Branch: `codex/core-integration-gates-0-1`
- Working-tree/baseline full SHA: `c118d176acd8e80881c51ed2a85ce6037d6ae07e`
- Live-verified canonical remote `main`: `955a5cf169125dc4d864969edc022e5a50ea3bc2` (working tree is 3 commits behind)
- Preservation prerequisite: `PHOENIX_ASSET_PRESERVATION_REPORT.md` is PASS.

## Gate 1 deliverables

- `docs/architecture/PHOENIX_CORE_IDENTITY_V1.md`
- `docs/architecture/CORE_ID_CONTRACT.md`
- `docs/architecture/CROSS_SYSTEM_MAPPING.md`
- `docs/architecture/CONSENT_MODEL.md`
- `docs/architecture/RBAC_BASELINE.md`
- `docs/architecture/CORE_ERD_V1.md`

## Proposed authoritative identity model

Phoenix Core alone owns `User`, `Family`, `Student`, and `Guardian`. Core issues opaque, prefixed, random IDs. User-to-Family, Student-to-Family, and Guardian-to-Student are explicit relationships rather than implicit fields. All legacy/module identities resolve through a non-destructive mapping ledger.

Domain ownership remains separate: Compass products own their scoring logic, ASKWISE owns learning details, Academy owns tutoring delivery, Website owns presentation, and Content Automation owns publication workflow. None becomes an identity master.

## Founder review questions

| Question | Proposed answer | Evidence |
|---|---|---|
| Who owns User? | Phoenix Core `core.users` + `core.auth_identities` | `PHOENIX_CORE_IDENTITY_V1.md` |
| Who owns Family? | Phoenix Core `core.families` | `PHOENIX_CORE_IDENTITY_V1.md` |
| Who owns Student? | Phoenix Core `core.students` | `CORE_ID_CONTRACT.md` |
| How does ASKWISE identify the same child? | `(ASKWISE_SQLITE, STUDENT, local integer)` maps to one Core `student_id` | `CROSS_SYSTEM_MAPPING.md` |
| How does Identity Compass identify the same family? | Resolve an existing Core family context; legacy browser `fam_*` remains a mapping | `CROSS_SYSTEM_MAPPING.md` |
| How do legacy IDs migrate without deletion? | Snapshot, stage, verify, map, quarantine conflicts, retain aliases and audit | `CROSS_SYSTEM_MAPPING.md` |
| How is consent recorded? | Actor/guardian + subject + family + purpose + version + evidence + lifecycle events | `CONSENT_MODEL.md` |
| How are families isolated? | Scoped membership/assignment + server checks + PostgreSQL RLS + audit | `RBAC_BASELINE.md` |

## Health Compass

The shared future contract permits `EDUCATION`, `IDENTITY`, `WEALTH`, and `HEALTH`; `HEALTH` is `RESERVED`. No health logic, question bank, medical scoring, symptoms, recommendations, UI, report, data collection, or database table was created.

## Pass decision

Gate 1 passes as a design gate because ownership, ID contract, mapping, consent, RBAC, audit, isolation, and PostgreSQL ERD are explicit and answer all eight required review questions. It does not authorize implementation.

## Stop

STOP after Gate 1. No Gate 2 implementation, broad source movement, production database work, migration, merge, push, PR, or deployment was performed. Founder approval is required to continue.
