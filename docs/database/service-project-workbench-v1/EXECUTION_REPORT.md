# Service Project Workbench V1 — execution report

Task PHOENIX-SERVICE-PROJECT-WORKBENCH-V1. Work2026-11-05–06 Asia/Shanghai. Executor Codex under Founder development instructions. **Development candidate; independent/Jimson/Founder acceptance and real activation remain HOLD.** No merge, deployment, Tencent connection or real data.

## Delivered implementation

- Optional existing-backend route, separate app/binder pools, one-use tickets, protected read/write audit and live-session checks. Normal bootstrap remains off.
- Real PostgreSQL-backed project list/detail, existing Family Center My Services entry, assigned staff/manager scope, tasks, milestones, stages, messages, versioned materials/review/download, independent deliverable submit/review/accept and immutable events.
- HK master's project template: canonical school/programme catalogue, independent intake/round/deadline, adviser-only submission/source receipt, interview/supplement/deposit requirement, distinct OFFER/REJECTED/WAITLISTED/WITHDRAWN and reviewed offer version.
- Contract signing/payment/opening read references are separate. Separate Operations LOGIN source-ingestion regression proves no automatic activation and reversal invalidates opening. Browser/client/adviser cannot mutate financial records.
- Candidate0038:7 extension/reference tables,7 additional RLS policies; measured isolated inventory38 migrations /100 business tables /90 policies. Unique existing masters reused. No active migration manifest or historical SQL bytes changed.
- Bilingual mobile UI; default-off local BFF, HttpOnly synthetic sessions, exact response allowlists, bounded requests and immutable private local object bytes. Health clinical routes are closed; patient metadata scope tested separately.
- Four-layer rollback, logical fresh-cluster backup/restore and manager-linked compensating correction; no destructive down migration or erased history.

## Candidate integrity

`database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql`

SHA-256: `922c78b08a3cdd29474d1962fd930082b64a0b4ea6d2b3e8a33c9c617e3d3ad8`.

Active0001–0037 remain byte-exact, validated by existing `verification/v0037/verify-source.mjs`. Branch starts at PR58 SHA `a0123c7f39292274962b72b73c06828b85770599`. Inspected main remains `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`. See [audit](AUDIT.md) for unrelated ongoing branches. This is a **stacked candidate**, not a claim that0036/0037/0038 have been accepted into main.

## Verification facts and reproducible commands

Run from repository root after existing backend build. Scripts require a local Docker socket, pinned PG image and owned disposable synthetic clusters; they never connect an existing database.

| Verification | Command | Recorded result / evidence |
|---|---|---|
| Existing migration source | `node database/canonical/verification/v0037/verify-source.mjs` | PASS37 unchanged LF files |
| Backend | Existing `npm run typecheck`, `npm run build`, `npm test` in `Phoenix Compass/education compass/server` | PASS;146 tests |
| Website types/lint | Existing `npm run typecheck`; existing ESLint executable with repository ignore patterns | PASS; full lint has one pre-existing unused Bell warning in customer-center.tsx, no errors; new files no warnings |
| Website build | Existing `scripts/build-verified.sh` through Git Bash on Windows | PASS; no production publish |
| BFF and existing Family Center/projection contracts | `node --import ./tests/register-typescript.mjs --test tests/service-workbench.test.mjs tests/family-center-v2.test.mjs tests/canonical-family-projection.test.mjs tests/canonical-session-projection.test.mjs` in website | PASS14 |
| Whole local website suite | Existing `node --import ./tests/register-typescript.mjs --test tests/*.test.mjs` after build | **FAIL in existing local dependency graph**:101 pass,8fail,4skip. Installed Miniflare lacks convertV4MiniflareOptions; Satori chain lacks harfbuzzjs/hb.wasm. No existing test weakened or removed. Clean exact-HEAD GitHub website CI is required; this local run is not PASS. |
| PG16 + PG17 fresh/repeat/drift/atomicity, real LOGIN/RLS/API, nonempty restore and full replay | `node database/canonical/verification/v0038/acceptance.mjs 16` and `17` | Raw logs/JSON in private evidence; final source state/hash is recorded per run. Expected38/100/90; no claim based on schema documents alone. |
| Actual browser → BFF → API → PostgreSQL | Set PLAYWRIGHT_MODULE to isolated Playwright1.62.1 install; `node database/canonical/verification/v0038/browser.mjs 16` / `17` | Synthetic screenshots and scenario records. PG16 initial successful run used earlier0038 `fb6b9d6…`; final candidate adds stricter catalogue/expiry validation. Exact final-head matrix is required for final PASS. |
| Exact commit CI | `.github/workflows/service-project-workbench.yml` and existing PR workflows | **NOT RUN at report drafting**; final PR checks and private closeout receipt carry immutable exact SHA/run links. A passing earlier SHA is not substituted. |

Local evidence root is ignored `out/service-project-workbench-v1`; private archive preserves raw outputs including failed attempts, final acceptance JSON, command receipts and screenshots. Dumps, roles export, pgpass, runtime configuration and private object bytes are not committed. CI publishes only synthetic result JSON/PNG, not credentials or archives.

Browser retries originally failed because an exact accessible-label selector included select-option text. The actual retained failure body showed the form and version option existed; regression now selects the named document field. Earlier failed transcripts remain evidence, not hidden. React ref/render and impure-clock lint findings were corrected, without suppressing the lint rule. Scoped review also tightened catalogue to active HK MASTER programmes and excluded expired assignees.

## Required negative/recovery coverage

Separated real LOGINs, client/adviser/manager synthetic sessions; same-family adult and cross-family isolation; unassigned adviser refusal; client stage/outcome/payment/source/audit forgery refusal; actual narrow read-probe RLS; DOCUMENT_READ withdrawal and independent regrant; cross-program mismatch/inactive/non-master rejection; multiple independent official outcomes; immutable versions; stale revision race; replay versus changed-body conflict; audit INSERT failure atomically rolls back business command; zero context/tickets after revoked session; paused write refusal; manager-only resume/compensation; independent deliverable review/accept; closure prerequisites and terminal refusal; no Person/Family/Student creation during commands. Health test covers metadata authorization and a closed clinical path, **not a future clinical API**.

Restore starts with nonempty CRM/service/docs/application/audit history; a dedicated backup LOGIN exports, unsigned digest manifest rejects a tampered archive, a genuinely empty new cluster bootstraps roles and restores, then exact table fingerprints/ledger/policy/audit/object hashes are compared **before further writes**. New replay project references the same existing masters. Full workbench suite then runs again under rotated separated LOGIN credentials. WAL/PITR, approved RPO/RTO and real operations remain HOLD.

## Outstanding activation gate

See [FOUNDER_GATE.md](FOUNDER_GATE.md). This delivery does not authorize real provider login, staff identity mapping, real contract/payment ingestion, real document policy, clinical data, external notifications, staging/production rollout or main merge. Generic Identity/Wealth templates and medical patient document interfaces require separate reviewed contracts. No independent reviewer or Founder signature has been generated by Codex.
