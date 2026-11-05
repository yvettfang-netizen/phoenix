# Phoenix Canonical PostgreSQL

The 35 baseline SQL files were integrated into Phoenix main by PR #36 at `9355d28667ee9cf4761b4abcdaf959f0ad154820`. This path is the engineering Migration authority. The private source repository retains historical evidence; it is not a second release stream. Source code, a tested disposable cluster, persistent database state and production activation are separate facts.

This branch adds an **isolated0036 candidate** under the recorded [Founder C-1–C-4 approval](../../docs/database/canonical-0036/FOUNDER_C1_C4_APPROVAL.md). It does not upgrade persistent databases or authorize merge/production. Live configuration/evidence gaps remain HOLD. Candidate inventory: [`migration-manifests/0036-candidate.json`](migration-manifests/0036-candidate.json); verification: [`verification/v0036/`](verification/v0036/).

- Migration files: [`migrations/`](migrations/). Do not edit 0001–0035; use a forward migration for any change.
- Source and file hashes: [`CANONICAL_0035_SOURCE_MANIFEST.md`](../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md).
- Public release boundary: [`PUBLIC_RELEASE_ALLOWLIST.md`](../../docs/database/premerge-0035/PUBLIC_RELEASE_ALLOWLIST.md).
- Test status and outstanding approvals: [`PG16_PG17_INTEGRATION_TEST_REPORT.md`](../../docs/database/premerge-0035/PG16_PG17_INTEGRATION_TEST_REPORT.md) and [`FOUNDER_PREMERGE_DECISION.md`](../../docs/database/premerge-0035/FOUNDER_PREMERGE_DECISION.md).

No production connection, real data, legacy import or Tencent upgrade is part of this candidate.
