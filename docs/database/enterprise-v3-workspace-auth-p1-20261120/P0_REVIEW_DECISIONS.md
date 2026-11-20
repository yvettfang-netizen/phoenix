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

**Current evidence:** PR #77 candidate SQL SHA `9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`; PG16 and PG17 each 20/20 synthetic acceptance groups PASS in workflow [44719124928](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928) at code commit `b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91`. PR remains Draft; real identity integration and deployment remain HOLD.

## P0-B｜0043: do not add a second task-transfer authority

Formal migration 0035 already defines `service.transfer_task(uuid,uuid,text,uuid)`. It locks the task row, checks task/project state and a same-project assignment whose status is ACTIVE and whose `valid_until` has not passed, changes the assignee, writes the immutable `TRANSFERRED` task event and records the write decision.

**Important boundary found in the actual 0035 SQL:** the existing function does not check `valid_from <= now()`, recipient Principal status, or a permitted assignment-role set. Its authorization path also requires `service.is_service_management_service()` and the current Family context to match the project. It is therefore the existing service-managed transfer authority, not a drop-in Staff-workspace transfer API.

The isolated 0043 candidate is not a pure duplicate: it adds a proposal/accept/reject/cancel/expire lifecycle, recipient inbox, concurrency control, and stricter same-organization Staff membership/workspace checks. Its `task_handoff_party_is_current()` additionally checks `valid_from`, `valid_until`, Principal status, active organization membership, workspace role and allowed assignment roles. However, its accept function directly updates `service.tasks` and inserts a `TRANSFERRED` row instead of reusing the formal transfer function. It therefore introduces a second task-mutation/event path.

**Decision for current phase:** no Founder-approved requirement for a two-party approval inbox has been established. Ordinary service-managed transfer should continue through formal `service.transfer_task()`; do not promote 0043 into the Canonical migration sequence. If Staff workspace task transfer is required, first extend the existing transfer authority or factor one private shared mutation helper, add the missing `valid_from`/Principal/role checks, and make any approval wrapper call that single authority.

**Repository state:** PR [#78](https://github.com/yvettfang-netizen/phoenix/pull/78) is closed and unmerged. PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82) is based directly on 0042 and explicitly excludes 0043.

If a recipient-acceptance workflow is later required, open a new scoped design gate. It must not create a second task-update/event path. Any Staff-specific authorization extension to `service.transfer_task()` must be separately reviewed; the current formal function's service-management/family context is not automatically equivalent to a Staff workspace context.

## Release boundary

Neither decision authorizes merging PR #77, applying migrations to a shared environment, connecting real identity providers, or deploying to production. Those remain separate Founder gates.


## P0-C｜0042: remove legacy multi-level partner workspace taxonomy

**Decision: keep legal organizations and their independent commercial ownership; reduce the workspace taxonomy to Headquarters and Channel.** The previous candidate's `REGIONAL_PARTNER`, `FRANCHISEE`, `CHANNEL_AGENT` and `SUB_PARTNER` workspace organization kinds were unnecessary hierarchy. They are removed from the candidate. Distinct legal Channel organizations remain separate Canonical `core.organizations` rows, with their own memberships, project scopes, contracts and accounting attribution.

The workspace kinds are now `FOUNDER`, `STAFF`, `CHANNEL` and `FAMILY`. Channel workspace roles are `CHANNEL_ADMIN` / `CHANNEL_MEMBER`. The legacy database context channel `PARTNER` remains unchanged for compatibility with formal migrations 0001–0037; it is not a new workspace tier.

## P0-D｜Teacher: reuse formal Education authorization

**Decision: no second teacher identity, student scope or assignment table.** Formal 0022 already defines `auth.principals` TEACHER principals, `learning.teacher`, `learning.teacher_assignment` and `learning.teacher_has_class_access()`. 0042 adds only `STAFF_TEACHER` as a role within the existing Staff workspace. Assignment of this role requires an active TEACHER principal and active `learning.teacher` record. The Staff project read function now explicitly rejects that role; PG16/17 regression confirms 403. Student/class access remains restricted by the existing teacher-assignment and learning-consent checks in 0022. No new teacher/student tables or permissions are introduced.
