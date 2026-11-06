# Service Project Workbench V1 — current state and bounded implementation

Task PHOENIX-SERVICE-PROJECT-WORKBENCH-V1. Execution date2026-11-05. Development and synthetic acceptance only; no deployment, production migration or real-data modification.

## Fixed sources

- Main: `yvettfang-netizen/phoenix@9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`; merged Canonical0001–0035.
- Existing Family Center UI: [PR57](https://github.com/yvettfang-netizen/phoenix/pull/57), fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683.
- Isolated0036/0037/BFF: [PR55](https://github.com/yvettfang-netizen/phoenix/pull/55),5414c18ca521d8b8eae1f650102485749e6ebd3a.
- Recovery candidate: [PR58](https://github.com/yvettfang-netizen/phoenix/pull/58),a0123c7f39292274962b72b73c06828b85770599,20/20CI. This task branches from that candidate; none of those PRs is treated as merged.
- New branch: codex/service-project-workbench-20261105. Existing worktree reused after a clean-state check; no clone or unrelated worktree change.
- Education PR9/25/26/27, Identity PR35, Health PR53/56, Logo PR30, Family OS PR11/14 remain independent. No source from those branches is overwritten or silently merged.

## Reuse and gaps

| Authority | Existing implementation | Workbench change |
|---|---|---|
| People/families/principals | core.people/families/family_memberships/student_profiles; auth.principals | Reuse UUIDv7 IDs; no replacement identity tables |
| Customer | crm.clients; CRM leads/deals/referrals | Reuse project.client_id/deal_id; WON is not payment or a signed contract |
| Project | service.projects/project_parties/project_subjects/project_assignments/project_events | Controlled client/advisor projections and commands; no project master copy |
| Tasks/milestones/deliverables | service.tasks/task_events/project_milestones/deliverables/delivery_events;0035 version governance | Reuse; add only workbench audience/subject associations and controlled human-principal commands |
| Documents | docs.documents/document_versions/submission_manifests | Reuse immutable metadata/versions; local private object adapter for synthetic files, no COS |
| Applications/catalogue | education.applications/application_status_events/external_facts/institution/program | Existing application per school/program; FK-linked project detail extension for intake/round/outcome/interview/deposit references |
| Contract/payment | No signed-service-contract/payment master found in Canonical.0036 acquisition_contract_revisions is a source-publication contract, not a customer service contract. Legacy Education orders/WeChat payments are not proof of project contract/payment linkage | Read-only authoritative event references through existing phoenix_operations boundary; no contract/payment master, no financial write UI or automatic opening |
| Operations | operations_ref.entitlement_ref/events; phoenix_operations source and separate SERVICE principal | Entitlement is not a payment receipt. Project-specific signing/payment/opening evidence must be separate events, not guessed from entitlement/CRM |
| Family OS | Existing local demo/schema, separate legacy backend; Website V5 has default-off D1 credentials and Canonical read candidate | No legacy migration or account-to-family guess. Reuse website entry and canonical backend; real login/staff mapping remains HOLD |
| Health |0034 patient-specific project authorization; ordinary docs has no HEALTH data_class | Metadata-only workbench; no medical upload, patient report, insurance claim or clinical communication path; existing patient RLS remains unchanged |

## Engineering scope

0038 is a forward **candidate** outside the active migrations directory. It is applied only to labelled disposable synthetic clusters. Existing37 migration files and manifests remain byte-exact. The candidate extends existing service/education/docs objects, with a least-privilege API role, project/subject authorization, audit, idempotency and optimistic concurrency.

The development preview uses explicit, loopback-only synthetic sessions with separate binder/app LOGINs. The UI reads and mutates PostgreSQL through a trusted API/BFF; no hard-coded projects, fake progress percentages, browser SQL or browser-selected principal. Synthetic identity is prominently labelled and is not evidence of a real provider/login integration.

Real issuer/identity/staff mapping, production contract/payment source binding and source event verification, catalogue reconciliation and retention configuration remain HOLD. No document is marked APPROVED/EFFECTIVE by this implementation. Proposed command/state rules are reviewable engineering candidates under this task, not a new production policy freeze.
