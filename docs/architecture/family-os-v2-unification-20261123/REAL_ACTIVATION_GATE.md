# Phoenix Family OS V2.0 — real activation gate / P0 follow-up
Date: 2026-11-23
Status: **PRIVATE SYNTHETIC TEST CANDIDATE; CUSTOMER PRODUCTION HOLD**

## Confirmed baseline
- The unified website Family Center is already present in `phoenix/main@07ba206e74226f5e07b94b637bce0837f76d5351` via merged PR #104. It is the **only** customer portal entry; do not merge PR #101's second demo route.
- The existing `FamilyServiceOverview` and `/api/family-services/summary` use the trusted Canonical Customer BFF and an expiring, allowlisted `service-project-summary.v1` DTO. No new business database.
- User-visible Sharing/Guardianship is currently an honest explanation and adviser/Account link, NOT consent write access. Service Updates are only derived from the current authorized summary, NOT delivered messages. Family Assistant is deterministic read-only, NOT a model or an autonomous agent.

## This candidate's actual changes
1. Expand the existing PG16/17 **real browser → synthetic Canonical trusted identity → P1 BFF → PostgreSQL** test with client B and C notification/assistant isolation.
2. Prove a revoked Service Project disappears from the derived notification and assistant on the next read. The test must also delete the login's synthetic active server session and verify refresh returns an unauthorized state **without old cards or guidance**. These are synthetic accounts, never live students.
3. Add `inspectPrivateFamilyRuntime`, a **nonsecret, fail-closed configuration shape check** for private development. It refuses absent identity verifier, mapping resolver, incorrect origin, public/credentialed BFF, public-facing preview site origin, disabled flags and production mode. This narrow P0 guard allows only a loopback development test; a private hosted staging URL requires a separately reviewed deployment adapter. A green result means only that runtime composition *looks complete*; it is not proof that the services are truly reachable or secure.
4. Add negative tests for the preflight and ensure the existing website and P1 PostgreSQL workflows run against the exact PR head.

## Currently blocked live gates
- **Hosting/runtime discrepancy:** Main's `workbenchEnabled()` accepts **development** mode only, and current BFF requires `http://127.0.0.1` as a private upstream. Do not turn `NODE_ENV` to development in production or point to a public BFF. A properly authenticated **private staging runtime** can provide actual results; a hosted public Sites deployment alone is not evidence of the private Node gateway.
- **Authentication composition:** `CANONICAL_CUSTOMER_AUTH_PROVIDER` must be a trusted server-side capability with `verifySession` + `recordAccess`; `CUSTOMER_CANONICAL_PROVIDER` must resolve the current subject and return `assertCurrent`. Neither is a configuration-only password string. No default provider exists. The production adapter and identity owner must be independently reviewed and attested.
- **Latest environment evidence:** Jimson's Issue #97 contains isolated BFF HTTPS and WAL/PITR synthetic receipts and a Site saved-version reference; the designated `phoenix_nonprod` login/TLS/CA + actual website build-to-runtime mapping have a separate BLOCKED receipt. Do not substitute the isolated receipts for the approved target's real runtime evidence.
- The website public launch PR #102, Academic Studio #92, audit #103 and BFF #105 are separately gated and must not be pulled into the Family OS mainline just to make the UI show data.

## Exact handoff (do not delegate Codex-capable code changes)
**Codex/Engineering:** Finish the verified private composition of the website session provider and existing Service Project BFF with fully synthetic identities and active revocation; capture exact source/build/runtime SHA, 401/403/200 outcomes, family A/B isolation and request audit IDs. Build a real native-site browser test if the running host can provide an approved URL (the existing P1 harness is a real browser but not a deployed Sites Worker).

**Jimson/Environment operator (manual only):** Provide approved private staging host reference, protected runtime version, service/identity bindings, key/CA trust refs and backup ownership. Return only references, never connection strings, secrets or client data. For any missing item mark BLOCKED, not PASS.

**Independent security/privacy reviewer:** Validate live session origin, revocation, family/subject separation, Consent scope, logs, file retention, model egress disabled and release criteria. Founder retains merge of new DB SQL, shared DB installation, public launch and live-data approval.

## Go/no-go decision
- GO: isolated synthetic PG16/17 regression and shape-only private configuration preflight.
- HOLD: real customer sign-in, production Customer Bridge flags, shared Canonical writes, public Sites endpoints, sensitive material uploads, delivered reminders or model calls.
- No changes to formal Canonical migrations 0001–0037 or production secrets.
