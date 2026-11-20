# Family OS ↔ Corporate OS Data Contract

**Status: existing read contracts retained; 0043 database handoff is a candidate with no HTTP route.** Both systems refer to the same canonical `person_id`, `family_id`, `client_id`, `service_project_id` and task IDs. Neither stores a second customer or student master.

| Concept | Canonical authority | Existing / proposed interface | Allowed projection |
|---|---|---|---|
| One person and family | `core.people`, `core.families`, `core.family_memberships` | Existing Family OS read routes | Family context and guardian scope only |
| Organization and selected role | 0042 `core.organization_memberships`, `auth.workspace_role_bindings` | Existing candidate `GET /v1/me/workspaces`, `POST /v1/workspace-contexts` | Current active binding, no browser role trust |
| Service delivery | `service.projects`, `service.project_assignments`, `service.tasks` | Family OS dashboard and 0042 `GET /v1/staff/projects` candidate | Resource-scoped read, not commercial ownership |
| Commercial origin | `crm.lead_attributions`, `crm.referrals`, `crm.partner_relationships` | Existing CRM service APIs | Immutable First Touch and explicit referral facts |
| Task handoff | 0043 `service.task_handoff_requests/events` | SQL functions only; trusted HTTP adapter **NOT RUN** | Staff sender and named recipient, same organization/project, task responsibility only |
| Documents and AI | `docs.documents`, `docs.document_versions`, Consent and audit | DB-04 future contract **HOLD** | Versioned subject and purpose check each use |
| University journey | `education.academic_record`, `education.applications`; DB-03 study enrollment candidate | DB-03 future contract **HOLD** | Student identity unchanged across projects |

## Proposed 0043 SQL result contract

- `service.read_task_handoff_inbox()` returns `{status: ALLOW, data: {contractVersion: task-handoff-inbox.v1, asOf, items}}`, `DENY`, or `UNAVAILABLE`. Each item contains handoff, task and project IDs; direction; expiry; revision. It omits customer names, student private fields, file keys and partner settlement.
- `propose_task_handoff(handoff_id, task_id, recipient_assignment_id, reason_code, expires_at, event_id)` returns boolean and writes an access decision. Sender must be the current task assignee.
- `accept_task_handoff(handoff_id, expected_revision, task_event_id, decision_event_id)` returns boolean. Named recipient must already have a valid project assignment. `decline_task_handoff(handoff_id, REJECTED|CANCELLED, expected_revision, event_id)` permits recipient rejection or sender cancellation.
- The trusted backend must generate canonical IDs, bind a fresh session ticket, map a stable HTTP idempotency key to IDs, enforce request limits, and clear/discard the connection after use. **This HTTP adapter is not implemented in DB-02.**

The data contract for a full lead/client transfer is intentionally **HOLD**. Its future API needs explicit source attribution preservation, current contact owner, receiving organization, customer notice, the affected project list, consent purpose, effective time, expiry and compensation semantics. Acceptance of a task proposal does not satisfy that contract.
