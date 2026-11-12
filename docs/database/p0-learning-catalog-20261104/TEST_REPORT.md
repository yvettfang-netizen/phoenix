# P0 catalog synthetic acceptance

**Local PG16 PASS / PG17 PASS.** All fixtures synthetic. Existing persistent databases were not initialized, migrated or reset. No Tencent, production, real customer data or clinical records were accessed.

| Actual check | PG16 | PG17 |
|---|---|---|
| Fresh 0001–0035, ledger 35 | PASS | PASS |
| Dedicated real LOGIN; table SELECT/DML and app/binder SET ROLE refused | PASS | PASS |
| Misconfigured reader with extra table privilege refused | PASS | PASS |
| Exact HTTP DTO, draft/archived/retired/future/expired excluded | PASS | PASS |
| Missing/forged capability, POST and query assertions refused | PASS | PASS |
| Actual Vinext BFF → existing Node → PostgreSQL | PASS | PASS |
| Actual isolated browser → BFF → Node → PostgreSQL; database title change visible | PASS | PASS |
| Synthetic preview cookie HttpOnly; no service capability/database password in page | PASS | PASS |
| Empty catalog remains empty; disconnected DB 503, no mock fallback | PASS | PASS |
| Dedicated backup LOGIN export; tampered backup digest refused | PASS | PASS |
| Fresh-cluster role/schema/data restore: ledger 35 / tables 92 / policies 83 | PASS | PASS |
| Restored minimal LOGIN, HTTP and browser replay | PASS | PASS |
| Final successful-run containers/volumes and credentials removed | PASS | PASS |

Backend existing typecheck/build and complete suite: **132/132 PASS**. Website typecheck, targeted ESLint and catalog BFF tests: **3/3 PASS** (including real upstream DTO/extra-field validation and redirect refusal). Existing broader website build/regression and four 0035 fresh/upgrade checks are additionally run by the existing GitHub workflows against the pushed candidate; their exact SHA/run result is recorded by the execution closeout, not inherited from PR42.

Reproduce from an installed checkout, without existing credentials:

```sh
cd "Phoenix Compass/education compass/server"
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
# Install the website's existing lockfile dependencies and its workerd postinstall.
# Provide PLAYWRIGHT_MODULE pointing to an isolated installed Playwright package.
cd ../../..
node database/canonical/verification/catalog-e2e.mjs 16
node database/canonical/verification/catalog-e2e.mjs 17
```

The runner accepts only 16/17, creates randomly named/labelled disposable containers, binds PG and web ports to loopback, requires SCRAM on local sockets and TCP, generates credentials, and refuses to overwrite an existing website `.dev.vars`. It never accepts an existing database URL. PostgreSQL images and the CI Playwright version are fixed. Windows uses an isolated installed Edge context when bundled Chromium is absent; CI uses installed Chromium. Browser external requests are blocked.

Backup digests are checked before restoring both dump and password-free roles export. The in-memory manifest is **unsigned**; replacing both files and manifest is outside its integrity guarantee. This rehearsal does not settle backup destination/encryption/retention/RPO/RTO policy.

Failed attempts are preserved privately: Windows directory copy/ACL and native runtime/browser setup, a Worker redirect-mode compatibility issue, and the synthetic backup role's missing CONNECT were corrected before the final complete runs. None is counted as a PASS. One failed-run protected temporary configuration directory was preserved after automatic deletion approval was rejected; its synthetic database/container was removed, credentials are inactive and unreferenced. No such files were committed. This exception is distinct from the successful runs' cleanup checks.

**NOT RUN / HOLD:** real OIDC/customer identity, Family/Student projection, public anonymous catalog release, booking/payment/lesson-hour changes, full four-domain write E2E, production/browser rollout, Tencent upgrade. Existing personal authorization and consent tests are not replaced by this non-personal catalog test.
