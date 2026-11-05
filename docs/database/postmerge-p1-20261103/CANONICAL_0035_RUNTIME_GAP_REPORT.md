# Canonical 0035 Runtime Gap Report

2026-11-03 · Codex engineering evidence for Jimson · **PASS: baseline audit; BLOCKED: live four-domain integration.** Sources are fixed in [source index](SOURCE_INDEX.json), the [authority record](CANONICAL_POSTMERGE_AUTHORITY_RECORD_V1.0.md), and private V7 source/environment evidence. This report does not certify a production runtime.

| Layer | Actual evidence | Result / gap |
|---|---|---|
| Mainline SQL | main `9355d28667ee9cf4761b4abcdaf959f0ad154820`; 35 immutable Migration hashes | PASS: engineering release authority |
| Disposable PG16/PG17 | mainline SQL fixtures, separate LOGINs, synthetic records; [test report](V7_CANONICAL_P1_SYNTHETIC_E2E_REPORT.md) | Actual execution recorded there; not a permanent cluster |
| Existing local Compose | Earlier reports record 0035; this run does not connect to or upgrade those clusters | NOT RUN: current persistent ledger/health |
| Tencent isolated environment | Historical reports describe an earlier release; no current server inspection | HOLD: current server version and upgrade; no SSH or deployment |
| Approved historical server | private source `48bb6c3ae18906f870ea9e8a717c03ebb2da34bd`, package `phoenix-family-os-server`; three read-only route tests | Synthetic compatibility only |
| Current main server | Education contract `education_compass_contract_v1.1.0` | Lacks proof of deployment with the approved Canonical route bridge |
| Education current product source | V3 audit points to `6db8db05be630dbd56048c56b3b3741c97b6f101`, contract V1.2 / Pathway Fit | A different source anchor; do not replace the questionnaire or call the old bridge its live runtime |
| Education GEO / Identity / Health website branches | Open PR #38 / #35 / #33–#34 at the source-index SHAs | Candidate content and readiness contracts; not approved DB write integrations |
| Wealth / Finance | Existing CRM estimated Deal values; Finance authority not established | HOLD: payments, insurance, commissions, refunds, revenue |

## V7 and the three existing routes

V7 identifies the Founder-approved physical development workstation, not a verified application version. The source/environment matrix records that distinction. Local execution of an approved historical server does not establish a real deployed V7 application topology.

Existing read-only routes: `GET /v1/me/family`, `GET /v1/me/students`, `GET /v1/me/students/:studentId`. The trusted server authenticates the broker assertion, resolves the existing identity/family map using the binder connection, issues a one-use ticket, redeems it on a separate app connection and checks Canonical family/student scope. Exact application DTOs still come from the existing application Store. They preserve public `fam_`/`stu_` identifiers; Canonical UUIDs are not substituted into browser payloads. Clear/discard is mandatory before connection reuse. This is an authorization bridge, not evidence that every response field is loaded from PostgreSQL.

## Four-domain target pipeline — preparation only

`versioned content/product source → authenticated trusted API → existing Canonical controlled function → immutable domain event → authorized minimal projection`.

- Source: identify actual entry and source revision, never infer ownership from browser family/student/partner IDs.
- API: separate app and binder pools, verified issuer/audience/key provenance, short one-use tickets, payload-hash idempotency, no browser PostgreSQL access. Transaction pooling that reuses backend contexts across unrelated requests is forbidden.
- Authority: reuse existing CRM/Service/Education/Identity/Learning keys and RLS; no duplicate Person/Family/Student/Client. New typed CRM fields need 0036 approval first.
- Event: original First Touch immutable; need actor distinct from recording SERVICE; no raw questionnaire/medical content. Existing Lead events are not a proven general outbox. A future cross-system outbox requires its own atomicity/delivery/retry contract.
- Family projection: only authorized project ID, service domain, lifecycle/milestone summary and approved next action; field-level disclosure and actual route implementation remain HOLD. No raw files, patient records, policy eligibility or clinical inference in Timeline.
- Founder projection: approved non-sensitive grouped Lead/Consultation/Deal/Project counts; estimated pipeline must be labeled separately from Finance revenue. No automatic right to patient data. Aggregation granularity/privacy and endpoint approval remain HOLD.

**BLOCKED:** a verified current application checkout + actual enabled topology, effective identity-provider configuration, controlled real identity registration, approved new route/DTO/permission contracts and deployed trusted credentials have not been supplied as a complete current runtime evidence set. No identity-provider fact is invented. Synthetic tests cannot remove these holds. Single next gate: the bounded 0036 decisions in [Founder gate](FOUNDER_NEXT_GATE_DECISION.md).
