# PR #35 readiness remediation — 2026-11-04

Verdict: HOLD. This is a read-only comparison candidate, not approval to merge, deploy, import real data or enter production Staging.

## Scope and verified baseline

- Repository: yvettfang-netizen/phoenix; PR #35; destination branch codex/identity-v31-cbi-review.
- Remote starting HEAD equals the supplied baseline: 3e0d1957cd997618f89a07cbfedea08af7d11520.
- Latest main inspected and merged without conflicts: 9355d28667ee9cf4761b4abcdaf959f0ad154820. Main contributed #36 and #37 (Canonical 0035 and governance bootstrap). No database migration was executed.
- Work uses an isolated worktree. Existing main and the older local PR worktree were left untouched.
- Starting PR is Draft, with no submitted independent reviews. Previous green Actions runs cover the starting SHA only.

## Security behavior

- Import route /{zh,en}/identity/import-review always returns 404, including when IDENTITY_CBI_IMPORT_REVIEW=1. Its client upload panel is no longer reachable from that route or imported into its production graph. No import API or production adapter is introduced.
- CSV/XLSX/JSON parsers remain engineering utilities, tested with synthetic files. Their mock append/version tests are not persistence, RBAC, idempotency, audit or recovery evidence for a production database.
- New records may only enter IMPORT_REVIEW. PUBLISHED, ACTIVE and WITHDRAWN inputs are rejected. ACTIVE is an operational-policy enum, not an approved publication state; PUBLISHED cannot be set by import input.
- Report provenance uses an explicit public DTO. Reviewer identity, audit metadata and effective_scope are excluded. Official source URLs in downloads omit query parameters and fragments. Sources, verification dates and review gaps remain in reports.
- Report browser regression asserts no external HTTP requests, no writes and no audit identity fields in the actual JSON download. Parser validation, duplicate, failure and release-denial tests remain in the suite. Browser import assertions now verify unconditional denial in both locales with the legacy flag on and off, matching the deliberately withdrawn feature.
- The existing root/CBI noindex metadata, robots disallow-all and sitemap exclusion remain mandatory. No indexing setting is opened.
- CI adds a full npm audit gate at moderate severity, including development dependencies. No risk acceptance is implied by this document.

## Remaining gates (EVIDENCE_MISSING)

| Requirement | Evidence still required before release |
| --- | --- |
| Country facts | Human/source-owner approval of each country's current legal, operational, intake and passport facts; field-specific costs, time, eligibility and travel conditions; effective dates and review status. Existing dates are not refreshed merely because code changed. |
| Data publication | All four existing records remain IMPORT_REVIEW. Public published catalogue remains empty. Review-mode comparisons and reports are explicitly internal and unapproved. |
| Import authorization | Effective approved Canonical DTO/adapter, server identity/RBAC, scoped least-privilege grants, approved fields and data authority. Repository SQL availability does not prove adapter integration. |
| Import persistence | Durable original files, append-only history/audit, idempotency keys, dry-run, cross-batch conflicts, transactions, duplicate retry and actual rollback/recovery tests. Reopening the import route requires a separate implementation/review. |
| Security approval | Named security owner and written review. Any remaining moderate finding requires a written owner, deadline and compensating controls; otherwise HOLD. |
| Independent review | Independent GitHub approval for the final commit; local or delegated analysis is not that approval. |
| Staging | Approved environment/access configuration, real Workers/database/runtime evidence and security approval; noindex must remain. No staging deployment is performed here. |

Local checks, remote Actions and runtime approval must be reported separately. Final commit and Actions results are recorded in the delivery response after pushing; no local rehearsal may be described as production success.

## Four-country source recheck (2026-11-04)

This is source discovery/recheck, not human legal approval or a publication decision. No record or verification date is promoted by this check.

| Country | Official source checked | What it supports / what it does not establish |
| --- | --- | --- |
| KN | https://ciu.gov.kn/cbi-options/ and https://ciu.gov.kn/application-process/ | Delegated read retrieved official investment-option/process pages; primary re-fetch of options timed out. Current intake, field-specific amounts/eligibility and authorized agent status still need dated reviewer evidence. |
| AR | https://www.argentina.gob.ar/noticias/luis-caputo-anuncio-la-puesta-en-marcha-del-programa-de-ciudadania-por-inversion-de | Primary recheck confirms page dated 2026-10-02 describes planned operation in Q4 2026. An announcement does not establish an active intake endpoint or current judicial/implementation status. |
| VU | https://vancitizenship.gov.vu/index.php/citizenship/types-of-citizenship | Primary recheck confirms the official page lists CIIP, DSP, VCP and REO categories. No publication date is shown; the copyright year is not a verification/effective date. Current operation, fees and authorized agents require separate dated evidence. |
| ST | https://dgrn.gov.st/Legislacao.php and https://gov.st/ | DGRN fetched successfully but returned service/registration content, not the target legal text. Government portal alone cannot establish Decree-Law 7/2025, UCID authority or current intake. Target official gazette evidence remains missing. |

All four remain IMPORT_REVIEW; the empty public catalogue and unverified costs/time/eligibility are retained. Absence of a retrieved official text is an evidence gap, not proof that a programme or law does not exist.

Approval contact supplied by the user: yvettfang-netizen. That account is also the PR author; it does not satisfy the independent reviewer requirement. No security approval or risk acceptance was received.

## Dependency remediation

Full `npm audit --json --audit-level=moderate` on the remediated lockfile returned 0 critical, 0 high, 0 moderate and 1 low (@babel/core); 907 dependencies including development/optional packages. Raw local output: outputs/identity-v31/dependency-audit.json. CI repeats the same full audit and uploads its JSON with the final SHA. This is dependency evidence, not SECURITY_PASS or a risk acceptance.

Direct updates: Next/eslint-config-next 16.4.5, React/react-dom/react-server-dom-webpack 19.2.8, Vite 8.1.6, Zod 4.6.6. Vinext remains 0.0.50 to preserve the established runtime contract; a speculative upgrade to Vinext 1.x was not used.

Transitive constraints pin fixes for fast-uri, js-yaml, nanoid, postcss, undici, ws, source-map-js, image-size, sharp, satori, fflate, baseline-browser-mapping, browserslist and esbuild at versions outside the registry advisory ranges. Archive handling retains ExcelJS 4.4.0 with CJS-capable archiver 7.0.1 and uuid 11.1.1, and updates readdir-glob/glob/minimatch/brace-expansion. Archiver 8 is ESM and is intentionally excluded from the CJS caller. These compatibility-sensitive overrides require the retained XLSX read/write, lint/build and Workers checks; audit success alone does not prove compatibility. No force install or audit-fix-force was used.
