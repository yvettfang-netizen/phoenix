# P1 Family OS × Service Project — controlled integration candidate

## Baseline and scope

Main inspected: `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`.
P1 stacks on PR59 `3ceac97abe5503583e5cc179b98293814d1e1b4d`,
which stacks on PR58 `a0123c7f39292274962b72b73c06828b85770599`,
PR57 `fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683`,
PR55 `5414c18ca521d8b8eae1f650102485749e6ebd3a`.
All four remain unmerged Drafts; their successful CI and empty independent
review lists are recorded in BASELINE_SNAPSHOT.json. P1 does not merge them,
rebuild the P0 workbench or activate any migration.

## Identity contract

The browser supplies only the existing HttpOnly Customer Auth cookie.
`readCustomerSession` checks its hash, active D1 account, absolute expiry and
idle expiry. The BFF passes only that verified session's customer ID and
session hash to the server-injected `CustomerCanonicalProvider.resolve`.
No customer/family/principal/role header or query is an authority.

The dedicated [private FAMILY adapter](PRIVATE_FAMILY_STAGING.md) calls a separately
approved identity authority through a server binding. Its approved authority
must resolve a unique current Canonical principal,
actor, family and subject grants using an authoritative server-side mapping;
issue a short-lived opaque gateway session bound to the `CUSTOMER` profile and
implement `assertCurrent`
against live account/mapping/grant/session state. It must bind the token to the
verified customer session, enforce revocation and expiry, and never grant
ADVISOR authority from a customer login. Multiple or missing matches deny.
It must not log the bearer or cookie. Static client-selected identity maps
and browser cookies for P0 development sessions cannot replace this contract.

The BFF buffers the upstream response and appends a preparation checkpoint
before a read-only D1 check and the final provider check. The source session
deadline is checked again at release. The final provider check must cover
revocation of the exact bound source session and its grants. The evidence for
that check against the real authority is part of the real-identity gate.
An attempt and any preparation or terminal failure share a server-generated
request ID prefix.
Preparation means the upstream response was ready for authorization to release.
It is independent of delivery. An audit write failure closes access. If a
command committed before release was denied, authorized retries must reuse its
idempotency key to reconcile the result.
Canonical ticket, transaction, RLS/subject authorization and read/write auditing
are reused from P0. No alternate customer/family/project/financial master exists.
The connection guard checks binder and app LOGINs and the effective workbench
role after SET ROLE, before any context ticket is issued. The grant allowlist
covers role edges, schemas, callable routines and absence of direct table,
column and sequence access. Ownership of the database or an application
object is refused even when ordinary grants were revoked. PostgreSQL 17
relation MAINTAIN is treated as an unexpected privilege.

`CUSTOMER_CANONICAL_BRIDGE_ENABLED=true` requires the workbench flag. The existing
development bridge requires an allowed loopback origin. Private FAMILY staging
requires an exact private HTTPS origin and dedicated server bindings.
Missing auth configuration, provider or mapping denies. Public and
unconfigured access remains closed.
The deployed Cloudflare binding/configuration and real mapping require separate
implementation/security review; the synthetic harness is not that approval.

## Project summary contract

GET /api/family-services/summary: authenticated, private/no-store, bounded
limit 1–50 (default20), cursor consisting only of update timestamp/project UUID.
Selectors never confer authorization. The database authorizes before pagination.
Schema `service-project-summary.v1` contains projects, as_of, expires_at,
next_cursor; each project contains service_project_id, name, compass, status,
current_stage, adviser, next_milestone, customer_todo_count, overdue_count,
latest_progress and detail_href. Unknown data remains null; never infer progress.

Sources are the existing Canonical service projects/settings/assignments/tasks/
milestones/client-visible workbench events. The new 0039 forward candidate is
an audited projection/function grant, not a new data authority. Historical
0001–0038 must remain byte-exact. The generated manifest binds its bytes.
Task and event scopes reuse current project and subject authorization.
Summary validity is at most60 seconds; after expiry/focus change/error the UI
clears old data and re-fetches. No cache is an authorization source.

The four-Compass contract excludes other primary domains. A non-Health project
with a secondary HEALTH domain fails closed rather than borrowing its primary
domain's access. Candidate0039 supplies customer scope/snapshot/list wrappers.
The development BFF sends a transport marker after trusted session mapping.
The gateway requires it to match the bearer profile resolved by the server.
Private FAMILY staging uses the authority's verified FAMILY channel to derive
CUSTOMER, rejects markers and exposes only allowlisted reads. It checks the
same short-lived source-session assertion at both sides of the gateway.
STAFF requires separate authorization and its 0040 mixed-Health guard. The SYNTHETIC profile
is limited to an explicitly configured development preview. The resolved
profile selects the database guard for reads, commands and downloads. Unknown
profiles and missing candidate guards deny.
No001–0038 policy or migration is weakened. Future-created records and future
progress events are excluded from current summaries. Keyset pagination is
re-authorized per request, not a fixed database snapshot; refresh restarts it,
and the UI never extends old page validity when appending another page.

Health summary suppresses free-text milestones/progress and task counts;
neither summaries nor this homepage read clinical records, sensitive
questionnaires, claims files, material bodies or object links. Contract/payment
remain in P0's existing read-only source-reference contract.

## Acceptance evidence levels

Unit adapters prove local boundary behavior only. First-layer acceptance must
use isolated synthetic identities, actual auth storage, BFF HTTP, API and real
PG16/17; record exact source SHA, invocation, outcomes, failures and screenshots.
Synthetic screenshots must be labelled; do not describe them as real customers.
Tests cover unauthorized project links, same-family distinct members, cross-family,
grant/session revocation, task refresh, adviser changes, DB/gateway/audit faults,
empty/multi/history/paused states and zh/en mobile.

Second-layer REAL IDENTITY STAGING = BLOCKED. Required: approved trusted login
provider and mapping authority, customer and employee grant contracts, private
environment/binding/secrets approval, independent security review, actual
artifact SHA/deployment/access policy, two controlled real test accounts with
different permissions, approved test consent and operational owner.
No real account/password or production data is included in this PR.

## Rollback

Keep existing flags off by default. Stop the owned synthetic fixture processes
and clear their test cookie/state; preserve logs before cleaning owned resources.
Disable CUSTOMER_CANONICAL_BRIDGE_ENABLED first to remove the new login bridge;
disable workbench/Family V2 flags if required. Fail closed, never fall back from
a failed customer mapping to the old synthetic identity. An authorized operator
can restore a previously independently approved immutable artifact, then verify
login denial, no stale DOM data, noindex, audits and DB/gateway health.

This candidate does not apply0039 to production. In isolated databases only,
the forward projection can be removed with REVOKE/DROP of the exact summary
function after stopping consumers;0001–0038 and all business masters remain.
The exact dependency order is: disable the bridge, revoke/drop
workbench_summary(integer,timestamptz,uuid), workbench_customer_snapshot(uuid)
and workbench_customer_list(), then workbench_customer_scope(uuid). Use no
CASCADE: unexpected dependencies must stop rollback for independent review.
For any future activated environment, take a verified backup and preserve audit
records; independent DB review must approve rollback order, function dependencies,
owner and recovery runbook. Never delete service data or rewrite migration history.
Logical synthetic restore measurements are not accepted RPO/RTO or WAL/PITR.

## Founder and independent review checklist

- DB/security owner: review0039 definer/search_path/grants/audit/row+subject scope.
- Identity/security owner: approve provider, mapping, revocation and private config.
- Service owner: approve stage/task/progress semantics and client-visible data.
- Document/privacy owner: sign P0 Consent/classification/storage/retention pack.
- Operations owner: approve monitoring, incident handling, restore and RPO/RTO.
- Independent reviewer: review final exact SHA, current CI and unresolved findings.
- Founder: accept bilingual/mobile UX, scopes, remaining HOLD and staging plan.

Codex cannot sign for any of these owners. Draft PR/green CI does not authorize
merge, production deployment, migration, real identity/data import or indexing.
