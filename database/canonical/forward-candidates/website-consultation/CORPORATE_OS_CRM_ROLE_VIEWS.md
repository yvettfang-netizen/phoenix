# Corporate OS CRM role views — V1 candidate

Status: Draft PR #116 / release HOLD. Architecture frozen by Founder on 2026-11-25:
Phoenix Core → Corporate OS → CRM → Service Project. Family OS remains the family-facing entrance.

## Verified integration boundary

- Extend `staff-workbench.mjs` and the existing private `staff-http.mjs` gateway. No new login, Principal, Session, customer store, permission role or public website is introduced.
- Continue `createStaffSessionAuthenticator`: the host reads its authoritative STAFF session, the Canonical verifier checks the signed assertion, and the host rechecks revocation. Only verified issuer/subject reach SQL. Browser Principal/role headers confer no permissions.
- `auth.resolve_external_identity`, ACTIVE ADVISOR Principals, existing `crm.website_consultation_staff_grants`, contract-to-organization bindings and ACTIVE organizations determine the two usable views on every request. These are candidate grant contracts, not proof of any real employee's production assignment.
- An unmapped contract, wrong organization/domain, family/person-linked lead, expired/revoked grant or disabled identity yields no scoped records. Website consultation grants do not authorize family records.
- Reuse `crm.leads`, `crm.follow_ups`, `crm.lead_events` and existing duplicate review/merge commands. Contact reads still use `crm.read_website_consultation_contact`, commit the read audit, then decrypt server-side. No email or digest enters overview/history/workload DTOs.
- Inspecting `crm.deals` (0027) and Service Project contracts (0033/0034, service-workbench candidates 0038/0039) confirms separate family, project assignment and Consent requirements. No organization-scoped Founder bridge to those records is verified. The current customer BFF is a development-only CUSTOMER bridge, not an employee SSO adapter. Do not reuse its synthetic session route as staff login.

## Employee route and APIs

Use the configured private staff gateway behind the existing Corporate OS employee entry:

`GET /internal/website-consultations/workbench`

The same page provides authorized Dispatcher/Adviser perspectives and a clearly labeled Founder HOLD design preview. This change supplies no production hostname and does not claim that Corporate OS SSO/navigation is deployed.

| Route suffix under `/internal/website-consultations` | Result |
| --- | --- |
| `/views` | Current DB-authorized view names; Founder HOLD status |
| `/views/DISPATCHER` | Organization/domain-scoped overview, workload, queue and safe history |
| `/views/ADVISER` | Assigned lead/follow-up scope, own overview, permitted actions and safe history |
| `/views/FOUNDER` | 403 `FOUNDER_SCOPE_UNCONFIRMED`; no statistics or records |
| `/{leadId}/contact` | Existing audited, assigned-Adviser contact reveal |
| `/{leadId}/assignees`, `/assign`, `/reassign`, `/cancel`, `/complete` | Existing SQL-enforced commands |
| `/duplicates` and `/duplicates/{propose,review,merge}` | Existing dispatcher scope, both-lead checks, independent review and audited merge |

View selection narrows an existing grant; it cannot grant another role. An unknown view, query-string scope selector or browser organization identifier is not accepted. Existing legacy queue endpoints remain scoped by their existing SQL contracts.

The new `staff-views.sql` is unnumbered and follows `intake.sql` and `staff-queue.sql` in a fresh disposable fixture only. It adds four read/helper functions, not tables or permission grants to employees. No shared installation or formal migration is authorized. Existing installations need a separately reviewed forward installation plan; do not rerun CREATE-only candidate files on a populated database.

## Enforced permission matrix

| Capability | Founder | Dispatcher | Adviser |
| --- | --- | --- | --- |
| Overview | HOLD; placeholders only | Authorized organization/domain | Assigned leads/follow-ups only |
| Queue/history | HOLD | Same scope | Same assigned scope |
| Assign/reassign/cancel first follow-up | No automatic grant | Existing dispatcher grant and lead/task state | Denied |
| Reveal contact | No automatic grant | Denied by dispatcher role | Existing Adviser grant, assignment, live retention and read audit |
| Complete first follow-up | No automatic grant | Denied by dispatcher role | Assigned lead owner, live Adviser grant, pending website task |
| Duplicate proposal/review/merge | No automatic grant | Existing two-lead scope and independent reviewer | Denied by Adviser role |
| Verify identity / family records / contracts / Service Project | HOLD | No automatic grant | Separate existing authorization required; UI integration HOLD |

An employee with both verified grants may switch views. Operations always recheck the required grant and object scope independently of the selected page. A Dispatcher perspective does not erase a separate Adviser grant held by the same Principal, nor confer one.

Summaries aggregate before the newest-100-row display limit. Workload counts only tasks on scoped leads. Day boundaries use Asia/Shanghai. Contact/history rows are cleared on refresh, view switch, page hide, auth failure and authorization failure; outstanding requests are aborted and stale responses ignored.

## Founder candidate design — blocked authority, not superuser access

The preview shows five metric placeholders, the consultation → assigned → contacted → verified client → signed → Service Project chain, and the requested operating-risk categories. It makes no customer-count or sales claim.

Before any Founder data query can be enabled, the Canonical identity/authorization owner must identify and approve the existing authority for all of:

1. The real Founder issuer/subject → Principal binding and active employee session.
2. Explicit management organizations and domains, grant validity/revocation and authoritative grant revision/source. A title, acquisition contract's `responsible_role='FOUNDER'`, general CRM SERVICE Principal or Dispatcher grant is insufficient.
3. Permission to aggregate family-linked clients/deals/projects, including how existing family/project scope and Consent apply. Define conversion denominators, distinct-client rules, signed-contract source and Service Project handoff meaning against the existing records.
4. Any separate contact or audit-query permission. Aggregation must never imply unrestricted contact access. Do not return lead/client identifiers in the default Founder overview.

No Founder grant is created by this candidate. Confirm the authority before designing a forward change; keep the hard denial until reviewed. New-customer, converted-customer, signed-sales and project figures remain HOLD rather than substituting unverified consultation counts.

## Evidence and remaining delivery

The existing PG16/17 consultation workflow loads the new read candidate and exercises role-scoped SQL/API projections, spoofed-role denial, unmapped/cross-organization and family exclusions, live role and external-identity revocation, sensitive DTO exclusion, contact audit, and existing assignment/duplicate/conversion/deletion/recovery regressions.

Chromium verifies Dispatcher, Adviser and Founder HOLD at 320, 390 and 1440px; no horizontal overflow; assignment, overdue work, contact auditing, completion, duplicate review, original-session grant revocation and session invalidation. Previews are synthetic and are uploaded as per-PG-version CI artifacts. Local `--staff-browser-only` explicitly skips the public website Worker; CI runs the full existing Worker browser suite without that flag.

Real employee SSO, authoritative production organization/domain grant bindings, STAFF Consent end-to-end, Founder management authorization, family-scoped identity-request UI, deal/contract/project read integration and Corporate OS navigation binding remain unverified/HOLD. Do not ask Jimson to repeat the two synthetic private Staging flows or his existing single-organization evidence in #115. Only genuinely missing identity/authorization configuration and new approved runtime integration require fresh receipts.

Formal migrations 0001–0037 remain unchanged. No merge, shared/production database installation, production release, DNS or indexing change is included.
