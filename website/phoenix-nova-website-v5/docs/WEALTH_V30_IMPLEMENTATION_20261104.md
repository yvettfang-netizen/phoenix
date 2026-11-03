# Wealth V3.0 — Founder review candidate

Task: `PHOENIX-WEALTH-V30-FULL-PAGE-20261104` · 2026-11-04 Asia/Shanghai.

Status: **LOCAL_DEVELOPMENT PASS / FOUNDER_REVIEW PENDING / NOT RELEASED**.

## Source and scope

- Repository: `yvettfang-netizen/phoenix`.
- Latest main inspected: `9355d28667ee9cf4761b4abcdaf959f0ad154820`.
- Shared B-logo dependency: PR #40, `ba478ce644c7a39a8162317a69bb4eaff5169709`.
- Independent branch: `codex/wealth-v30-full-page-20261104`; Draft PR is stacked on PR #40 to keep its branding changes separately reviewable. No merge or deployment.
- Website implementation reuses `website/phoenix-nova-website-v5`, Vinext/Next conventions, TypeScript, shared Header/Footer, B-logo bytes and design tokens. Bundled Next layout/page documentation was read before implementation.
- No changes to Education, Identity or Health domain/page implementations, auth implementation, lockfiles, Canonical SQL or database entities. Shared navigation now says 财富 and points to the Founder-selected Wealth host; the existing homepage gains four Compass entry cards.

## Delivered page experience

The bilingual page contains the specified order: Hero, five values, five services, six-dimension Wealth Compass, practical planning checklists, six regional entries, searchable knowledge centre, family growth map, Family OS connection, professional collaboration, FAQ, consultation preparation, and the shared Footer.

Five service detail pages, six regional detail pages and six knowledge guides have substantive bilingual content. Together with the landing, Compass and knowledge index, there are **40 bilingual public route variants**. Unknown locales, sections and slugs return 404.

The design follows `#A77B4A / #C9B598 / #E8DFD1 / #F2EDE5`, Song-style Chinese/serif headings, warm family photography, quiet cards and fine gold lines. Wealth styling is scoped. The B logo is reused without modification.

Search responds to keywords, supports a truthful empty state and clears filters. Regional selection opens the relevant regional planning questions; the current general guides are labelled global rather than presented as jurisdiction-specific advice. Both checklists are page-local. Service scopes and FAQ use keyboard-operable native disclosures.

Consultation currently prepares a direction only. It explicitly states that booking is unavailable and does not claim an enquiry was sent or a time was reserved. There is no collection of names, exact financial amounts, account identifiers, documents or payment details.

## Frozen rules: source and verification

Business authority was fetched directly through the connected Notion integration:

- [Founder Freeze Pack](https://app.notion.com/p/3c5c31ee15bb8155aab9c6c8a42168e4).
- [API / CRM / permission-state task](https://app.notion.com/p/3c5c31ee15bb813cbba6dba1d61b5d92).

The short supplied URL was resolved through Notion search to the exact titled Freeze page. Its `FROZEN` section contains `WC-QB-1.0.0`, `WC-SR-1.0.0`, `WC-CC-1.0.0`, `WC-PT-1.0.0`. The API task contains unchecked engineering deliverables, not a completed executable API contract.

The authoritative existing product directory held empty `RULES_NOT_LOADED` placeholders. The older local preview used different dimensions and incomplete questions; it was deliberately not imported. The single new dependency-free frozen implementation lives at:

`Phoenix Compass/Wealth Compass/src/domain/wealth-compass/frozen-v1.ts`.

The website imports this module directly, without copying its business model. Historical placeholder APIs remain inert; this change does not silently activate their mock CRM/referral flows.

| Dimension | Frozen weights |
|---|---|
| D1 家庭目标与决策协同 | Q01 40 / Q02 30 / Q04 30 |
| D2 资产负债可视与结构 | Q05 60 / Q06 40 |
| D3 现金流与应急韧性 | Q07 55 / Q08 45 |
| D4 保障与风险隔离 | Q09 45 / Q10 55 |
| D5 跨境身份与税务协调 | Q03 25 / Q11 35 / Q12 40 |
| D6 传承治理与信息连续 | Q13 50 / Q14 50 |

SKIP remains null; answered weights determine confidence. Six-dimension readiness, gaps, completeness, fixed actions, the six explicit hard-risk formulas and tie-breaking follow the frozen rules. No overall wealth ranking is exposed. Cross-question contradiction rules beyond the supplied formulas are not invented; a more detailed contradiction catalogue remains a business evidence gap for a future server report workflow.

| Fixture | D1 / D2 / D3 / D4 / D5 / D6 | Top gaps |
|---|---|---|
| P01 | 79 / 79 / 76 / 70 / 88 / 38 | D6, D4, D3 |
| P02 | 54 / 61 / 29 / 0 / 15 / 50 | D4, D5, D3 |
| P03 | 100 / 100 / 100 / 100 / 73 / 100 | D5 |

English questions/consents are engineering translations of the frozen Chinese, pending Founder wording acceptance. Rule codes, scores and weights are shared across languages.

## Consent and data boundary

- C1 is unchecked by default and required before answering. It retains the frozen Chinese copy.
- This is a deterministic, non-AI path; C2 is not required or inferred. C3/C4/C5 never become granted through C1.
- Answers remain in component memory. Explicit save writes only a validated draft plus versions and an anonymous C1 receipt (version, time, page pathname, opaque actor) to the current browser session. Reload requires renewed C1 before restoring; withdrawal/clear removes the draft. No URL query records are saved.
- OTHER text is limited to 50 characters; suspicious identifiers, credentials and exact amounts are rejected before state/storage. Restored drafts and the scoring boundary validate again. All server write methods on the Wealth host are denied; there is no server intake adapter claiming to persist these answers.
- No AI request, analytics event with answers, CRM task, partner referral, marketing permission or Family OS record is created. Sensitive answers are not copied to Notion or logs.

## Integration evidence and unresolved work

Verified by source inspection: Canonical already owns people, families, memberships, principals, clients, consent grants, service projects and referrals. Existing `business_domain=WEALTH` is not a new product code; `FAMILY_COMPASS` must not be rewritten to `WEALTH_COMPASS`. The existing referral state machine and immutable first-touch attribution are untouched.

The Family OS handoff documents define a minimum WEALTH summary contract and separate longitudinal/advisor consent boundaries. They do not supply an accepted live adapter. Founder OS runtime interfaces were not found. This PR therefore does **not** claim Canonical persistence, authenticated Family OS handoff, CRM integration, live booking, AI reports or production readiness.

Jimson's additive API/identity/need mapping and Baihu's consent/data review remain required for real data. No parallel Client/Family/Member/Partner/Consent/Service Project schema is introduced.

## Verification

- Production bundle: PASS (`node node_modules/vinext/dist/cli.js build`).
- Website TypeScript: PASS (`tsc --noEmit --incremental false`).
- Changed website source ESLint: PASS.
- **40 native Node tests PASS**: frozen rules 7; content 7; routing 9; edge/security 5; HTTP 3; main regression 1; unchanged Health model 8.
- HTTP tests enumerate all 40 bilingual public pages, Canonical/hreflang/noindex, substantive content, one h1, valid knowledge JSON-LD, unknown routes, denied write/API methods and eight existing main-site pages with B-logo integrity.
- Browser review: 1440 desktop, 390 mobile and 320 mobile; Chinese P01 complete 14-question journey; English all-SKIP journey; C1 default false; explicit save/reload/consent/resume; clear/restart; keyword/empty/region search; local consultation status; service keyboard disclosure; FAQ; detail-preserving language switch. No browser console errors observed.
- The HTTP/browser runtime is the existing **frontend-only Node adapter** around the built Worker, with an empty Cloudflare environment. It is not native workerd, real-device, production authentication, PostgreSQL or integration evidence.

Raw local logs: `outputs/wealth-v30/`. Review screenshots: `docs/evidence/wealth-v30/`.

The Wealth product's existing `npm test` runs its Vitest suite followed by the native frozen-rule regression in `tests/unit/frozen-v1.node-test.mjs`. This avoids mixing Node's test API into Vitest discovery. Website HTTP tests are opt-in: set `WEALTH_TEST_ORIGIN` and `MAIN_TEST_ORIGIN` to the running local adapters before invoking them. Default website unit/Worker test discovery does not assume a separately running localhost server.

The historical Wealth product's full Vitest/Next build was not rerun locally: that child package has no installed dependencies here. The new frozen module is covered by the seven executed native tests and the website TypeScript/build. The unchanged historical placeholder flows are not claimed as newly accepted runtime functionality.

## Preview

From the website directory after building:

```text
node scripts/wealth-node-preview.mjs
```

- Chinese: `http://127.0.0.1:4481/zh`.
- English: `http://127.0.0.1:4481/en`.
- This loopback helper rehearses the Wealth Host routing, without touching DNS or serving production data. Main-site review paths `/zh/wealth` and `/en/wealth` also remain noindex with the dedicated-host Canonical.

## Image provenance

Built-in imagegen generated `public/images/wealth-v3/family-harbour.png`; no fallback API was used. Prompt: a natural editorial wide photograph of a multigenerational Chinese family on a cream sofa, overlooking Victoria Harbour from a warm modern family living room, late-afternoon light, muted cream/champagne/bronze, family on the right and pale negative space on the left; no text, logos, money, gold bars, stock charts or excessive luxury. Image is illustrative, not a customer case. Existing regional decorative assets are reused.

## Founder review boundary

Review the complete bilingual page, service/knowledge content, English translations and browser-only assessment. Merge, public indexing, production traffic, live-data intake and database migration remain unapproved. Domain work is paused at the user's later instruction; the previously prepared plan is retained separately.
