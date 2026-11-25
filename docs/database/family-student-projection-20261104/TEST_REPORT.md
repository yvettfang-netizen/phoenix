# Family / Student projection synthetic acceptance

Only synthetic records, newly labelled disposable PG16/17 clusters and isolated browser contexts. Existing databases, old data, production and Tencent were not connected or changed.

| Acceptance | PG16 | PG17 |
|---|---|---|
| Fresh Canonical 0001–0035 | PASS | PASS |
| Separate real binder/read LOGIN, no superuser SET ROLE substitute | PASS | PASS |
| No context = zero family rows; app issuance/DML/audit forgery and role escalation denied | PASS | PASS |
| Wrong-principal and replay ticket refusal | PASS | PASS |
| Exact family/student DTO loaded from Canonical, no legacy Store/auth | PASS | PASS |
| Verified guardian or student self only; unrelated household member excluded | PASS | PASS |
| Legacy, future, expired guardian and expired student membership excluded | PASS | PASS |
| Cross-family target, unknown subject/mapping, wrong family, disabled principal/identity/member expired denied | PASS | PASS |
| ADVISOR, CHANNEL and SERVICE cannot use FAMILY-only route | PASS | PASS |
| Forged/wrong issuer/audience/expired proof denied | PASS | PASS |
| Client query/header identity assertions, writes and unknown resources refused | PASS | PASS |
| Concurrent A/B/A through pool size 1; context/tickets zero after success and denial | PASS | PASS |
| Excessive app-role membership refused; metadata-only outcome audit | PASS | PASS |
| Actual browser → BFF → JWT → binder → ticket → read-role RLS → DTO | PASS | PASS |
| Canonical student-name update visible; browser A/B/A isolated; JWT HttpOnly | PASS | PASS |
| Guardian/mapping revocation and identity disable deny next read, no UI fallback | PASS | PASS |
| Database disconnect returns unavailable and does not crash Node | PASS | PASS |
| Dedicated backup LOGIN; dump/role digest tamper refusal | PASS | PASS |
| Fresh-cluster restore: ledger 35 / tables 92 / policies 83; HTTP/browser replay | PASS | PASS |
| Successful-run containers/volumes/configuration and fixture directory cleaned | PASS | PASS |

Backend typecheck/build and full suite: **136 PASS**. New website BFF tests: **2 PASS**, including typed whitelist, byte limit, redirect/header/cookie refusal; website typecheck/targeted ESLint pass. Existing P0 catalog tests and whole-application checks also run on the pushed candidate; precise remote commit/check outcomes are archived separately and must not be inherited from PR45.

Reproduce using the existing backend build and installed website dependencies, workerd and a pinned isolated Playwright:

```sh
cd "Phoenix Compass/education compass/server"
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
cd ../../..
node database/canonical/verification/family-projection-e2e.mjs 16
node database/canonical/verification/family-projection-e2e.mjs 17
```

Only version 16/17 is accepted; no existing DB URL parameter. Passwords are generated into protected files and never argv, all PG socket/TCP connections require SCRAM, and host ports bind only loopback. Browser external requests are blocked. The unsigned backup manifest gives digest integrity, not authenticity if files and manifest are both replaced. Operational backup policy remains HOLD.

One local run exposed a checked-out PostgreSQL client error event on database shutdown; handling was fixed without relaxing request/cleanup denial. Its output is preserved as FAIL and the corrected full tests were rerun. Automatic approval rejected deletion of the failed-run temporary preview configuration with only `blocked by policy`; it was moved to the owner-only failed-run fixture directory and retained. The associated test container/volume was label-verified and removed; credentials are inactive, unreferenced and absent from Git. This is additional to the historical P0 retained fixture, which was not touched. Final successful-run cleanup does not mean all historical temporary files were deleted.

**HOLD / NOT RUN:** real identity/provider/JWKS, final public-ID translation, real customer/student import, formal persistent database read-decision audit, stronger in-flight revocation guarantees, sensitive Consent/learning/medical data, live login/logout UX, production and Tencent. These tests cover the narrow synthetic summary contract only.
