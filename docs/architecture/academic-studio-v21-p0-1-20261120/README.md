# Phoenix Academic Studio V2.1 — P0.1 Minimal Forward Design

**Status:** DESIGN PROPOSAL ONLY · no SQL authored · no migration number allocated · no database changed  
**Founder baseline:** Student-first dual view; lesson-hour commercial rules HOLD; global shared teaching resources; six independent assessment systems; teacher controls Online / Onsite / Hybrid assignments.

## Why this package exists

PR #88 has been merged to the current `main`. This package refreshes the P0.1 design against that current Canonical baseline and converts the verified gaps into the smallest proposed forward changes. It does not reopen the old database retirement decision and does not create a second database.

## Documents

- [Current source baseline and exact fingerprints](SOURCE_BASELINE.md)
- [Minimal forward design and reuse decisions](MINIMAL_FORWARD_DESIGN.md)
- [Proposed ERD](TARGET_ERD.md)
- [Security, concurrency and PG16/17 acceptance plan](SECURITY_TEST_PLAN.md)
- [Founder decisions still required](FOUNDER_DECISIONS_REQUIRED.md)

## Binding boundaries

1. Canonical PostgreSQL is the only data authority. Formal migrations 0001–0037 remain unchanged.
2. No legacy database data migration or import is required. Do not copy old Education PG, Family SQLite, ASKWISE SQLite or V5 D1 data.
3. Existing Canonical data is not automatically deleted or rewritten by this design.
4. Reuse `core.people`, `core.student_profiles`, `core.families`, `core.family_memberships`, `core.guardian_authorities`, `auth.principals`, existing context tickets/session contexts, `learning.*`, `education.*`, `docs.documents` and audit functions.
5. One Person has one Canonical Principal. Student, Parent and Teacher capabilities derive from existing domain relationships; only Academy Administrator / Founder require a narrow explicit grant.
6. No regional teaching tenants, franchisees, duplicate staff accounts, duplicate sessions, duplicate context tickets or workspace-session subsystem.
7. Teacher assigns the delivery mode. For HYBRID, teacher assigns each student Online or Onsite. Students and parents cannot self-select or mutate it.
8. Lesson-hour purchases, debit, cancellation/no-show, make-up, refund and teacher settlement remain HOLD and are excluded.
9. Every proposed SQL object must be justified by a proven gap and separately approved by Founder before SQL authoring.
10. No production access, deployment or physical database deletion is authorized by this design.

## Proposed implementation packages

| Package | Minimal scope | Entry gate |
|---|---|---|
| A — identity/context | Add Student context channel; allow global STAFF context; add Academy Admin/Founder grant; reuse existing one-use ticket and backend-bound context | Founder confirms context and grant semantics |
| B — scheduling | Add stable room identity, per-student slot assignment, teacher-controlled delivery mode and immutable schedule-change events | Founder confirms lead-teacher authority, timezone and Hybrid finalization |
| C — assessment | Add versioned assessment attempt/result records with explicit score scale and review/publication lifecycle | Founder confirms evidence, licensing, review and retention policy |

These are design packages, not assigned migration numbers. They may be split further if the final SQL review finds that smaller releases are safer.
