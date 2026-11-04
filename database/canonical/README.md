# Phoenix Canonical PostgreSQL integration candidate

This directory is a byte-for-byte copy of the 35 SQL migrations in the private `phoenix-canonical-db` default branch at `3af6ba19a96a458dc20cb0f4493bed10aee7028a`. It is a **pre-merge candidate**, not a deployed database or a new authority. The source remains authoritative until the Founder-approved integration is merged and the authority transfer is recorded.

- Migration files: [`migrations/`](migrations/). Do not edit 0001–0035; use a forward migration for any change.
- Source and file hashes: [`CANONICAL_0035_SOURCE_MANIFEST.md`](../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md).
- Public release boundary: [`PUBLIC_RELEASE_ALLOWLIST.md`](../../docs/database/premerge-0035/PUBLIC_RELEASE_ALLOWLIST.md).
- Test status and outstanding approvals: [`PG16_PG17_INTEGRATION_TEST_REPORT.md`](../../docs/database/premerge-0035/PG16_PG17_INTEGRATION_TEST_REPORT.md) and [`FOUNDER_PREMERGE_DECISION.md`](../../docs/database/premerge-0035/FOUNDER_PREMERGE_DECISION.md).

No production connection, real data, legacy import or Tencent upgrade is part of this candidate.
