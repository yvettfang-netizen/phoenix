# P1 verification — scope and reproduction

Only synthetic records in actual owned PostgreSQL16/17 containers. No static Mock project array is an acceptance substitute. Browser contract-unit fixtures are labelled separately from actual DB/API/browser tests. No real customer, identity provider, clinical record, payment or contract is imported.

## Commands

Run existing backend `npm run typecheck`, `npm run build`, `npm test`. Run existing website typecheck/lint/build and full test workflows. The targeted contract command includes `tests/family-os-dashboard.test.mjs` plus the existing workbench/family-center/projection files; currently18 local tests PASS.

From repository root:

```
node database/canonical/verification/v0038/verify-source.mjs
node database/canonical/verification/family-os-p1/api.mjs 16
node database/canonical/verification/family-os-p1/api.mjs 17
node database/canonical/verification/family-os-p1/browser.mjs 16
node database/canonical/verification/family-os-p1/browser.mjs 17
```

Browser runner needs PLAYWRIGHT_MODULE pointing to the existing isolated Playwright1.62.1 installation. The scripts accept FAMILY_DASHBOARD_EVIDENCE_DIR; outputs are JSON/raw logs and synthetic PNGs. Passwords are generated in memory/private fixture files, never output or passed on command line. Containers expose127.0.0.1 only. Each runner cleans its own labelled container/volume and verified temporary directory. It refuses an existing preview config instead of overwriting another running site.

## Acceptance matrix

| Requirement | Permanent actual-data test |
|---|---|
| T01 | Education account sees its actual authorized projects only |
| T02 | Separate Identity-only principal sees its own Identity project, no Education rows |
| T03 | Dual account has two canonical projects and independent tasks; paid/signed unopened project excluded |
| T04 | Empty account shows zero projects and exploration; absent assessment source produces no invented record |
| T05 | P0 manager actually closes a project; archived view has no active next action |
| T06 | Same-family adult denied and excluded from counts; verified minor guardian scope positive; unshared detail denied |
| T07/T08 | Current principal CLIENT tasks only; PENDING→IN_PROGRESS→COMPLETED uses real command, SQL status and refreshed home count |
| T09 | Every link uses actual canonical project UUID; browser opens actual P0 detail and returns home |
| T10 | Patient-authorized Health source title canary is removed from the ordinary dashboard; no clinical free-text records projected |
| T11 | Anonymous API401, family-purpose restriction, real account sign-in link; mixed D1 identity refused |
| T12 | Actual English/Chinese1440/390 pages, no overflow |
| T13 | Real protected-audit INSERT failure refuses aggregate; UI removes cards/counters; repair reauthenticates and recovers |
| T14 | Real source subject/guardian revocation and manager termination retract count/card and refuse direct detail; bounded DOM expiry |
| T15 | Existing Education/Identity/Wealth/Health, website, P0 and Canonical CI at the final exact P1 SHA |

The new CI matrix runs both API and real browser suites on16/17. Existing P0 CI still runs full workbench/read audit/fresh-cluster restore and website regressions. No P1 schema migration or independent P1 recovery claim is inferred from that inherited restore test.

## Current report versus final evidence

At document drafting: local API PG16/17 PASS, backend146 tests PASS, website types/lint/18 targeted contracts PASS; browser and exact-commit CI continue until their recorded results. Final PR body and private fixed-SHA execution report contain the actual completed matrix/run links. A preliminary document is not itself test evidence.

Failed initial browser attempts are retained. The first waited for networkidle on a deliberately polling page; navigation now waits for DOM readiness and asserts actual private states. A counter test initially observed the intentional clear-before-refresh interval; it now waits for the server-confirmed new state, then checks the SQL row/count. A card-link locator omitted its visible arrow; hrefs and actual detail navigation are asserted directly. Account-switch review also stopped pre-login polling so the previous cookie cannot repaint during the transition. No existing unrelated product test is weakened.

The browser also exposed a real pre-hydration issue: the synthetic account form could natively GET-submit its selected alias before React attached its handler. Its select/button now remain disabled until client hydration; the permanent No-JS probe requires a disabled form and zero private cards. This changes only the explicitly gated synthetic preview control, not the existing customer login implementation.

HOLD: real provider/D1→Canonical facts; actual assessment/consultation projection; generic adult sharing semantics; real commercial source and document/patient policy; production revocation SLO, independent acceptance and deployment. No tests against real customers or production were run.
