# Phoenix Nova V6 homepage review — 2026-11-04

## Baseline and isolation

Main fetched from GitHub: `9355d28667ee9cf4761b4abcdaf959f0ad154820`.
Independent branch: `codex/phoenix-homepage-v6-20261104`.
Workspace: `D:/CODEX/PhoenixNova/_Worktrees/homepage-v6`.
The original workspace, including its uncommitted Compass changes, was left intact.

| PR | Current audit state | Integration decision |
| --- | --- | --- |
| #31 Identity | merged | Reuse the main route |
| #32 Education | merged | Reuse the main route |
| #33 Health V3.1 | open; head `5771c910f8d1bb507eabf0cc6a529f6f28774217` | Keep separate; current main Health route remains linked |
| #34 Health GEO | open; head `5a0fbc4fcee09bcb58668b0f112d1b4f8e13558c` | Stacked on #33; do not transplant its GEO here |
| #35 Identity search | open; head `3e0d1957cd997618f89a07cbfedea08af7d11520` | Keep separate; do not present candidate search as live |
| #38 Education GEO | open; head `8c07672a6d3e3b77f373ec32fd282b20bbc8e0b8` | Keep separate; directory/search content awaits its own review |
| #40 B logo | open; head `ba478ce644c7a39a8162317a69bb4eaff5169709` | Reuse identical Founder PNG bytes without merging the PR |

#40 and this branch overlap in BrandMark, chrome styles and brand tests. Do not blindly merge both diffs: retain the B PNG hash and the final shared rendering, then resolve test assertions against that rendering. Prefer #40 first, rebase V6 and remove duplicate asset changes. #33 → #34 retain their existing stack. #35 and #38 should integrate independently with route/GEO regression checks; V6 does not require those pending features to render.

## Scope

`/{locale}` now renders real V6 components with a family harbour Hero, four equal professional-domain cards, six combination journeys, four connection capabilities, Family OS entry, Education ecosystem, Insights entry and brand story. Shared Header/Footer use the same bilingual PNG. Education, Identity and Health page business components and their assessments are retained.

The B PNG is a byte-identical copy of `鳳啟環球凤凰徽标与双语字标.png`, 2172×724 RGBA, SHA-256 `44B12321C52378B4F4BFE6632EC28E6E3C8AE0680C6E54D23225C77AC5B2C7B6`. Original master and English assets are preserved. No favicon added.

The Hero is a generated illustrative scene, not a customer or institution endorsement. Built-in image generation prompt: panoramic editorial photograph of an Asian three-generation family on the right, Hong Kong harbour and sunrise, quiet teal water on the left for HTML copy; no text, Logo or UI. Stored as `public/images/homepage-v6-family.png`. No pixels from the supplied full-page visual are used as a webpage background.

## Real route mapping

| Entry | Chinese | English | State |
| --- | --- | --- | --- |
| Home | `/zh` | `/en` | V6 SSR candidate |
| Education | `/zh/education` | `/en/education` | main implementation; pending GEO remains independent |
| Identity | `/zh/identity` | `/en/identity` | main implementation; pending search remains independent |
| Health | `/zh/health` | `/en/health` | main implementation; pending V3.1/GEO remain independent |
| Wealth | `/zh/compass#wealth` | `/en/compass#wealth` | Controlled preview fallback |
| Family Center | `/zh/account` | `/en/account` | Existing default-off controlled authentication entry |
| Academy | `/zh/education#academy` | `/en/education#academy` | Product introduction |
| ASKWISE | `/zh/education#askwise` | `/en/education#askwise` | Product introduction, not a new Compass |
| Insights | `/zh/insights` | `/en/insights` | Existing candidate editorial stream |
| Brand story | `/zh/about` | `/en/about` | Existing brand page |

The legacy `/family-center` renders a fictional-family UI preview when authentication is disabled. V6 therefore routes customer entry through `/account`, without enabling authentication or modifying authorisation. No example family or synthetic dashboard appears on the homepage.

Main Insights has no released articles with verified publication dates, sources and detail routes. V6 provides an honest editorial entry; dated article cards remain unimplemented until reviewed records exist. It does not invent news or copy candidate GEO into main.

## Wealth release dependency

Do not promote `https://wealth.phoenixnova.com.cn/{zh,en}` until DNS, certificate and both locale pages are verified. Proposed release checks: resolve the approved hostname; bind the existing Wealth application to that host; validate TLS hostname and chain; test both locale responses, canonical/hreflang, assessment gates and all return links. Then replace the shared fallback through one route contract. No DNS or deployment mutation performed here.

## SEO and data boundaries

Homepage metadata includes bilingual titles/descriptions, canonical/hreflang, OG and Organization/WebSite JSON-LD. The existing candidate origin is used, not a guessed formal parent-brand domain. The four domains are associated through an OfferCatalog; Phoenix Nova is not typed as a hospital, school, bank or government. The homepage is the root, so a breadcrumb is unnecessary.

Robots stays `noindex,nofollow`; `/robots.txt` disallows crawling and the candidate `/sitemap.xml` is empty. A populated production sitemap and final canonical require an approved parent-brand hostname and release decision. No public indexing was enabled.

No migrations, database connections, new customer/family records, assessment changes, answer uploads or analytics handoffs. Existing Family OS/Founder OS/Consent/Canonical boundaries are unchanged. Rollback is reverting the V6 feature commit; existing V5 rendering remains in the repository.

## Acceptance evidence

Build, TypeScript, lint and browser evidence are recorded after execution in the delivery record. Local preview uses the existing frontend-only Node adapter because Windows workerd startup has limitations. It contains no database bindings and blocks API writes; it is not evidence of a production backend deployment.
