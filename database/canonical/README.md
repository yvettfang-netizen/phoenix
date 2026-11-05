# Phoenix Canonical PostgreSQL — engineering authority

PR #36 merged into `phoenix/main` at `9355d28667ee9cf4761b4abcdaf959f0ad154820`. Following the Founder post-merge instruction of 2026-11-03, **this directory is the sole engineering release source for future Canonical Schema and Migrations**. The private `phoenix-canonical-db` repository retains historical provenance, internal designs and controlled evidence; it must not publish a parallel Migration line. This records code authority, not a database rollout.

- Migration files: [`migrations/`](migrations/). Do not edit 0001–0035; use a forward migration for any change.
- Source and file hashes: [`CANONICAL_0035_SOURCE_MANIFEST.md`](../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md).
- Public release boundary: [`PUBLIC_RELEASE_ALLOWLIST.md`](../../docs/database/premerge-0035/PUBLIC_RELEASE_ALLOWLIST.md).
- Current authority and boundaries: [`post-merge authority record`](../../docs/database/postmerge-p1-20261103/CANONICAL_POSTMERGE_AUTHORITY_RECORD_V1.0.md).
- Current runtime gaps, synthetic tests and next decision: [`post-merge package`](../../docs/database/postmerge-p1-20261103/FOUNDER_NEXT_GATE_DECISION.md). The pre-merge reports remain historical snapshots; their pending signatures are not retrospectively filled in.

0001–0035 remain immutable. Any approved 0036+ change requires a separately reviewed forward Migration and versioned CI inventory. Production, persistent database upgrades, Tencent, real data and legacy imports remain HOLD.
