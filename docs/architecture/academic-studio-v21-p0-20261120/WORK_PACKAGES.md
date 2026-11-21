# Controlled implementation packages after P0

This P0 package is **design only**. Each later package needs its own approved forward migration number, Draft PR, synthetic PG16/17 results and separate Founder gate.

| Package | Scope | Entry gate | Exit evidence |
| --- | --- | --- | --- |
| P0 (this PR) | Source audit, 0042 disposition, ERD, loops, six static previews | Main and candidate SHAs fixed | Reviewable documents, responsive previews, static validation |
| P1 identity | Reuse broker/Principal/context for student, guardian, teacher, admin view; no duplicate session/ticket/context | Real identity contract and 0042 disposition | Separate-login PG16/17 ACL/RLS negatives; revoked/expired access; Family OS compatibility |
| P2 teaching operations | Booking, room/resource schedule and verified lesson events | Scheduling/room policy and minors' authorisation approved | Concurrent conflict tests, cancellation/make-up and audit |
| P3 commercial | Package activation, immutable hour ledger, refund reference, settlement evidence | Finance/Operations source, price/refund/settlement contract | Cross-source reconciliation, idempotency, replay/reversal, restore |
| P4 assessments | Six instrument contracts and authorised timeline projection | Scales/licences, consent/assent, visibility and retention approved | Instrument-specific validation, cross-family denial, publication/retraction |
| P5 application | Family OS student/parent and Corporate teacher/admin API/UI wiring; ASKWISE reviewed summary bridge | P1–P4 security gates, real identity evidence | Synthetic browser E2E then separately approved nonproduction integration |

For every package, audit existing candidate numbers before allocation. 0038/0039 remain Service Workbench candidates; 0042 remains PR #77's held candidate. No package assumes the production database has any candidate migration installed. Production and real-data rollout require a separate final decision.
