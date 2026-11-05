# Family OS P1 — baseline and reuse audit

Task PHOENIX-SERVICE-PROJECT-P1-20261105. Execution2026-11-06 Asia/Shanghai. Development and synthetic acceptance only. No merge, deployment, Tencent connection, production migration or real-data change.

## Fixed baseline

| Source | Audited state |
|---|---|
| phoenix/main |9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc; Canonical0001–0035 merged |
| P0 workbench | [Draft PR59](https://github.com/yvettfang-netizen/phoenix/pull/59),3ceac97abe5503583e5cc179b98293814d1e1b4d,Its own verified baseline was22/22 CI. Still unmerged. |
| P0 dependency chain | PR55 isolated0036/0037, PR57 Family Center, PR58 drills; not assumed merged |
| P1 branch | codex/family-os-dashboard-p1-20261106, branched from PR59 in the existing clean worktree; no clone or main merge |
| Frozen SQL |0001–0037 plus isolated0038 candidate SHA4b82dc15b86b5936258a3d32a1b91ccbaf756e8ca76cd11a609bb6373c934ecf; **no SQL modified or added by P1** |
| Concurrent work | Existing Education, Identity, Wealth, Health, Logo and Family OS PRs remain separate. Only private Family Center route/optional workbench seams and new P1 files change. No public page, logo or other product implementation replaced. |

## Existing routes, authority and gaps

| Item | Evidence in repository | P1 action |
|---|---|---|
| Public website navigation | components/v5-site.tsx already links /{locale}/family-center; Education/Identity/Wealth/Health have existing route families | Reuse links and language convention. No public SEO rewrite. Health exploration link only when its existing preview flag permits it. |
| Family Center | app/[locale]/family-center/page.tsx; default-off V2/D1 account/maintenance branches | New optional private dashboard branch. Maintenance and real customer authentication retain priority. |
| Login/session | db/customer-auth.ts, lib/customer-auth.ts, components/customer-account.tsx; existing username login redirects to Family Center | No new login system. No automatic D1→Canonical identity mapping. Normal Canonical provider/staff/family facts remain HOLD. Mixed D1/synthetic sessions refuse. |
| P0 API | service.workbench_list/snapshot/command, separate app/binder LOGINs and one-use tickets; website service-workbench BFF | Reuse controlled queries, role checks, document scope, task transitions, audit and existing canonical detail URLs. Add optional family-only read aggregation. P0 default behavior remains unchanged. |
| Canonical masters | core.people/families/family_memberships/student_profiles, auth.principals, crm.clients, service.projects and existing associations/tasks/events/docs | No duplicate master, new project ID or SQL table. family.id comes from the trusted server identity; displayed title comes from authorized self subject, otherwise neutral heading. |
| Contract/payment/opening | P0 immutable source references, distinct signing/payment/opening; actual real source verification incomplete | No payment inference or financial writes. Only explicitly opened, currently authorized projects count. |
| CRM/Compass handoff | Existing CRM/client/deal/project links; project.primary_domain is authoritative. Legacy Education backend has separate assessment/order data | No SQLite read, lead→project fabrication, inferred First Touch or FAMILY_COMPASS→WEALTH mapping. Actual assessment projection and real source reconciliation HOLD. |
| Family sharing | P0 self or verified minor guardian authority and subject/project scope | Reuse existing verified guardian sharing. Household membership alone grants no adult project access. New generic adult sharing semantics HOLD. |
| Health | Patient-authorized P0 project summary; clinical paths closed | Ordinary homepage strips free-text project title, team, milestones, tasks and events; neutral Health card only. No medical/claim/document content. |

## Scope status

**PASS at mechanism level:** database-backed different-client projections, authorized task transitions, source counts, history, default-off route, guarded refresh and refusal behavior. Actual per-version test facts are in [VERIFICATION.md](VERIFICATION.md) and final fixed-SHA closeout evidence.

**HOLD:** P0 merge/promotion, normal provider/D1 mapping, real staff/subject registration, assessment/consultation projection, formal Identity/Wealth templates and patient clinical APIs, business/document policy and independent acceptance. No file is marked APPROVED/EFFECTIVE by Codex.
