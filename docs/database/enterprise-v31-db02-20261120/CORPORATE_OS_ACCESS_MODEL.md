# Corporate OS Access Model — DB-02 boundary

**Status: 0042/0043 isolated candidate.** The role codes below are read from 0042 SQL, not invented user groups. A principal can have multiple bindings but one live selected workspace context per app connection. `auth.workspace_context_is_live()` rechecks its backing session and authorization version. Every handoff function also rechecks the resource and actor.

| Actor / workspace | Workspace enumeration | Existing Staff project projection | 0043 handoff inbox | Propose | Accept / reject | Sensitive family/student documents |
|---|---|---|---|---|---|---|
| Founder / `FOUNDER` | Own active binding | No implicit Staff project right | Deny | Deny | Deny | Separate business authorization required |
| Headquarters Staff Admin, Advisor, Operations / `STAFF` | Own active binding | Only live assigned projects in selected organization | Own proposals on live assigned projects | Current task assignee with live project assignment | Named recipient with preexisting live assignment; sender may cancel | Separate subject, purpose and document consent required |
| Staff Viewer / `STAFF` | Own active binding | Existing projection only | Deny | Deny | Deny | Deny unless separately authorized |
| Regional partner, franchisee, channel agent, subpartner / `PARTNER` | Own active binding | No Staff role inheritance | Deny | Deny | Deny | No parent-organization inheritance |
| Family / `FAMILY` | Own active binding | Existing Family OS contract | Deny | Deny | Deny | Existing family/guardian and consent policy only |
| AI worker / service principal | Separate service contract | No browser workspace identity | Deny | Deny | Deny | Purpose-specific AI permission remains DB-04 HOLD |

The `workspace_organization_kind` values in 0042 are `HEADQUARTERS`, `REGIONAL_PARTNER`, `FRANCHISEE`, `CHANNEL_AGENT`, `SUB_PARTNER`. The 0043 handoff path intentionally allows **Staff** authorization inside any one selected organization, but grants no partner workspace write permission. Organization relationship and referral status alone never imply a task or document permission. The current design does not give Founder broad private-record access.

## Database privileges

| Object | Migrator / owner | `phoenix_canonical_workspace_reader` | app, reader, binder, PUBLIC |
|---|---|---|---|
| `service.task_handoff_requests/events` | Migration-owned, FORCE RLS; migrator policy | No direct SELECT/INSERT/UPDATE/DELETE | No direct rights |
| `service.propose_task_handoff` | Function owner | EXECUTE | No EXECUTE |
| `service.accept_task_handoff` | Function owner | EXECUTE | No EXECUTE |
| `service.decline_task_handoff` | Function owner | EXECUTE | No EXECUTE |
| `service.read_task_handoff_inbox` | Function owner | EXECUTE | No EXECUTE |
| Internal trigger and predicate functions | Function owner | No EXECUTE | No EXECUTE |

Application-side `SET ROLE phoenix_canonical_workspace_reader` is controlled by the trusted app connection. The separate binder connection issues a one-use context ticket. A public client cannot supply `principal_id`, `organization_id` or `role_code` as an authority. The acceptance test verifies distinct restricted LOGIN accounts and real connections. DB-02 does **not** add a trusted handoff HTTP route, so no real client can currently invoke the new database function through the product.

## Revocation and failure behavior

- Session logout, expired context, role revoke, membership disable, project assignment revoke or project closure must fail closed at the next operation; the SQL checks live context and live project scope again.
- A pending proposal naturally expires and a new proposal can be made; the replacement does not reuse an old handoff ID.
- Accept is one atomic transaction across task assignee, task event, proposal state, handoff event and access audit. A duplicate task event key aborts the entire operation.
- No task transfer changes Client, Lead, Partner, Referral, Project Party or Document rights.
- Historical handoff events cannot be updated or deleted through the candidate model. Physical retention and production audit operations require a separate approved policy.
