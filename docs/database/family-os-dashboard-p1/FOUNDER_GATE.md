# P1 Founder acceptance gate

**Development candidate only. Merge / production / real identity / real-data changes HOLD.** Codex implementation is not a Jimson or independent reviewer signature. Existing approved ID/taxonomy/consent boundaries remain unchanged.

## Delivered paths

| Surface | Implementation |
|---|---|
| Existing /{locale}/family-center | Optional FamilyOsDashboard in the existing route, after maintenance/real-account priority |
| Homepage view | Authorized project cards, counts, own next actions, public event updates, completed history and four Compass exploration navigation |
| Aggregate API | GET /api/family-os/dashboard; same-origin no-store BFF, existing opaque session and trusted P0 server |
| PostgreSQL | Existing P0 list/snapshot/command functions and RLS only; no new SQL, grants or project ID scheme |
| Detail / task actions | Existing canonical /{locale}/my-services/{id} and P0 TASK_STATUS; no second workbench |
| Flags | FAMILY_OS_DASHBOARD_ENABLED + existing workbench flags + development mode; optional backend familyDashboardEnabled |

## Dependencies and HOLD

| Gate | Status / next evidence |
|---|---|
| P0 code exists | PASS at fixed PR59 baseline; still Draft/unmerged. P1 is an independent stacked PR, not permission to merge P0. |
| Actual synthetic different-account acceptance | Run PG16/17 API and browser matrix; final exact SHA/CI evidence required |
| Normal customer login | Existing account sign-in/Family Center redirect retained. Real D1/provider→Canonical family binding remains HOLD; no fabricated issuer, identity or staff mapping. |
| Family sharing | Existing verified guardian scope works; family membership alone is insufficient. Generic adult sharing source/grant semantics HOLD. |
| Assessment / consultation records | Source contract/projection absent; NOT_CONNECTED, no fake results or purchased project inference. |
| Identity/Wealth/Health full business workflows | P1 displays existing authorized summaries; does not approve those templates or clinical content. |
| Revocation visibility | Server next-read denial plus two-second displayed-data lease verified. Production must approve the revocation SLO or a trusted push contract; no instantaneous cross-device erasure claim. |
| Commercial, document, backup and production policy | Existing P0 HOLDs remain; P1 creates no authority to import/update real facts. |
| Independent/Founder acceptance | HOLD until actual fixed-SHA review; no generated signatures |

## Local review

After existing backend build, run `node database/canonical/verification/family-os-p1/preview.mjs` from repository root in an interactive terminal. It refuses an existing preview configuration. The prior owned P0 preview must be stopped via its own STOP command, never overwritten. Preview uses only an owned loopback PG16/API/site, default port4692. Synthetic account selector is labelled; it does not represent real normal login.

Use Education, Identity-only and Dual-services accounts on the same /family-center URL. Confirm different actual project IDs/content. Complete one own task and inspect its real P0 detail/SQL evidence. Verify empty/history/guardian/Health states. The real website account remains unbound; it must not inherit these test accounts.

Send `STOP` newline to the retained interactive process for cleanup. Its label/PID/private work path are recorded in ignored out/family-os-dashboard-p1/retained-preview.json. No shared database, historical volume or real project is deleted. No hosted/production deployment is performed.

**Unique next action:** review the fixed P1 PR and retained synthetic two-account homepage flow against this gate; obtain actual acceptance and missing identity/source facts before any proposal to merge/promote/activate. Do not merge protected branches or deploy automatically.
