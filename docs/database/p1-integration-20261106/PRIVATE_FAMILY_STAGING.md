# Private FAMILY workbench staging

This path is disabled by default. Use an access-controlled private HTTPS
deployment and independently approved nonproduction services. Real identity
acceptance remains HOLD until the authority, bindings, roles, accounts and
sign-offs in the [release gate](CONTRACT_AND_RELEASE_GATE.md) are verified.

## Website

Set `SERVICE_WORKBENCH_PRIVATE_STAGING=true`, `SERVICE_WORKBENCH_ENABLED=true`,
`CUSTOMER_CANONICAL_BRIDGE_ENABLED=true` and `CUSTOMER_AUTH_ENABLED=1` only on
the private deployment. Set `CUSTOMER_AUTH_PRIVATE_ORIGIN` to its exact HTTPS
origin, distinct from the existing customer auth origin.

Bind `CUSTOMER_AUTH_PRIVATE_D1` to the isolated customer auth D1 database and
`PRIVATE_WORKBENCH_AUDIT` to a separate audit binding with
`core_auth_audit(id,actor_user_id,action,created_at)`. Verify these are distinct
from the existing `DB` by deployment binding ID. Workbench reads do not modify
the auth D1 or refresh its idle timer. Login and logout retain their existing
session lifecycle. Workbench security audit records append to the separate
binding. Missing bindings fail closed and never fall back to development mode.

Configure two distinct service bindings. `PRIVATE_WORKBENCH_AUTHORITY` is the
trusted identity authority, and `PRIVATE_WORKBENCH_GATEWAY` is the authenticated
private relay to the loopback backend. These bindings are server-only.
Set `PRIVATE_WORKBENCH_DELIVERY_SECRET` through the private runtime secret
store to a random 32-byte base64url value. It authenticates short-lived
receipts bound to the current session. Keep the key, receipts, cookies and
session hashes out of logs.
The gateway receives only the scoped opaque bearer, without a browser cookie
or a development transport marker. Public routes, shared cookies and existing
development previews use their existing configuration.

## Identity authority and loopback backend

The private authority exposes POST endpoints under
`/v1/workbench/customer-session/`. Only the verified service identities may
call them. `resolve` takes `{customerId,sessionHash}` and returns
`{token,expiresAt}`. `inspect` takes `{token}` and returns
`{customerId,sessionHash,principalId,actorPersonId,familyId,channel,expiresAt}`.
The binding on the website and the backend authority URL must reach the same
authority and audience. The authority issues an opaque token with a fixed
expiry of at most 300 seconds and checks the source session, mapping and
current grants on every inspection. A missing, ambiguous, revoked or expired
scope denies. Only the FAMILY channel is supported. Do not include token,
session hash or private account identifiers in logs or review evidence.

Build the education server and run its dedicated
`npm run start:private-workbench` entry point. Set
`PRIVATE_WORKBENCH_MODE=private-family`, `PRIVATE_WORKBENCH_PORT`,
`PRIVATE_WORKBENCH_APP_URL`, `PRIVATE_WORKBENCH_BINDER_URL`,
`PRIVATE_WORKBENCH_AUTHORITY_ORIGIN` and `PRIVATE_WORKBENCH_AUTHORITY_KEY`
through private runtime configuration. The process binds only to IPv4
loopback. The app and binder roles must be separate on the same approved
isolated database with the reviewed 0039 customer read projection available.
The existing database role guard and audit checks still apply.

The website and gateway accept only GET for summary, project list, project
details and catalogue. Commands, uploads, downloads and development login
are closed. The private workbench does not show mutation controls. Gateway
reads use the scoped customer projection and retain the security audit.

The same-origin POST `/api/family-services/delivery-receipt` writes only to the
audit binding. The private UI sends this confirmation after parsing and
validating the response and waits for an acknowledgement before rendering
the data. The delivery event records an authenticated application receipt.
Access preparation and browser receipt have separate events. A receipt can
be accepted once for its request, and it expires with the bound session or
its own short deadline.

The audit D1 records first-check session rejections and pairs the request,
preparation, denial and delivery events by their request ID. The synthetic
staging controller writes requested and applied or failed events before and
after revoke and forced idle or absolute expiry operations. These events use
the existing audit table. Retain the audit store across runtime restarts and
verify its history during staging acceptance.
The dedicated entry point does not provision a database or run migrations.
The real environment requires its own review of least-privilege credentials,
binding IDs, access, audit retention, alerting and rollback.
