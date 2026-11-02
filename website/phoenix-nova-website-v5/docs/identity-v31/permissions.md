# Identity V3.1 Data Permissions and Publication Matrix

**Status:** `DRAFT / HOLD`
**Gate:** Gate 7 and Gate 6 security/publication boundary
**Decision:** This matrix is a review artifact. It does not create RLS policies, roles, database tables or production permissions.

## Evidence boundary

The Identity website currently uses Cloudflare D1 for `core_auth_*` authentication tables. The public mainline-copy branch has the V1.x Canonical snapshot, while the separately accessed `phoenix-canonical-db` source exposes V2 milestone branches through M5. Those V2 branches are not merged into the public copy, and the source delivery report records Founder acceptance and ordered merge as pending. Therefore this matrix describes the required boundary and clearly labels controls that still require Jimson/Founder confirmation; source-branch RLS evidence is not treated as active website permission.

## Private V2 source evidence (reference only)

The following controls were read from immutable private-source branch commits and are recorded only to prevent a duplicate data model. They do not grant the website access and do not authorize a migration:

| Domain | Observed Canonical authority | Observed boundary | Status for Identity V3.1 |
|---|---|---|---|
| Client | `crm.clients`, `crm.client_parties`, `crm.client_relationship_events` (`0026`/`0031`) | FORCE RLS; Client-family scope; controlled `crm.create_client`, transition and party APIs; direct table DML revoked | Candidate reuse only; V2 branch approval and DTO/API contract pending |
| Partner | `crm.partner_relationships`, `crm.partner_relationship_events` (`0031`) | Person/Organization XOR; CRM SERVICE context; FORCE RLS; immutable relationship events | Candidate relationship authority only; no standalone Partner master |
| Service Project | `service.projects` and related `service.*` tables (`0028`/`0034`/`0035`) | `canonical_service_v2` SERVICE label plus `auth.current_family_id()`; FORCE RLS; controlled project/assignment/task/delivery APIs | Candidate reuse only; no local Service Project table |
| Country/Jurisdiction | No dedicated catalogue table found in inspected V2 migrations; only `country_code` attributes | No Identity catalogue RLS/API evidence | Unresolved; Jimson must supply approved Identity catalogue contract |

The V2 chain heads are evidence refs, not deployment refs: Enterprise `013b6030...`, M0 `666118be...`, M1 `16bbb5ca...`, M2 `b81500c...`, M3 `c966d2c...`, M4 `54f3888...`, M5 `ac59e09...`. The V2 delivery report says engineering PASS but Founder acceptance, ordered merge, real application integration and production/Tencent deployment remain pending or HOLD.

## Docs-only engineering handoff boundary

The companion `canonical-mapping.md` now contains a conceptual ERD, proposed field mapping, non-executable migration-plan draft, candidate RLS scope and rollback scope. Those sections are design handoff material only. They do not create SQL, modify Canonical migrations, grant permissions or authorize a PostgreSQL connection.

Before Gate 7 can move beyond `HOLD`, the handoff must receive all of the following from Jimson/Founder:

- one approved V2 branch/commit and confirmation that its ordered merge is authorized;
- an approved Identity Country/Jurisdiction/programme/policy data contract (the inspected V2 chain has no such catalogue);
- exact keys, DTOs, resolver rules and ownership for existing Person/Family/Client/Service Project references;
- effective RLS/policy/role inventory and proof that importer, reviewer, Founder and public paths are isolated;
- append-only revision/publication-pointer behavior, synthetic import/duplicate/stale-source tests and a rollback test;
- explicit approval for any future migration, deployment, real-data import or production integration.

Until these artifacts are attached, treat every V2 RLS/API name as a candidate interface, keep public Identity content D1/local-only, and do not infer a production permission from branch SQL or engineering PASS.

The companion dependency audit at `outputs/identity-v31/security-audit.json` reports `1 critical / 7 high / 10 moderate`. The direct `exceljs@4.4.0` addition introduces an XLSX/archive dependency chain; baseline `next@16.2.6`, `zod@3.25.76` and other existing findings remain release risks. The CBI import route is server-gated and noindex, and its current flow is preview-only, but the XLSX reader is dynamically imported by a client component. This is not sufficient for `SECURITY_PASS` until dependency remediation or an approved isolated parser boundary is evidenced.

## Data states

| State | Meaning | Publicly readable? | Transition authority |
|---|---|---:|---|
| `IMPORT_REVIEW` | Parsed candidate data awaiting source, legal and business review | No | Importer/system may create; reviewer may return for correction |
| `APPROVED` | Founder-approved version eligible for publication | Only through an explicit publication pointer | Founder or explicitly delegated reviewer |
| `PUBLISHED` | Current approved version exposed by a public route | Yes, sanitized fields only | Founder/delegated reviewer |
| `SUPERSEDED` | Replaced by a newer approved version | No, history only | System after approved replacement; audit required |
| `EXPIRED` | No longer effective or verified | No deterministic conclusion | System/reviewer with source evidence |
| `REJECTED` | Failed validation or review | No | Reviewer |
| `ROLLED_BACK` | Previously published pointer withdrawn in favour of a prior approved version | Only the replacement version | Founder/delegated reviewer with reason and audit |

The public surface must never treat `IMPORT_REVIEW`, `EXPIRED`, `REJECTED` or `ROLLED_BACK` as active policy. Unknown or stale data is displayed as `待核实`/`NOT_VERIFIED`, not as a positive eligibility result.

## Role and action matrix

| Actor | Read public `PUBLISHED` | Read raw/import review | Import/validate/preview | Approve or publish | Roll back | Schema/migration |
|---|---:|---:|---:|---:|---:|---:|
| Public visitor | Yes | No | No | No | No | No |
| Advisor / service user | Published only, plus explicitly authorised client case data | No by default | No | No | No | No |
| Codex / Xuanwu engineer | Yes for testing | Restricted review access | Yes | **No** | **No** | **No** |
| Baihu data governance reviewer | Yes | Yes, source/provenance review | Review and annotate | **No unless separately delegated** | No | No |
| Jimson database owner | Yes | Sanitized technical review | Technical validation | No business publication by default | No | Draft/review only; production execution requires separate approval |
| Founder / designated release reviewer | Yes | Yes | Yes | Yes | Yes, with reason and audit event | Explicit approval required |
| Import/validation service | No public bypass | Only its scoped batch | Parse, validate, produce conflicts | **No auto-approval** | No | No |

The application must not interpret a role name alone as authorization. The effective Canonical contract must supply family/tenant scope, actor identity, expiry and purpose. A service principal is not a human client or family member.

## Required controls

1. **Server boundary:** browser routes never connect directly to PostgreSQL. The current D1 adapter is not evidence of a Canonical PostgreSQL integration.
2. **Publication isolation:** public handlers select only the approved `PUBLISHED` pointer and sanitized fields. `IMPORT_REVIEW` and raw source documents are not reachable by public URLs.
3. **Founder gate:** no country/programme version becomes public without the Founder or explicitly delegated reviewer’s approval record.
4. **Source provenance:** every policy rule carries `source_type`, `source`, `official_url` when official, `verified_at`, `effective_scope`, `effective_status` and `owner`. Internal experience and model inference remain visibly separated from official current material.
5. **Staleness fail-closed:** expired, conflicting or unverified policy cannot generate a deterministic fit, approval, passport or eligibility conclusion.
6. **No sensitive intake:** ordinary consultation forms must not collect passport scans or other sensitive identity documents. Any future document flow must use the approved Core `docs.*` contract, consent, retention and RLS.
7. **No automatic business side effects:** country import cannot create payment, quote, contract, application submission, or legal conclusion.
8. **Audit:** import, validation, approval, publication, supersession and rollback record actor, batch/version, reason, source and timestamp in the approved append-only audit path. Website `core_auth_audit` is authentication audit only.
9. **Dependency boundary:** the current local-preview gate is not an authorization substitute. `exceljs` and its ZIP/archive dependencies must be treated as an untrusted-file execution surface; no public upload, publication, or server-side release is permitted while the audit remains unresolved.

## Import evidence that must be retained

Each batch must retain, without silently overwriting an earlier batch:

`import_batch_id`, `source_file`, `file_hash`, `imported_at`, `imported_by`, `source_document`, `data_version`, `verification_status`, `approval_status`, conflict/missing-field report and the final publication decision.

Source files are untrusted input. Parsing must be data-only; CSV/XLSX/JSON content must never execute SQL or scripts. Invalid amounts, unsupported currencies, malformed dates, duplicate country/programme keys and missing official sources are review errors, not inferred defaults.

## RLS and recovery evidence still required

The following are requirements for Jimson’s Canonical contract, not claims that they are active in the website:

- public reads are limited to `PUBLISHED` records;
- reviewer reads/writes are scoped to assigned review batches;
- family/client case reads require Core identity, purpose-specific Consent and explicit assignment;
- application roles have no direct table write access where controlled functions are required;
- audit and version history are append-only to application roles;
- rollback is a publication-pointer change with an immutable audit event;
- a failed import leaves the previous approved version untouched and can be retried or quarantined safely.

V2 RLS evidence was reviewed internally. Its unpublished policy inventory is excluded from this public handoff; Jimson must provide the approved effective inventory and API contract before implementation.

Before `SECURITY_PASS` or `DATA_IMPORT_PASS`, attach the effective RLS policy inventory, role grants, function/API DTO contract, append-only proof, import dry-run output and rollback test. Until then, mark the integration `HOLD / NOT_VERIFIED` and do not run a migration.
