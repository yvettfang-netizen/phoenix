# Wealth subdomain preparation — HOLD (2026-11-04)

Founder-selected origin: `https://wealth.phoenixnova.com.cn`.

External domain work was paused while the Wealth page was completed. On 2026-11-04, the Founder said domain configuration was complete and asked to resume Part 19. The read-only checks below supersede the earlier DNS/TLS observations. No DNS record, hostname binding, certificate, production deployment or traffic change was performed.

## Prepared architecture

Option A: reuse the existing website application. The Worker validates the exact request URL hostname and maps public `/zh`, `/en`, `/compass`, `/services/*`, `/knowledge/*` and `/regions/*` routes to the existing Wealth page namespace. Forwarded-host headers do not select the surface. Other hosts retain their routes. Main-site Wealth links use the selected official origin; other Wealth header/footer links return to the main site.

The Wealth host denies data/API/auth/internal routes and write methods, emits no shared-domain cookie or permissive CORS, and applies noindex plus HTML script hashes for CSP. Current-browser drafts are not SSO, Canonical consent or a family account. Existing main-site `__Host-` Secure/HttpOnly/SameSite session handling is unchanged. Future cross-subdomain sign-in needs an explicit reviewed identity flow; do not widen cookie Domain.

Metadata uses the dedicated origin, `zh-CN`/`en` alternates and individual page Canonicals. The host has an independent XML sitemap and disallow-all Robots response. JSON-LD describes informational WebPages/Articles rather than a regulated financial institution. Actual public search indexing and Search Console ownership are unverified and must stay gated.

## Already observed, not a proposed DNS target

- The checked `.openai/hosting.json` points to the existing active Sites project, whose returned URL is `https://phoenix-nova-v5-candidate.yvettfang.chatgpt.site`.
- The connected Sites domain inventory was empty. It returned no Wealth CNAME target or validation records.
- Read-only DNS resolution reported Wealth and www hostnames absent, and returned root-domain A `1.12.77.180` with authority names `dns21.hichina.com` / `dns22.hichina.com`. These are resolver observations, not proof of account access or selection of a hosting destination.
- A normal HTTPS HEAD to the root domain failed certificate-name validation. No certificate warning was bypassed.
- DNS account ownership, change permissions, definitive deployment topology and the exact new-host target remain `EVIDENCE_MISSING`.

Do not copy the observed root A address or the generated Sites URL into Wealth DNS. Once domain work is resumed, the chosen host must return the actual supported CNAME/A/AAAA target and TLS validation records. Founder approval is required before applying them. Verify HTTP→HTTPS, certificate hostname/chain/expiry and the canonical host after binding.

## Read-only live check — 2026-11-04

The Founder-reported DNS setup is not yet matched by the selected hosting project's domain inventory or by a valid HTTPS endpoint:

- Sites reports project `appgprj_6a984094b9ec819199c957f0f7a34889` as active, owner access, live origin `https://phoenix-nova-v5-candidate.yvettfang.chatgpt.site`, latest version 6, and no preview URL. Its custom-domain inventory is empty. No supported Wealth CNAME target or TLS validation records are available from this project until a domain binding exists.
- The browser request to `https://wealth.phoenixnova.com.cn/zh` stopped with `net::ERR_CERT_COMMON_NAME_INVALID`. The browser security warning was not bypassed; certificate chain, expiry, and HTTP response headers therefore remain unverified.
- An HTTP browser tab stayed at `http://wealth.phoenixnova.com.cn/zh` and showed the document title `Wealth Compass™｜家庭财富健康入口`; the requested V3 title was not evidenced there. The tab's full accessibility read timed out, so this is only browser-tab metadata, not a completed page-content test or a confirmed HTTP status code. No HTTP-to-HTTPS redirect was observed.
- Local DNS and HTTP command-line checks were blocked by the managed environment's network proxy (`localhost:15236`). The browser reached an upstream endpoint, but its A/AAAA/CNAME value, DNS provider, authoritative state, and account permissions were not established. Do not infer a DNS record target from this observation.
- The browser could not safely validate the English route, details, Canonical/hreflang, JSON-LD, robots, or sitemap over the invalid HTTPS endpoint. Those remain local-code/test evidence only. API/CORS, Family OS, and Founder OS production integration were not exercised.

The current `Phoenix Nova website V5` Sites project is not evidence that PR #43's Wealth changes have been deployed. Binding the hostname to this project before a reviewed version is selected could expose its existing live version on the Wealth host. Keep the host unbound until the hosting target and release version are explicitly established.

| Live acceptance check | Result |
|---|---|
| DNS record type/value, authority and target | HOLD — not independently verified |
| Hosting project custom-domain binding | HOLD — inventory empty |
| HTTPS hostname certificate | FAIL — common-name mismatch |
| HTTP to HTTPS redirect | FAIL / not observed — browser remained on HTTP |
| V3 `/zh` and `/en` production pages | HOLD — not verified; current HTTPS blocked |
| Live SEO/GEO and sitemap/robots | HOLD — not verified over HTTPS; code remains noindex |
| Production API/security and Family OS | HOLD — no live integration evidence |
| Traffic switch, index opening, production release | NOT APPROVED |

**Required next evidence:** the actual DNS record and target from the DNS control plane; the intended hosting account/project and its supported binding target; then a valid certificate for the Wealth hostname and a reviewed deployment containing this branch. Only after that can the locale, route, redirect, SEO/GEO and security checks in §19.9 be repeated against the live host. Do not bypass the browser certificate warning or guess a CNAME.

## Gate state

| Gate | State |
|---|---|
| LOCAL_DEVELOPMENT | Page candidate verified |
| PREVIEW_DEPLOYMENT | Not performed; loopback frontend rehearsal only |
| DNS_READY | HOLD; endpoint responds over HTTP but record/target/authority missing |
| TLS_READY | HOLD; browser reports `ERR_CERT_COMMON_NAME_INVALID` |
| FOUNDER_REVIEW | Page prepared, acceptance pending |
| FOUNDER_RELEASE_APPROVED | Not granted |

Domain/production tests, live authenticated API/CORS integration, Family OS handoff and production indexing remain unverified. The local deny tests establish that these unavailable capabilities are not exposed; they do not establish live integration readiness.
