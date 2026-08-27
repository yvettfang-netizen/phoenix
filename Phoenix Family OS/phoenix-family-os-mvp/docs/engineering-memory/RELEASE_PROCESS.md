# Phoenix Family OS™ Release Process

```text
Development
→ Automated / Static Testing
→ WeChat Acceptance
→ Internal Demo RC
→ Public RC
→ Production
```

Each transition is a separate gate.

## Current commands

```text
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` is static validation. `pnpm lint` is not configured. WeChat compile, simulator, device, brand, privacy, security, and production checks are independent.

## Current decisions

- Internal Demo: conditional use with synthetic data and explicit Demo boundary.
- Public RC: HOLD / NO-GO.
- Production and real family data: NO-GO.
- Upload, WeChat review, Merge, deployment, and release require separate authorization.

## Public/production prerequisites

- controlled AppID and approved HTTPS domain
- server-side WeChat identity/session
- managed encrypted datastore, migrations, backup/recovery
- server-side family/advisor/admin RBAC, assignment, consent and audit
- export/deletion, retention, monitoring and incident response
- platform compile, simulator/device matrix, brand/product/security/privacy sign-off

Rollback uses reviewable `git revert` commits and post-rollback tests. Do not use destructive workspace-wide reset as the default recovery method.
