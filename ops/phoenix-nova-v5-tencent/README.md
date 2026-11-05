# Phoenix Nova V5 — Tencent Cloud deployment

Deployed on 2026-11-05 (Asia/Shanghai) at https://phoenixnova.com.cn.
The hostname was explicitly corrected from `phoenix.nova.com.cn` by the owner.

## Source and runtime

- Base: `yvettfang-netizen/phoenix` main, `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`.
- V5 source: `website/phoenix-nova-website-v5/`, plus the Node adapter in this branch.
- Retain `Phoenix Compass/Wealth Compass/src/domain/wealth-compass/frozen-v1.ts` at its original relative path when packaging.
- Server: Tencent Cloud `1.12.77.180`, Ubuntu 24.04, Nginx 1.24, Node 24.20.0.
- Release: `/home/ubuntu/phoenix-nova-v5/releases/20261105-9de1e8d-node`.
- Active symlink: `/home/ubuntu/phoenix-nova-v5/current`.
- Service: `phoenix-nova-v5.service`, loopback `127.0.0.1:4315`.
- Nginx configuration: `/etc/nginx/sites-available/phoenix-nova-v5`, enabled by a symlink with the same name in `sites-enabled`.

See the application [Node deployment instructions](../../website/phoenix-nova-website-v5/docs/TENCENT_NODE_DEPLOYMENT.md) for the clean build and smoke commands. Install the full lockfile, including dev dependencies required by the Vinext production launcher. No global Node or existing application dependencies were replaced.

## HTTPS and preserved routes

The A record already pointed to this server. HTTP redirects to HTTPS, except the ACME challenge path. A Let's Encrypt certificate for `phoenixnova.com.cn` was issued, expiring 2027-02-03. The existing enabled `certbot.timer` and executable `renewal-hooks/deploy/reload-nginx.sh` renew and reload Nginx.

The exact-host V5 vhost retains `/wealth-compass` on port 3001, `/identity-compass` on 3002, `/askwise` on 3003, the legacy Wealth deep-link redirects, and the existing UAT redirect. Existing API, UAT, retired-domain and default vhost files were not edited.

Customer authentication and database access remain disabled, as in the original Sites runtime configuration. The site retains its existing noindex and candidate behavior. The original Sites project and its access configuration were not redeployed or changed.

## Verification

Passed on the production Linux release:

- Node adapter unit tests and native production build.
- TypeScript checking.
- Public HTTPS smoke checks: both languages, home/education/identity/health/wealth/account/family-center, JS/CSS, official logo, homepage canonical origin, Health document language, spoofed internal headers and the disabled authentication API.
- TLS hostname/chain validation, HTTP-to-HTTPS redirect, and root-to-`/zh` behavior.
- Preserved tool paths returned 200; production API `/health` returned 200. Legacy and UAT redirects were retained.
- Nginx syntax check and enabled/active systemd service.

Browser automation could not connect during this task, so a new visual/browser-interaction audit was not completed. This change adds hosting support and does not edit the visual design or business content.

## Operations and rollback

```sh
sudo systemctl status phoenix-nova-v5
sudo journalctl -u phoenix-nova-v5 --no-pager -n 100
sudo nginx -t
```

For subsequent releases, build a new directory first, run the smoke checks on a temporary loopback port, retain the current target, switch `current`, restart the service, and rerun public smoke checks. If a new release fails, restore the previous `current` target and restart this service.

To roll back this first domain cutover to the pre-existing default website, unlink only `/etc/nginx/sites-enabled/phoenix-nova-v5`, verify `nginx -t`, then reload Nginx. The existing default HTTP vhost will resume handling the hostname. Stop/disable `phoenix-nova-v5` after the routing rollback. Do not remove the certificate or change any other vhost or application process as part of that rollback.
