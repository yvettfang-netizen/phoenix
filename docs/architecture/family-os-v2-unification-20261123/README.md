# Phoenix Family OS™ V2.0 — 单一家庭服务中心整合

Date: 2026-11-23. Founder request: **执行合并** after comparing the existing website Family OS with separate PR #101 target demo.

## Definitive product decision

- **One website route**: `/{locale}/family-center`, retaining the existing customer identity guard and the full `FamilyServiceOverview` / `Service Project Workbench` originally integrated via PR #65. Existing `/{locale}/my-services` drilldown remains unchanged.
- **One data authority**: `phoenix/main/database/canonical`; do not create another Family, User, Student, Consent, notification or AI database.
- **Cherry-pick design ideas, not PR #101's demo runtime**: fold access/guardianship information, authorized service-derived updates, and read-only next-step organizer into existing V2 UI. No `family-service-center-target` route and no simulated roles, fake permissions or synthetic student content in the customer path.
- **Do not mix in other release candidates**: PR #102 (public enquiry website) is separate; #66 was older nav Draft, #92 Academy identity is still security-gated; B0 #94/C0 #95 remain separate.

## Actual integration contents

- The existing FamilyCenterV2 renders P1 `FamilyServiceOverview` for authenticated workbench accounts, unchanged.
- Three additional tabs appear **only** under `p1AccountWorkbench=workbench&&account&&!demo`: `access` / `updates` / `assistant`. The bell routes to updates when that mode is active; old preview and protected behavior stay intact.
- `access` links to the existing account and adviser paths. It does **not** claim that live Consent or guardian writes work.
- `updates` fetches the **existing** `/api/family-services/summary?limit=20` via same-origin credentials and `no-store`. The existing `validFamilyServiceSummary` validator enforces a strictly allowlisted, short-lived Service Project DTO; no raw material, Health sensitive events, internal UUID authority or client-selected family ID.
- Only currently authorized project `customer_todo_count` and `next_milestone` become **read-only summary cards**, explicitly **not** actual delivered notifications, read receipts, email, WeChat, or push.
- `assistant` performs deterministic read-only `nextStepFromAuthorizedSummary` on the **same BFF projection**. No LLM, ASKWISE API or model key; no writes, independent AI session or saved chat history.
- Request handling: AbortController; no-store; permission denial on 401/403; no fallback synthetic fixture; unload/blur/hidden invalidation; max 45-second display lifetime; stale or invalid response clears content; cannot invent permissions.

## Security and product acceptance

1. Old tests for P1 authenticated summary, default-off preview and Family Center remain green.
2. New tests enforce that added panels only appear in trusted authenticated workbench mode and that authorization-sensitive response data comes through the existing BFF DTO.
3. Synthetic negative tests: denied/invalid/expired DTO, Health scope filtering, stale response, no browser persistence, no fake Consent writes and no external AI calls.
4. Exact HEAD website build/typecheck/lint/test, Family Service P1 PG16/17 and unrelated impacted site smoke must pass before GitHub **code merge**. Compare base SHA and changed files before merging.
5. GitHub code merge does **not** authorize Sites publication, Shared/Prod Canonical migration, real Consent API opening, staff messaging/notification service, outbound model call or customer data import. Those require separate Founder release and independent security gates.
6. PR #101 remains a historical visual/demo reference. After verified code merge close it as superseded rather than merging a duplicate route; maintain its history for audit.

## Release gap following code integration

- Real Canonical identity mapping and runtime BFF verification in trusted non-production environment.
- Consent/grant/revoke and Guardian Authority write/read APIs and stateful UI with per-subject review.
- Real notification storage, verified delivery, receipts, unsubscribes and idempotent retries.
- Read-only AI gateway/privacy/data processing approvals; until then show deterministic organizer only.
- Founder approval for hosted Family OS functionality, production environment flags and rollback.

**Do not claim** real live customer access, delivery or AI merely because the code merges.
