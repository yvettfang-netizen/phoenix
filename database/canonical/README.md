# Phoenix Canonical PostgreSQL — isolated 0036/0037 compatibility candidate

The unique merged Schema/Migration authority is `yvettfang-netizen/phoenix/main`, under `database/canonical/`. The inspected main at `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc` contains0001–0035. The private source repository preserves historical evidence; it is not a second migration mainline.

This branch adds byte-exact0036 from PR41 (`3de5c99fcc1974ca542db587fcb01494ffe3dc58`) and0037 from the reviewed projection/bridge candidate (`c1b2f30ea8d85aa402c9c3b0c2ac23421b55b44e`) for an isolated37-file compatibility test. Neither forward migration is merged or deployed by this task. Independent0036/0037 manifests remain source snapshots; use [`combined-0036-0037-candidate.json`](migration-manifests/combined-0036-0037-candidate.json) for the combined inventory and measured acceptance expectations.

- Migration files: [`migrations/`](migrations/). Do not edit any existing Migration bytes, including0036/0037; use a reviewed forward proposal for a real conflict.
- Source and file hashes: [`CANONICAL_0035_SOURCE_MANIFEST.md`](../../docs/database/premerge-0035/CANONICAL_0035_SOURCE_MANIFEST.md).
- Public release boundary: [`PUBLIC_RELEASE_ALLOWLIST.md`](../../docs/database/premerge-0035/PUBLIC_RELEASE_ALLOWLIST.md).
- Test status and outstanding approvals: [`PG16_PG17_INTEGRATION_TEST_REPORT.md`](../../docs/database/premerge-0035/PG16_PG17_INTEGRATION_TEST_REPORT.md) and [`FOUNDER_PREMERGE_DECISION.md`](../../docs/database/premerge-0035/FOUNDER_PREMERGE_DECISION.md).

Combined compatibility, source provenance and default-off opaque-session BFF preparation are documented in [`combined-0036-0037-20261105`](../../docs/database/combined-0036-0037-20261105/README.md). Actual identity/configuration facts, normal login/provider activation, single-student mapping and production remain HOLD. No merge, production connection, real data, legacy import or Tencent upgrade is part of this candidate.
