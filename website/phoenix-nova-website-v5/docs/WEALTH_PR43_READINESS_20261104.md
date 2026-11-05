# Wealth PR #43 production staging readiness

Status: HOLD — DEPENDENCY_HOLD / DOMAIN_HOLD / REVIEW_PENDING.

Repository: yvettfang-netizen/phoenix. Worktree: isolated wealth-pr43-recovered. Starting HEAD: d4ae2a9c260cef2945a1bbf81f4ffac13f758ad1 (matches supplied baseline). Remote main inspected: 9355d28667ee9cf4761b4abcdaf959f0ad154820. PR #40 remains open/unmerged with no reviews. PR #43 remains draft, based on #40; do not retarget until #40 is approved and merged. No duplicate brand assets or components were introduced.

## Code and runtime

Node 22.13.0 reproduces ERR_UNKNOWN_FILE_EXTENSION in Wealth TS test imports. Original remote Website job 126393895668 also reports registerHooks unavailable. The Website failure causes Health and Canonical website-regression failure; isolated PostgreSQL and Wealth-product regression jobs passed at baseline.

The landing also places context-dependent Lucide icons behind an explicit React client boundary. The npm test command now registers an asynchronous ESM loader with node:module.register (available in 22.13), compiling TS with the already locked TypeScript dependency and resolving relative extensionless TS imports. The Node preview uses the same supported asynchronous hook API. No Node upgrade, deleted tests or weakened assertions. All existing cross-product npm tests remain in discovery. Type checking remains a separate mandatory CI step.

Wealth is browser-local only: no server saving, upload or investment advice. Explicit draft save remains limited to the browser session. No CRM, Canonical, Family OS, marketing or database write adapter is added. Any future integration requires separately reviewed authentication, authorization, consent, audit, tenant isolation and deletion workflows.

The frozen-v1 scoring source and fixtures are unchanged: 14 questions, six-dimensional weights, SKIP, completeness, Top Gaps, hard risks and Persona rules remain frozen. Node 22.13 frozen tests: 7/7 PASS. Node 22.13 Wealth content/routing/edge plus Health model tests: 29/29 PASS. First pushed fix 91f210d: remote Website / Canonical / Education / Identity PASS. Health npm test and Python browser PASS; its additional landing browser test exposed a stale exact Wealth navigation URL. The strict full navigation-array assertion is retained with the intended dedicated Wealth URL. Final full suite and browser evidence must be read from the final remote CI run; local partial PASS is not a staging or production verdict.

## Domain evidence (read-only, 2026-11-04 Asia/Shanghai)

Authoritative dns21.hichina.com and dns22.hichina.com return A 1.12.77.180 (TTL 600), consistent with 1.1.1.1 / 8.8.8.8 / 9.9.9.9. No AAAA/CNAME answer observed. SOA serial 2026082716.

HTTP / returns 302 to http://wealth.phoenixnova.com.cn/wealth-compass (no HTTPS upgrade). /wealth-compass returns old Next.js 200; /zh returns old Wealth 404/noindex. TLS SNI selects CN/SAN api.phoenixnova.com.cn only, Let's Encrypt YR2, validity 2026-09-22 through 2026-12-21. OpenSSL chain verify=0 but hostname verify=62 (mismatch); normal Windows curl fails SEC_E_WRONG_PRINCIPAL. A trusted chain does not make the hostname valid.

Sites V5 project appgprj_6a984094b9ec819199c957f0f7a34889 has no custom domains. Latest saved version 6 is source 5a813aa46971557115f6e0f947f7d41f2b5b1fa9 with no deployment_id. Version 3 has deployment appgdep_6a992fdafef481919266934bf20acdef; this is not proof of the active Wealth release or an accepted rollback target.

## Missing gates

- PR #40 approval/merge, then sync latest main and retarget #43.
- Passing final-head remote Website / Health / Canonical CI, including bilingual 40-route HTTP and browser journeys at 320 / 390 / 768 / 1440.
- Independent approval on the final Wealth head (not agent self-review).
- Correct hosting target ownership, exact saved/deployed Wealth source SHA, domain validation, SAN and TLS chain for the Wealth hostname, HTTPS redirect, error-page acceptance, and an explicitly accepted rollback version.
- Founder Gate before formal domain binding or traffic switching. Keep noindex until separately authorized.

No merge, deployment, DNS change, domain binding, indexing enablement or production database mutation was performed.
