# Phoenix Family OS™ — Service Center Target Mode (synthetic MVP)

**2026-11-23** · **Status: isolated interactive candidate / NOT production enabled**

## Founder target

Give a customer one coherent, bilingual place to inspect authorized service projects, the next task, guardian/Consent permissions, minimal notifications and read-only family guidance. Retain the existing **Family OS / Phoenix Core / Canonical PostgreSQL** authority and avoid a second identity/database/AI system.

### Bounded interactive candidate

Route: **website/phoenix-nova-website-v5/app/[locale]/family-service-center-target/page.tsx**

- A runnable React target view with four tabs: **My Services**, **Access & Guardianship**, **Notification Center**, **Family Assistant**.
- Three synthetic personas: student, verified guardian, unassigned visitor; a local simulated guardian-Consent withdrawal immediately removes task and AI responses for the guardian.
- Synthetic Y8 admission Service Project, task states, notifications, read/unread interaction, mobile + desktop styles.
- Deterministic rule-based read-only assistant for three intents, **not** a live AI call, not ASKWISE production integration.
- No user-generated content is sent to any server. No browser persistence, live upload, real credentials, message delivery, real grant mutations or customer records.
- A strong preflight banner is always visible. No false "sent", "saved" or "permission granted" feedback.

## Test/run locally

From **website/phoenix-nova-website-v5**:

1. Run npm ci using the repository's pinned dependencies.
2. Set FAMILY_SERVICE_CENTER_PREVIEW_ENABLED=true in the approved **local development** Workers environment (not production).
3. Run npm run dev; visit /zh/family-service-center-target or /en/family-service-center-target.
4. Verify four tabs, roles and responsive view at 390px and 1440px. On Guardian persona click "Simulate revocation": My Services and Assistant must refuse learner details. Student persona remains able to see own synthetic task summary.
5. Run npm run typecheck; npm run lint; node --import ./tests/register-typescript.mjs --test tests/family-service-center-target.test.mjs; and the existing website suite. Match evidence to the exact branch HEAD.

**Gate**: the route returns 404 unless BOTH mode = development AND FAMILY_SERVICE_CENTER_PREVIEW_ENABLED=true; production never exposes this new route. Robots noindex/nofollow/no-cache is defence-in-depth, not authorization.

## Target real implementation (separate reviewed work)

**Gate FOS-A: current identity and consent.** The actual BFF resolves the trusted Canonical Principal and verified subject every request. Map parent view via current family membership, verified core.guardian_authorities and purpose/data-class-specific consent.grants, with immediate withdrawal, expiry and civil-capacity transition tests. No client-provided role, person ID or family ID can authorize access. Student sees self only; guardian only granted child; unassigned denied. PR #92 is an unmerged Academy candidate; do not import its SQL into production.

**Gate FOS-B: authorized service and notification reads.** Reuse the actual Service Project summary and current task/milestone provenance, not synthetic fixtures. Add an in-product inbox contract with immutable event source, stable recipient and idempotency key; read/unread changes require subject-scoped endpoints and audit. Do **not** email/WeChat/push private records by default. Existing Service Project remains sole authority.

**Gate FOS-C: safe assistant.** Begin with deterministic task organizer over the same checked summary. Optional later AI model is only called by a service-side gateway after exact Principal/subject/Consent validation; minimize context, log provenance/source and retention, do not directly connect AI to PostgreSQL. AI cannot create grants, update source documents or alter applications. No model key, third-party data processing or background action is approved by this target.

## Release gates

- Two separate synthetic families, adult + minor subject and different reviewer identities, with full allow/deny/revoke/rebind matrix.
- Real service login, BFF and private nonproduction PostgreSQL read evidence with exact running SHA.
- Source-backed task lifecycle including service project status and adviser handoff; no guessed deadlines.
- Notification inbox persistence, no duplicate delivery, opt-in and suppression, expiry and error retry.
- AI read-only responses never retain private stale context after revocation; refusal after session expiry; action writes disabled.
- Isolated PG16/17, CI, mobile/desktop browser, accessibility, independent security sign-off, Founder merge and environment authorization.

**Cannot claim:** production authentication, sending notifications, real guardian grant/revoke, student records, actual AI, customer data or deployment.

### Relationship to current branches

- Formal Canonical migrations: 0001–0037 unchanged.
- Service Workbench P1 is already on main via #65; do not fork a second workbench.
- Family nav integration #66 is still Draft; no merge/retarget.
- Academic identity #92, scheduling #94 and assessments #95 remain distinct Draft candidates.
- This preview does not touch old Family SQLite / V5 D1 or use any real personal data.
