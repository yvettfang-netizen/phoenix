# P1 authorized homepage contract — development candidate

`GET /api/family-os/dashboard` → existing loopback workbench BFF → optional `GET /v1/service-workbench/dashboard` → existing P0 controlled PostgreSQL functions. No new SQL, role grant, identity mapping or data source.

Website needs both SERVICE_WORKBENCH_ENABLED=true and FAMILY_OS_DASHBOARD_ENABLED=true, **development mode only**. Upstream must remain loopback. Backend optional familyDashboardEnabled defaults false; normal application bootstrap does not instantiate the service. Missing P0 functions/flags fail closed. Browser PostgreSQL access is prohibited.

## Mapping

| Logical field | DTO | Verified source / filtering |
|---|---|---|
| family_id | family.id | Trusted server-resolved identity.familyId, never a browser parameter |
| Authorized customer title | viewer.label | Authorized P0 self subject name; null when unavailable. No invented family name. |
| Viewer permissions | viewer.permissions | Family-only projection capability; not an authorization grant. Each task write still checked by P0. |
| service_project_id | projects/history.id | Existing UUIDv7 service.projects key |
| project_type | projectType | P0 workbench template |
| display name / Compass | displayName / compass | P0 project name / primary_domain; Health name replaced by neutral product label |
| Lifecycle / stage | lifecycleStatus / currentStage | Actual P0 statuses, never a percentage or admission inference |
| Advisor | advisors | Current active assigned team except observer role; Health omits all names |
| Next milestone | nextMilestone | Authorized pending P0 milestone, earliest dated first; null for history/Health |
| Client action count | customerActionCount | Current ACTIVE non-Health project tasks assigned to this principal, CLIENT audience, authorized subject, actionable state only |
| Latest public event | latestPublicEvent | Existing P0 client-visible event with supported kind/id/time; no body/filename/financial reference. Health omitted. |
| Detail URL | detailPath | /my-services/{existing canonical UUID}; locale added by UI |
| Assessments | assessments.availability | NOT_CONNECTED. No guess from a CRM lead, consultation or test alias. |

Current projects include authorized explicitly opened DRAFT/PLANNED/ACTIVE/ON_HOLD with honest separate labels. COMPLETED is history with no next actions/milestone. CANCELLED is removed from the P1 family view and direct client detail/download reads are refused in optional P1 mode. P0 historical contract is unchanged when that mode is off; staff archive access remains separately authorized.

`metrics` counts exactly the returned sets. No silently truncated count: more than64 authorized projects refuses this development aggregate pending a reviewed pagination contract. Tasks sort by due time (undated last), priority then canonical task ID. Duplicate/foreign task references or inconsistent counters fail DTO validation. A task transitions only through P0 TASK_STATUS with its actual project revision and request idempotency key. Homepage never edits contracts, payments or opening.

## Authorization and freshness

- Each request resolves the opaque HttpOnly session on the trusted server, uses separate binder/app LOGINs, redeems the one-use ticket and runs existing authorized list/snapshot queries. ADVISOR/PARTNER purposes cannot read this family aggregate.
- P0 RLS/functions enforce self/verified guardian/project/Consent/patient boundaries. Membership is not adult sharing. Project list is rechecked before releasing the aggregate; scope changes refuse a partial response.
- Arbitrary family/customer query parameters and identity/role headers are rejected. Mixed D1 and synthetic credentials or CUSTOMER_AUTH_ENABLED=1 do not establish a Canonical family and are refused.
- Existing controlled list/snapshot reads persist protected P0 read audit. No direct app audit-write grant is introduced. Pre-binding/HTTP denials are not represented as new durable database DENY events.
- Cache-Control private,no-store; no browser local/session storage, service-worker fallback or demo fallback. Focus/pagehide/visibility/account switch clears private state. Polls reauthorize each second; displayed data has a maximum two-second lease. Expired data is hidden even if the API stalls. Old in-flight account responses cannot repaint the new account.
- **Server reads revoke on the next request.** An already delivered DOM cannot be remotely erased at the exact SQL commit instant; observed UI removal is bounded by polling/lease, not claimed as instantaneous push. Real release must approve that revocation SLO or require a separate trusted push contract. No production SLO is invented here.

## Health and business boundary

Health uses existing patient-specific project authorization before even its presence can be counted. Ordinary homepage never receives its source title, task/milestone/team text, medical documents or events. Health action count means currently allowed homepage actions (P0 clinical actions are closed), not a claim that no clinical work exists elsewhere. Formal patient application/Consent and private record interfaces remain HOLD.

Education/Identity/Wealth names and stages are existing authorized project facts, not new templates or purchased-product assumptions. Consultation/assessment/unopened payment references cannot become ongoing projects. No original First Touch is modified.
