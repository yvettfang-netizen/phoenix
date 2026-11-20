# Founder Executive Decision Brief

**P0 status: PROPOSED FOR REVIEW.** The Founder product positioning in the task is treated as the design baseline; this document does not approve a migration or a release.

## Decision implemented in this design

| Decision | P0 interpretation | Status |
| --- | --- | --- |
| One family entrance | A verified student lands in the Academy learning center; a verified parent/guardian lands in Family Center. Ambiguous or absent relationship gets a choice/denial screen, never an inferred student identity. | PROPOSED |
| Staff entrance | Teachers and teaching administrators use Corporate OS, with explicit assignment or administrative authority. | PROPOSED |
| Shared identity | Reuse `core.people`, `core.student_profiles`, `core.families`, `auth.principals`; no new person, student, family or login master. | VERIFIED in formal SQL; routing PROPOSED |
| Partner boundary | Partner remains in the channel workspace. A referral does not grant learning-record, family or teaching access. | PROPOSED |
| ASKWISE | Separate learning engine; only reviewed evidence summaries flow into Canonical by an authorised service, with source/version and Consent. | PROPOSED |
| Organizations | Reuse `core.organizations` only for actual institutional facts. No multi-company tenant or franchise-school architecture for Academic Studio. | PROPOSED |

## Recommendation

Hold PR #77's 0042 candidate in its present form. Its organization vocabulary includes `FRANCHISEE` and its persistent `auth.workspace_sessions` adds a second session lifecycle that the Academy P0 does not need. Keep PR #76's six-item navigation and Corporate route as independent candidate work; do not import its broader multi-organization assumptions into Academy.

For the next migration, first prove a gap for each object. Use the existing one-use `auth.context_exchange_tickets` and backend-bound `auth.session_contexts`. Derive student/guardian access from verified person/family/authority records and learning Consent. Derive teacher access from `learning.teacher_assignment`; add a narrowly scoped administrative grant only if existing SUPERVISOR evidence cannot express the approved role. Avoid another workspace session, ticket or context table.

The payment/lesson/settlement loop needs its own contract with Finance/Operations authority before any write API. `operations_ref.entitlement_ref` is a reference, not a payment or refund ledger. The design in this package reserves immutable lesson events without claiming that a balance is live.

## Founder review points

1. Confirm the student default when one principal is both student and parent, and the identity-provider claim that establishes the current actor.
2. Approve the lesson-package commercial source, refund authority, make-up and teacher-settlement rules before migration design.
3. Approve room/resource identity and online/hybrid conflict semantics.
4. Approve assessment score scales, evidence retention and visibility for CAT4, DSE, A-Level, IELTS, JLPT and Cantonese.

**Next gate:** review this P0 package, then author a separate minimal forward-migration proposal and synthetic PG16/17 acceptance. No current running database state was inferred from source files.
