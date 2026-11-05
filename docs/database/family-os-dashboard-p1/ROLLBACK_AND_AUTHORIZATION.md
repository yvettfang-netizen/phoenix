# P1 authorization, cache and rollback

Development contract candidate, not an APPROVED/EFFECTIVE production policy. Reuses the exact P0 app/binder roles, one-use tickets, backend connection guards, controlled PostgreSQL functions and canonical IDs. No SQL or grants added. Normal login/provider mapping remains HOLD.

| Actor / operation | Result |
|---|---|
| Family member reads own opened project | Existing P0 subject/project authorization required |
| Same-family adult reads unshared project | DENY; absent from cards, counts, actions and direct detail |
| Verified minor guardian | Reuse existing verified capacity + current guardian authority/scope; expiry/revocation retracts access |
| Generic adult family sharing | HOLD; no invented sharing grant or family-admin bypass |
| Adviser/partner uses family aggregate | DENY; assigned staff use P0 workbench separately |
| Client task write | Existing P0 TASK_STATUS, same principal assignee, CLIENT audience, authorized subject, actual revision and allowed transition; no optimistic completed count |
| Completed project | Authorized history and accessible P0 archived details, no next actions |
| Cancelled project | P1 family mode removes projection and refuses detail/download; staff archives and P0 mode-off behavior unchanged |
| Health | Existing patient project scope before presence; no raw title/team/milestone/task/event/medical/document/claim fields in ordinary home |
| D1 account without Canonical mapping | HOLD; real account branch retains priority and cannot receive synthetic records. Mixed credentials rejected. |
| Browser-provided family/role | Rejected before upstream request |

## Four recovery layers

1. **Page/flag:** unset FAMILY_OS_DASHBOARD_ENABLED. Existing Family Center/account/maintenance branches remain. Default/production gates refuse the new aggregate; private state is cleared on hide/focus/account changes and API failures. Never fall back to demo projects.
2. **API/service:** turn off optional backend familyDashboardEnabled and restore prior service artifact. Dashboard becomes unavailable; P0 mode-off retains original contract. Site/API flags must agree. Missing P0 functions/version produces a real error, not a legacy SQLite fallback.
3. **Data compatibility:** P1 adds no table/column/index/function/grant/migration.0001–0038 bytes remain unchanged; the isolated38/100/90 baseline is inherited solely for tests. Disable flags/API first; no destructive down migration. Existing P0 fresh/upgrade/drift/atomicity/RLS/restore CI remains required at the P1 exact source SHA. This is not a production restoration drill.
4. **Business event compensation:** homepage task updates are existing P0 audited commands. A page/API rollback does not undo business events. If an action needs correction, an authorized manager uses the existing reviewed P0 linked compensating/new-task process and source-owner review. Never DELETE/TRUNCATE a task/project/event or silently reactivate completed work.

## Failure and reauthorization

No persisted browser data cache. Each aggregate is private/no-store and expires after two seconds; polling rechecks authority each second. Data is hidden when its lease expires even if the next API call stalls. Visibility/pagehide/account switch clears private data; a generation/sequence guard prevents old responses from painting a new account. Authentication failure, scope denial, audit failure, invalid DTO or unavailable upstream clears cards/counters. Retry performs a new read, not a demo fallback. Unknown write outcome is labelled unconfirmed; no automatic new-key replay or fabricated count.

Server authority changes block subsequent reads immediately. An already delivered DOM has a bounded two-second lease, not an instantaneous cross-device push guarantee. Production approval must choose an acceptable revocation SLO or require a separately reviewed push mechanism. No real RPO/RTO/cache SLO is fabricated.

Tests inject audit failure only into their labelled disposable synthetic database and drop only that injected test trigger/function. They simulate subject/guardian revocation and use actual authorized P0 manager cancellation. No production fault is injected. The P0 retained preview is stopped by its own STOP command before configuring the P1 preview; its source PR and evidence remain intact. New preview uses a separate loopback port, records owner label/work path, and is stopped with STOP newline in an interactive session.
