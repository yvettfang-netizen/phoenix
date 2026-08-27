# Phoenix Family OS™ Technical Debt Register

- Last reviewed: 2026-08-27
- Status values: OPEN / BLOCKED / ACCEPTED-DEFERRED / CLOSED

| ID | Priority | Status | Debt / impact | Closure evidence |
|---|---|---|---|---|
| TD-001 | P0 | OPEN | `touristappid` and fixed local family identity; no production user isolation | controlled AppID + server code exchange/session + negative tests |
| TD-002 | P0 | OPEN | Family/Child/report/timeline data is primarily local; no production lifecycle | managed datastore + encryption + migration/backup/export/deletion/retention evidence |
| TD-003 | P0 | OPEN | Advisor/Admin Demo has no assignment, consent or trusted server RBAC | server identity/RBAC/assignment/consent/audit + negative tests |
| TD-004 | P1 | BLOCKED | no current WeChat DevTools compile evidence | DEV-01–DEV-06 evidence |
| TD-005 | P1 | BLOCKED | no iPhone + two-Android device matrix | recorded device results without open P0/P1 |
| TD-006 | P1 | BLOCKED | official Logo source/sign-off unavailable | approved source file + asset/hash/sign-off record |
| TD-007 | P1 | OPEN | Growth Blueprint and Reminder are not implemented | separately approved contracts and tests; do not create placeholders |
| TD-008 | P1 | OPEN | NOVA service is not implemented; current provider is local rules | approved model/service, least-privilege data, version/audit, write preview/confirmation and safety tests |
| TD-009 | P2 | ACCEPTED-DEFERRED | Compass draft is not persisted | approved draft/privacy contract and regression tests |
| TD-010 | P2 | OPEN | lint absent and typecheck scope limited | approved lint/type strategy and CI evidence |
| TD-011 | P2 | OPEN | no automated WeChat E2E, visual regression, performance or accessibility baseline | approved tooling and stored evidence |
| TD-012 | P2 | OPEN | local schema lacks production constraints/history/source confirmation | approved datastore contract and additive migration tests |

Internal Demo may not hide TD-001–003; they remain explicit Demo boundaries. Public RC and real family use require TD-001–003 and all applicable P1 items to close.
