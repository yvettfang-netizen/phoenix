# P0 Review Decisions｜Canonical Simplification Phase 2

Date: 2026-11-20
Scope: DB-01 0042 context consolidation and DB-02 0043 task handoff review.

## P0-A｜0042: reuse Canonical context infrastructure

**Decision: keep the workspace-specific persistent login session; remove duplicate temporary ticket/context tables.**

Formal migrations 0007/0008/0012/0022 already provide:

- `auth.session_contexts` with backend PID + backend_start identity.
- `auth.context_exchange_tickets` with one-use, intended-principal and expiry checks.
- `auth.bind_context()`, `auth.issue_context_ticket()`, `auth.redeem_context_ticket()`, `auth.clear_context()`.
- Existing FAMILY / ADVISOR / PARTNER / INTERNAL / STAFF channel vocabulary and STAFF teacher/supervisor support.

0042 therefore keeps only `auth.workspace_sessions` for the browser login session, context-token digest and authorization versions. It extends the two existing Canonical tables with nullable `workspace_session_id` and `workspace_binding_id`; it does not create `auth.workspace_context_tickets` or `auth.workspace_session_contexts`.

Safety requirements now tested:

1. One backend connection holds one active Canonical context row.
2. Workspace redemption only consumes a ticket carrying workspace references.
3. Legacy redemption only consumes a ticket without workspace references.
4. Each rebind replaces the previous context and clears the other flow's workspace references.
5. Live workspace context rechecks backend PID + backend_start, session status/expiry, current binding/membership authorization versions, actor, family and channel.
6. Separate binder and reader LOGINs; no runtime direct table privileges.
7. Revocation and logout invalidate the workspace session and its context.

**Current evidence:** PR #77 current candidate SQL SHA `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`; PG16 and PG17 each 20/20 synthetic acceptance groups PASS in workflow [44702823335](https://github.com/yvettfang-netizen/phoenix/actions/runs/44702823335). PR remains Draft; real identity integration and deployment remain HOLD.

## P0-B｜0043: do not add a second task-transfer authority

Formal migration 0035 already defines `service.transfer_task(uuid,uuid,text,uuid)`. It locks the task row, checks the task/project state and same-project active assignment, changes the assignee, writes the immutable `TRANSFERRED` task event and records the write decision.

The isolated 0043 candidate is not a pure duplicate: it adds a proposal/accept/reject/cancel/expire lifecycle, recipient inbox, concurrency control, and stricter same-organization Staff membership/workspace checks. However, its accept function directly updates `service.tasks` and inserts a `TRANSFERRED` row instead of reusing the formal transfer function. It therefore introduces a second task-mutation/event path.

**Decision for current phase:** no Founder-approved requirement for a two-party approval inbox has been established. Ordinary transfer should continue through formal `service.transfer_task()`; do not promote 0043 into the Canonical migration sequence.

**Repository state:** PR [#78](https://github.com/yvettfang-netizen/phoenix/pull/78) is closed and unmerged. PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82) is based directly on 0042 and explicitly excludes 0043.

If a recipient-acceptance workflow is later required, open a new scoped design gate. It must reuse the existing transfer mutation/event authority rather than duplicate `UPDATE service.tasks` and `TRANSFERRED` insertion. Any Staff-specific authorization extension to `service.transfer_task()` must be separately reviewed; the current formal function's service-management/family context is not automatically equivalent to a Staff workspace context.

## Release boundary

Neither decision authorizes merging PR #77, applying migrations to a shared environment, connecting real identity providers, or deploying to production. Those remain separate Founder gates.
