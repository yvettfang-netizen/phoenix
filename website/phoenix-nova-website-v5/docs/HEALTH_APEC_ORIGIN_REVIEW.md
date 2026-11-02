# Health Brand Origin — Founder review

Task PHOENIX-HEALTH-APEC-STORY-20261102. Incremental candidate on PR #34, baseline `ef0b8ca8229723590466bef8ea2eeb3bce048541`; PR #33 remains its dependency. Both remote PRs were rechecked open/Draft and local tree was clean before this task. No other worktree changed.

## Fact and claim register

Verified 2026-11-02 using the accessible [Nanshan District Government official APEC page](https://www.szns.gov.cn/english/apec2026shenzhen/): the 2026 APEC Economic Leaders' Meeting is in Shenzhen, 18–19 November 2026. Independent corroboration: [China Government announcement](https://english.www.gov.cn/news/202512/12/content_WS693c1432c6d00ca5f9a080e6.html). These sources support the city/date only; they do not verify any Phoenix Nova relationship or healthcare capability.

Founder instruction is the source for Phoenix Nova's independent Shenzhen launch plan and target audiences, not an APEC endorsement. Non-clinical navigation/coordination is proposed scope subject to provider, authorization and service confirmation. No hospital partnership, appointment, treatment or operational readiness is asserted. The visible disclaimer disavows official organization, authorization, designated medical service and sponsorship. No APEC logo, badge, official conference visual, Event schema or new Organization entity is added.

Fixed dated wording avoids countdowns and “upcoming” language. After the meeting the date can remain historical city context; editorial review must verify that the meeting occurred before changing scheduled dates to an assertion of actual attendance or outcomes.

## Visual and interaction evidence

Before: [Chinese desktop](previews/health-geo/zh-1440-home.png), [English desktop](previews/health-geo/en-1440-home.png), [Chinese mobile](previews/health-geo/zh-390-home.png), [English mobile](previews/health-geo/en-390-home.png).

After: `previews/health-apec/{zh,en}-{390,768,1440}-origin.png` and corresponding `-full.png`. Automated results: `previews/health-apec/results.json`. Official-source verification is separate from automated availability or link checks.

Preview links: [中文PC](previews/health-apec/zh-1440-origin.png), [English PC](previews/health-apec/en-1440-origin.png), [中文手机](previews/health-apec/zh-390-origin.png), [English mobile](previews/health-apec/en-390-origin.png), [768px](previews/health-apec/zh-768-origin.png). Local final build, TypeScript and 22 model/contract/GEO tests PASS. Lint: zero errors, one existing unused Bell warning. All six new bilingual browser scenarios PASS; see recorded JSON. Local frontend adapter at port 4432 is not production or database evidence.

The new unnumbered editorial section sits between Hero and the existing Section 01. All existing numbered sections and anchor tokens are preserved, including the current GEO candidate's later sections. Brand Origin links to the real Shenzhen content route, then its existing consultation CTA returns to the existing preparation interaction. No new form or customer data flow is created.

## Validation and boundaries

`tests/health-apec-browser.mjs` runs Chinese/English at 390, 768 and 1440 px: visible origin/disclaimer/source, no APEC image or form, no horizontal overflow, noindex, no Event JSON-LD, preserved source anchors/numbers, and full real-link journey to existing consultation. CI runs it alongside newly rerun Health/GEO/Compass regressions on the current PR commit. Actual results are recorded in the evidence JSON and PR checks; earlier PASS is not substituted for this run.

Changed files: `components/health-landing.tsx`, `components/health-landing.module.css`, `lib/health-landing-content.ts`, `tests/health-apec-browser.mjs`, `.github/workflows/health-compass-validation.yml`, this report and its screenshots/results. No questionnaire, model, gate, original logo, migration, OS permission or production configuration changes.

Target status: PREVIEW READY / FOUNDER REVIEW after actual checks. Draft/noindex remains; no main merge, production deploy, database migration or public release is authorized.
