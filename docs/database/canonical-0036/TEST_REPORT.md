# 0036 isolated engineering validation

Date:2026-11-03. **ADDITIVE_MIGRATION_REQUIRED / LOCAL CANDIDATE**. Founder policy approval is recorded separately; it does not stand in for independent review or merge approval.

Candidate:`0036_crm_acquisition_provenance_and_need_facts.sql`. SHA-256:`2c977cb44e3ec01f7ad00d4c0d8f32c5e2cd8e8fd2fed796340a919dfd0b7719`. Versioned exact inventory:[0036-candidate.json](../../../database/canonical/migration-manifests/0036-candidate.json). Baseline main:`9355d28667ee9cf4761b4abcdaf959f0ad154820`; all35 frozen digests and original0035 verifier bytes remain unchanged. Expected disposable catalog:36 ledger entries,93 tables,83 policies. No source/retention policy, identity or business row is seeded by Migration. [Follow-up audit and new permanent counterexamples](PR41_FOLLOWUP_AUDIT.md) distinguish the original coverage gaps from this corrected candidate; Codex self-review is not an independent signature.

| Actually executed isolated validation | PG16 | PG17 |
|---|---|---|
| Fresh0001–0036 and exact ledger/file inventory | PASS | PASS |
| 0025→0035→0036, preserving masters and legacy First Touch without invented provenance | PASS | PASS |
| Repeat/checksum drift refusal/atomic rollback | PASS | PASS |
| Exact app/binder/config LOGIN separation and one-use tickets | PASS | PASS |
| Four domains coexist; user/advisor evidence remains distinct; no FAMILY→WEALTH inference | PASS | PASS |
| Versioned entry/GEO evidence and separate conversion; stable retry/conflicting payload refusal | PASS | PASS |
| Missing, expired, revoked or wrong-LOGIN source contract refused | PASS | PASS |
| Cross-family, SERVICE human-forgery, wrong advisor scope, withdrawn Consent and premature partner attribution refused | PASS | PASS |
| Append-only correction/retraction, terminal/fork guards and immutable entry/history | PASS | PASS |
| Future/infinite policy refusal, revoked partner or expired contact during coordinated lock waits, denial audit and no orphan rows | PASS | PASS |
| Unique complete verification list; duplicate/omitted helper and digest drift counterexamples | PASS | PASS |
| Dedicated backup export; damaged digest refused before restore; fresh-cluster restore and full0036 API regression with regenerated LOGIN passwords | PASS | PASS |
| Full existing private F10 acceptance and its fresh-cluster restore against final0036 digest | PASS | PASS |
| Historical application: one test covering three approved read routes and cross-family403 | PASS | PASS |
| New four-domain live HTTP/browser writing and real identity/provider integration | NOT RUN / HOLD | NOT RUN / HOLD |
| Persistent-database upgrade, Tencent or production | NOT RUN / HOLD | NOT RUN / HOLD |

Reproduce from the repository root with actual existing scripts:

```powershell
pwsh -NoProfile -File database/canonical/verification/v0036/verify.ps1
pwsh -NoProfile -File database/canonical/verification/v0036/smoke.ps1 -Version 16 -Mode fresh
pwsh -NoProfile -File database/canonical/verification/v0036/smoke.ps1 -Version 16 -Mode upgrade
pwsh -NoProfile -File database/canonical/verification/v0036/smoke.ps1 -Version 17 -Mode fresh
pwsh -NoProfile -File database/canonical/verification/v0036/smoke.ps1 -Version 17 -Mode upgrade
```

Images are pinned by digest in the script. All generated passwords stay in owner-restricted temporary files or container stdin; pgpass files are0600. App/binder use distinct authenticated connections and a redeemed ticket, rather than superuser SET ROLE for mechanism tests. Test containers have network=none and no host database ports. The exact owned containers, anonymous volumes, backup volume, dump and generated credentials are removed in finally. Existing database resources are not reset.

## Legacy compatibility evidence

`verification/v0036/run-private-regressions.ps1` reuses private test source `bd06b0788c8246b82ee70ecc9e5611084ae6bd64` and historical application commit `48bb6c3ae18906f870ea9e8a717c03ebb2da34bd`. Supply the actual approved local checkout paths through its mandatory parameters; no topology or path is invented here. Raw commands/results and before/after test-source digests are retained privately. These results must be checked at the exact Migration digest above; preliminary runs of earlier candidate bytes are not final evidence.

The only legacy fixture adaptations are disposable resource names; F10 default inventory35→36; foundation table expectation92→93; fresh-restore ledger35→36/table92→93; M5 restore ledger35→36; and the historical HTTP runner's corresponding exact count/last-file/catalog labels. Its repository-only guard is replaced by the parent's manifest/copy/stability guards for a temporary fixture. Old scenario logic, application source and SQL0001–0035 are unchanged. This is a compatibility run of existing approved three read routes, not proof of current four-domain write endpoints. Final results and exact-head CI are recorded in the execution evidence/PR checks; pending checks are not inherited from PR36 or PR39.

## Disclosure and remaining gate

The backup manifest is unsigned: it detects corruption but cannot authenticate a maliciously replaced dump+manifest. No actual retention period, backup destination, real provider, keys, Health patient authorization or runtime route is supplied by synthetic tests. Those remain EVIDENCE HOLD. No independent reviewer or Founder merge signature is generated by Codex. The only next runtime gate is verified source/retention/identity/route configuration, followed by protected review and a separate activation decision.
