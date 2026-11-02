# PG16/PG17 integration test report

**Gate 4 database tests: PASS locally. Application regression and GitHub Actions: pending at report creation.** Date: 2026-11-02. All database containers used `--network none`, no published port, a random synthetic env file, exact cleanup and no real records.

## Actual commands and outcomes

The private-source full F10 suites (source commit `3af6ba19a96a458dc20cb0f4493bed10aee7028a`) were executed with:

```powershell
pwsh -NoProfile -File canonical-db/tests/f10_local_acceptance.ps1 -Version 16
pwsh -NoProfile -File canonical-db/tests/f10_local_acceptance.ps1 -Version 17
```

Both exited `0`. Raw transcripts and related synthetic audit reconciliation are retained **locally in the private worktree only** under `canonical-db/evidence/premerge-0035/`; they are excluded from the public allowlist. Transcript SHA-256: PG16 `10d06c95bd4d3b3b58c73d1fc270dbafcecb1d9df9b2de492e73c9e5f0056a01`; PG17 `abc0d2729a1130917e38f3e3b439ff3c2bb2cb723733bc035fbad5f64a320c39`. Each has 42,255 bytes. The raw output includes:

```text
PASS migration counts processed=35 directory=35 ledger=35 expected=35
PASS fresh-cluster manifest-verified restore with synthetic rows and M5 Service Delivery boundary
PASS PostgreSQL 16 F10 full synthetic acceptance
PASS PostgreSQL 17 F10 full synthetic acceptance
```

The suites cover separated LOGIN identities and one-use tickets, RLS/ACL negative cases, M0–M5 business regressions, audit reconciliation, drift refusal, atomic rollback, local SCRAM rejection and dedicated-backup-role fresh-cluster restore. The full output is required to inspect individual assertions; this summary is not a replacement for it.

The **copied public SQL bytes** were also tested with [`smoke.ps1`](../../../database/canonical/verification/smoke.ps1) and [`migrate.sh`](../../../database/canonical/verification/migrate.sh):

```powershell
pwsh -NoProfile -File database/canonical/verification/smoke.ps1 -Version 16 -Mode fresh
pwsh -NoProfile -File database/canonical/verification/smoke.ps1 -Version 17 -Mode fresh
pwsh -NoProfile -File database/canonical/verification/smoke.ps1 -Version 16 -Mode upgrade
pwsh -NoProfile -File database/canonical/verification/smoke.ps1 -Version 17 -Mode upgrade
```

| Version | Path | Actual status | Raw local private log SHA-256 |
|---|---|---|---|
| PG16 | fresh 0001–0035 | PASS, exit 0 | `d3779d03fc48b590bcfa405817b10ec7ad5c5926461f064bbce1fa9c89ea8d94` |
| PG17 | fresh 0001–0035 | PASS, exit 0 | `f1521bd1e7074a2fe6c071656c7887e23e19bc60ffa563474fb2a4e91b317f3f` |
| PG16 | 0025→0035 with synthetic Person/Family | PASS, exit 0 | `6594de2d8b578ccdaa2b2794e416d739feda22e5dcab897beb6ca050877a0b6c` |
| PG17 | 0025→0035 with synthetic Person/Family | PASS, exit 0 | `eff62461832fa7c8fab268f4375d4187cfc696a119c1dc153104dfa3a9646712` |

Each smoke path checks file count against ledger count, checksum-safe repeat, drift refusal on a disposable copy of 0035, forced transaction rollback, and the final 35-ledger/92-table/83-policy catalog. Upgrade paths first install 0001–0025, insert two synthetic core masters, apply 0026–0035 and assert both rows survive. Raw outputs are retained privately as `canonical-db/evidence/premerge-0035/public-integration-pg{16,17}-{fresh,upgrade}.txt`.

## Application and CI gate

The public branch changes no application code. Existing Education Compass client and UI contract commands (`node tests/run-tests.js`, `node tests/validate-ui-contract.js`) passed locally. Website, Identity Compass and Wealth Compass dependency-backed suites are being prepared and will be recorded with their actual results. The new [pre-merge workflow](../../../.github/workflows/canonical-0035-premerge.yml) provides public-candidate Gitleaks plus four PG smoke jobs. A GitHub Actions run is **NOT RUN** until this branch is pushed and the Draft PR is opened; this report must be updated with the run URL and conclusion.

**Limits:** The public smoke upgrade preserves only two synthetic master rows; the private F10 suite provides the broader business and restore coverage on byte-identical source SQL. No test proves an existing Tencent or production database is at 0035. No production operation was attempted.
