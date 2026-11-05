# Tencent Cloud Node deployment

This target runs the V5 public website with Vinext's native Node production
server. It does not use the frontend preview adapters or the Cloudflare Worker
runtime. The existing Sites build and hosting manifest remain available.

## Build and run

Use a separate release directory for this deployment. Vinext 1.4.3's
`vinext start` reads `dist/`, so the Node and Cloudflare builds must not share
the same built checkout. Install all locked dependencies, including build and
Vinext runtime tooling; do not run `npm prune --omit=dev` on the release.

Preserve the repository layout: the V5 assessment imports the existing pure
module `Phoenix Compass/Wealth Compass/src/domain/wealth-compass/frozen-v1.ts`
from the repository root. This single dependency-free file must accompany
`website/phoenix-nova-website-v5`; packaging only the website directory omits it.

```sh
npm ci --no-audit --no-fund
export NEXT_PUBLIC_MAIN_ORIGIN=https://phoenixnova.com.cn
npm run node:test
npm run node:build
npm run node:start
```

`node:start` binds only `127.0.0.1:4315`. Put Nginx in front and use a systemd
service with `WorkingDirectory` set to the built release, `NODE_ENV=production`,
an absolute Node/npm executable path and `Restart=on-failure`. Keep releases
and logs under the service user's control. A successful switch requires the
HTTP checks below before Nginx reloads; retain the previous release for rollback.

Nginx should proxy to `http://127.0.0.1:4315`, set `Host` to the literal
`phoenixnova.com.cn`, and set `X-Forwarded-Proto` from its own `$scheme`.
When enabling `VINEXT_TRUST_PROXY=1` in the service, keep this loopback binding
and overwrite forwarded protocol headers at Nginx.
Use a valid certificate for the hostname and redirect HTTP to HTTPS after
certificate issuance. DNS must point this hostname at the server's public IP.
Do not modify unrelated server blocks or DNS records during this deployment.

## Runtime boundary

- The Node-only build alias exports an immutable empty Cloudflare environment.
  Customer authentication stays disabled, no D1 or other database is connected,
  and customer-auth API calls return the existing unavailable response. Host
  `CUSTOMER_AUTH_*` variables cannot enable it.
- Node middleware removes caller-supplied `oai-*` and `x-phoenix-*` headers.
  Health document language is then derived from the URL. The Cloudflare build
  skips this Node-only branch and keeps its Worker-owned header processing.
- This target serves the main domain. The dedicated Wealth domain's edge
  routing and response policy remain in the existing Worker implementation;
  this is not a deployment of `wealth.phoenixnova.com.cn`.
- `NEXT_PUBLIC_MAIN_ORIGIN` is validated and embedded at build time. The
  existing noindex policy and preview-only business interactions are unchanged.
  This deployment does not enable customer records, payments or application
  submissions.

## Verification

With the production process running:

```sh
NEXT_PUBLIC_MAIN_ORIGIN=https://phoenixnova.com.cn npm run node:smoke
```

The smoke test checks both languages across the primary pages, client assets,
the official logo, canonical origin, Health HTML language, spoofed locale
headers and disabled customer-auth API behavior. Once DNS/TLS are configured,
repeat with `NODE_SMOKE_ORIGIN=https://phoenixnova.com.cn` to verify the external
route. A passing loopback check alone is not evidence of public DNS or TLS.

References: [Vinext Node setup and CLI](https://github.com/cloudflare/vinext),
[CLI implementation](https://github.com/cloudflare/vinext/blob/main/packages/vinext/src/cli.ts).
