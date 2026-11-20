# Jimson nonproduction integration handover — DB-02

**State: HOLD for installation.** Founder approved 0043 only as an isolated candidate number. This guide is for review and eventual isolated nonproduction approval. It is not a production runbook and contains no credentials.

## Verified dependency order

1. `phoenix/main` is the sole formal migration authority. The inspected main ended at 0037. Recheck the **current** remote main, PRs, ledger, files and SHA before any installation; 0038–0041 are occupied by other candidates, not part of this package.
2. DB-01 PR #77 adds 0042 candidate at SHA-256 `0d4a3de80b56ccb167049a846e17b9b6fc4ef3e152b57aa4600d87367a33cb65`. DB-02 0043 requires exactly that 0042 content and a trusted app/binder split.
3. DB-02 candidate 0043 SHA-256 is in [manifest](../../../database/canonical/forward-candidates/task-handoff/manifest-0043-task-handoff.json). Never copy the file into `migrations/` or reserve its number on shared nonproduction merely because local tests pass. Reconcile any newly merged 0038–0042 work first and use a fresh forward number if needed.
4. Review SQL ownership, SECURITY DEFINER search paths, EXECUTE grants, FORCE RLS and the actual business contract for task responsibility. Test the future HTTP adapter separately.

## Reproducible local synthetic commands

Run from the repository root in an isolated Docker Desktop context, without a production connection:

```powershell
node database/canonical/verification/v0043/verify-source.mjs
Push-Location 'Phoenix Compass/education compass/server'
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npm test
Pop-Location
node database/canonical/verification/v0043/acceptance.mjs 16
node database/canonical/verification/v0043/acceptance.mjs 17
node database/canonical/verification/v0043/catalog.mjs 16
node database/canonical/verification/v0043/catalog.mjs 17
```

The test harness starts **owned disposable local containers** with digest-pinned PG16/17 images, loopback ephemeral ports and synthetic fixture data. It checks its own labels before removal. It does not target a shared database. `TASK_HANDOFF_EVIDENCE_DIR` can point to an evidence directory; defaults are ignored `out/enterprise-v31-db02/pg16` and `pg17`.

## Future controlled nonproduction gate

| Gate | Required receipt | Status now |
|---|---|---|
| Environment identity | Nonproduction instance ID, exact service, branch/commit, endpoint and owner | HOLD |
| Migration authority | Exact current main and database ledger, no conflicting 0043, approved final forward numbering | HOLD |
| Backup and restore | Fresh restore of that exact environment to a new test cluster, verified manifest and rollback receipt | HOLD |
| Identity | Real provider metadata, two separate controlled organization accounts, Staff binding and live session revocation evidence | HOLD |
| Business/API | Reviewed trusted handoff HTTP route, original contact/partner attribution and customer notification contract | HOLD |
| Permissions | Two organization cross-scope tests, Family/Partner denial, document denial, separate LOGINs, one-use ticket | PASS in synthetic local only |
| Deployment | Founder/Jimson scoped change approval, monitored rollout, reverse migration/feature-off plan | HOLD |

The safe compatibility rollback is **disable the future HTTP route/feature**, leaving the additive tables and immutable events intact. Accepted handoffs require a compensating authorized transfer rather than deleting events. Dropping 0043 tables would destroy audit history and is not an approved rollback. The old CRM or database must remain available until actual application dependencies, data reconciliation, backup restore and cutover are proven.
