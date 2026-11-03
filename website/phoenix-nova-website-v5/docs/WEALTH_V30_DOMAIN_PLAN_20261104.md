# Wealth subdomain preparation — PAUSED

Founder-selected origin: `https://wealth.phoenixnova.com.cn`.

At the later instruction to pause domain resolution and complete the page, external domain work stopped. This file retains the already prepared findings. No DNS record, hostname binding, certificate, production deployment or traffic change was performed.

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

## Gate state

| Gate | State |
|---|---|
| LOCAL_DEVELOPMENT | Page candidate verified |
| PREVIEW_DEPLOYMENT | Not performed; loopback frontend rehearsal only |
| DNS_READY | PAUSED; target/authority missing |
| TLS_READY | PAUSED; no Wealth hostname certificate evidence |
| FOUNDER_REVIEW | Page prepared, acceptance pending |
| FOUNDER_RELEASE_APPROVED | Not granted |

Domain/production tests, live authenticated API/CORS integration, Family OS handoff and production indexing remain unverified. The local deny tests establish that these unavailable capabilities are not exposed; they do not establish live integration readiness.
