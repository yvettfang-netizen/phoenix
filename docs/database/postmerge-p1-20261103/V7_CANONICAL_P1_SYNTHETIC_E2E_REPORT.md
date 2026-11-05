# V7 / Canonical P1 Synthetic E2E Report

Task `PHOENIX-CANONICAL-POSTMERGE-P1-20261103` · 2026-11-03. **PASS: PG16 and PG17 actual isolated synthetic acceptance. BLOCKED: live four-domain runtime.** Code authority: main `9355d28667ee9cf4761b4abcdaf959f0ad154820`; migrations 0001–0035 only. No existing cluster, Tencent or production connection.

## Reproducible commands

Run in the post-merge main-repository branch, with read access to the pinned private synthetic-test source and approved historical application checkout:

```powershell
pwsh -NoProfile -File database/canonical/verification/postmerge/verify-authority.ps1
pwsh -NoProfile -File database/canonical/verification/postmerge/run-synthetic.ps1 -Version 16 -PrivateCanonicalRoot <private-canonical-directory> -ApplicationServerRoot <approved-server-directory> -EvidenceRoot <private-evidence-directory>
pwsh -NoProfile -File database/canonical/verification/postmerge/run-synthetic.ps1 -Version 17 -PrivateCanonicalRoot <private-canonical-directory> -ApplicationServerRoot <approved-server-directory> -EvidenceRoot <private-evidence-directory>
```

Private test files must match `bd06b0788c8246b82ee70ecc9e5611084ae6bd64` exactly, with a clean `tests/` tree; later private evidence-only commits do not invalidate that code pin. The app source must be clean `48bb6c3ae18906f870ea9e8a717c03ebb2da34bd`. The app manifest and actual existing HTTP test command are checked. Raw evidence stays outside the public checkout. See [test runner](../../../database/canonical/verification/postmerge/run-synthetic.ps1) for the bounded adaptations: random disposable resource names, mainline SQL fixture, parent-verified digests instead of a Git check on a temporary non-repository directory. Existing private test assertions remain unchanged. After archiving, the source guard was narrowed from the whole private HEAD to the pinned, unchanged test tree; its actual Git comparison and PowerShell parse checks pass, with no database behavior change.

## Test matrix

| Test | PG16 | PG17 | Evidence / scope |
|---|---|---|---|
| 35 immutable SHA-256 values | PASS | PASS | reviewed original manifest; repeated before/after each run |
| Fresh / 0025→0035 upgrade | PASS | PASS | existing public smoke command, preserving synthetic master rows |
| Repeat / drift / atomicity | PASS | PASS | mutations only on disposable copies |
| RLS/ACL and separated LOGIN/tickets | PASS | PASS | pinned full F10 suites through M5, tenant/student/partner denials |
| Dedicated-backup-role dump / fresh-cluster restore | PASS | PASS | digest verified before restore; 35 ledger / 92 tables / 83 policies and restored regressions |
| Three existing route HTTP → broker → binder → app pool → RLS | PASS | PASS | actual pinned historical application test, not a replacement mock |
| Context/ticket cleanup / disposable resource removal | PASS | PASS | residual contexts/tickets zero; containers/credentials removed |
| New four-domain live runtime / browser business flows | BLOCKED | BLOCKED | no approved live route/DTO/deployed topology evidence |
| 0036 / real identities / sensitive Health / Finance operations | NOT RUN | NOT RUN | expressly outside execution boundary |

The three-route test uses synthetic identities, test signing material and loopback-only ephemeral PostgreSQL. F10 and public smoke use isolated network-none clusters. Credentials are generated into restricted temporary files, never supplied in command arguments. A temporary SQL fixture is a test input, not a second release authority. The original immutable public smoke harness is retained unchanged for its pinned CI gate.

Fresh restore creates roles in a new test cluster and restores using the dedicated backup export. The manifest digest detects accidental/tampered dump changes but is not a signed authenticity guarantee. Production ownership, offsite backup, retention, encryption and RPO/RTO remain separately governed holds.

This is **0035 compatibility evidence**, not four-domain application rollout, current persistent-cluster health, current Education V1.2 deployment or 0036 acceptance. Complete browser E2E remains NOT RUN / APPLICATION INTEGRATION GATE. Raw private outputs are named `postmerge-pg{16,17}-smoke-{fresh,upgrade}.txt`, `postmerge-pg{16,17}-full-acceptance.txt`, `postmerge-pg{16,17}-three-route-http.txt`, plus command transcripts, test-source manifests and `cleanup-proof.json`. Their public digest index is [evidence manifest](EVIDENCE_MANIFEST.json); raw files remain in the controlled private evidence repository. Native child-process output is explicitly captured; an earlier exploratory PG16 pass was repeated to complete archival evidence.

Observed raw markers in both versions: `PASS catalog ledger=35 tables=92 policies=83`; `PASS catalog app_write=0 public_execute=0 secdef_without_path=0`; `PASS fresh-cluster manifest-verified restore with synthetic rows and M5 Service Delivery boundary`; `PASS session_contexts=0 tickets=0`. The actual Node HTTP test has one test case exercising all three route DTOs and a cross-family student 403, with one pass/zero failures on each version. Full F10 independently covers ticket forgery/replay/expiry, tenant/student/partner boundaries, idempotency, immutable events, consent withdrawal, audit and protected delivery. Final cleanup: zero owned disposable containers and backup volumes. See the raw artifacts for exact commands/output; no password or private runtime log is published here.

Archived [raw execution evidence and reproduction notes](https://github.com/yvettfang-netizen/phoenix-canonical-db/tree/084807632c5648f29f696f71ca53cbc708ddee74/canonical-db/evidence/postmerge-p1-20261103) require private-repository access. All 53 indexed artifact SHA-256 values were verified against both working bytes and actual staged Git blobs; raw evidence uses byte-preserving attributes. Public files contain only the non-sensitive digest index, source references and results.
