# Homepage V6.3 — compact Founder review

Date: 2026-11-04. Increment on `codex/phoenix-homepage-v6-20261104`, PR #44. This supersedes the earlier V6/V6.2 homepage proportions; no main merge or production deployment is authorised by this implementation.

## Eight-block contract

1. Shared B-logo Header, seven primary destinations and locale/account entry.
2. Photographic multigenerational Hero with short value proposition and two real links.
3. Four photographic, colour-coded domain cards with one sentence each.
4. Six compact journey links.
5. One horizontal teal resource-connection band.
6. Compact Family OS entry through `/account`, with preview notice and no family records.
7. Education ecosystem and Insights in one side-by-side block.
8. Compact brand statement, navigation and copyright Footer.

The homepage renders six direct main sections plus Header/Footer. No standalone story section, FAQ, GEO article collection or repeated service inventory. The full business pages and their content are retained. Desktop height is measured at 1440 CSS pixels after image decoding and font readiness; no clipping or line clamp is used to fake the height. Mobile content wraps naturally.

## Destinations

| Entry | Chinese | English | State |
| --- | --- | --- | --- |
| Education | `/zh/education` | `/en/education` | Existing main page |
| Identity | `/zh/identity` | `/en/identity` | Existing main page |
| Wealth | `/zh/compass#wealth` | `/en/compass#wealth` | Explicit controlled preview |
| Health | `/zh/health` | `/en/health` | Existing main page; existing assessment gate retained |
| Family OS | `/zh/account` | `/en/account` | Existing controlled authentication entry |
| Academy | `/zh/education#academy` | `/en/education#academy` | Product introduction |
| ASKWISE | `/zh/education#askwise` | `/en/education#askwise` | Product introduction |
| Insights | `/zh/insights` | `/en/insights` | Candidate editorial stream; no fabricated dates or articles |

`wealth.phoenixnova.com.cn` now resolves to `1.12.77.180`, but HTTPS fails hostname/certificate verification (`SEC_E_WRONG_PRINCIPAL`). No insecure bypass was used to declare the application available. Keep the fallback until both locale pages and valid TLS are verified.

`localizedHref` centralises locale handling; the URL remains authoritative. Switching between Chinese and English keeps Education, Identity and Health paths. No browser preference or cookie overrides were added. No cross-subdomain cookies or authentication changes.

## Brand and safety

B PNG: `public/brand/official/v3/phoenix-nova-bilingual-b@2x.png`, 2172×724, unmodified SHA-256 `44B12321C52378B4F4BFE6632EC28E6E3C8AE0680C6E54D23225C77AC5B2C7B6`.
Colour roles: main `#003B46/#081F2C/#C99B50/#F8F6F1`; Education `#8FAF96/#A8BCA6`; Identity `#416F91/#094768`; Wealth `#A77B4A/#C9B598/#F2EDE5`; Health `#43847D/#8AAEA1`.

Hero is the existing illustrative photographic asset. The four cards use existing photographic campus, harbour, family and healthcare assets with a consistent crop and saturation. No Logo redrawing, favicon changes, questionnaire changes, migrations, customer records or API writes. No public indexing changes.

Existing Health preview remains default-off. When explicitly enabled, its shortcut lives in the compact Footer rather than adding another homepage band. Existing digital-world navigation remains available. Full business-page footers are retained; the homepage alone opts into the compact variant.

## Verification record

1440px desktop measurements (CSS pixels):

| Block | Chinese | English | Founder target |
| --- | ---: | ---: | --- |
| Header | 60 | 60 | 56–64 |
| Hero | 250 | 250 | 230–270 |
| Four Compasses | 172.38 | 172.38 | 145–175 |
| Six journeys | 97.69 | 97.69 | 90–115 |
| Resource connection | 102.30 | 119.09 | 95–120 |
| Family OS | 125 | 125 | 115–140 |
| Education & Insights | 158.94 | 158.94 | 130–160 |
| Footer | 122 | 122 | 100–130 |
| Total page scroll height | 1088 | 1105 | 1000–1150 |

Build: PASS. TypeScript: PASS. ESLint: zero errors, one existing unused `Bell` warning in `customer-center.tsx`. Brand-integrity and locale helper unit tests: 2 PASS. The full V6.3 browser test includes block measurements, two-line descriptions, real internal route checks, three viewports per locale, six business-language navigation transitions, image decoding and runtime-error capture. Screenshots are captured after scrolling and painting the full page, so lazy images cannot masquerade as blank photo cards.

Frozen preview `http://127.0.0.1:4479`: homepage 22 PASS; Education 16 PASS; Identity 22 PASS; homepage runtime errors 0. The first Health run exposed a stale brand assertion: the original questionnaire deliberately uses an ivory carrier on its dark Header, rather than the transparent wrapper used by light page headers. The regression now asserts that exact ivory carrier, unchanged image bytes, original colours, aspect ratio, no border and no filter. Its no-JS check observes the disabled form directly instead of waiting for unrelated lazy network requests to become idle. No questionnaire or service logic changed.

Exact final heights, all block measurements, locale switches, internal link statuses, overflow checks and screenshots are recorded in `docs/previews/homepage-v63/`. The browser test rejects a 1440px homepage outside 1000–1150px and checks each specified block range and two-line Compass descriptions.

Build, TypeScript, lint and route/brand-unit results are rerun for this increment. Local browser verification uses the existing frontend-only adapter, with no database binding. It does not prove production authentication or Worker compatibility; Ubuntu CI covers those runtime suites. Pending business candidate PRs #33/#34/#35/#38 and Logo PR #40 remain separate, as documented in the V6 dependency audit.

Founder visual approval and release approval remain pending. No merge, production homepage switch, production deployment or DNS mutation performed.
