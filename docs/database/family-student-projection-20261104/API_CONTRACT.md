# Family / Student minimal read projection — synthetic preview

Task PHOENIX-FAMILY-STUDENT-PROJECTION-20261104. Jimson本人授权，Codex执行。**Development/synthetic implementation; real identity and activation HOLD.** Baseline Canonical is main 9355d28667ee9cf4761b4abcdaf959f0ad154820, 0001–0035. This candidate is stacked on the unmerged PR45 commit 307ab74350eb5e9d745fe37c55e0a8033ed1dff0, without merging it or importing PR41/0036.

## Implemented routes and data origin

| Trusted Node GET | DTO |
|---|---|
| `/v1/canonical/projections/family` | `{schemaVersion:"family-summary.v1", family:{familyRef,displayName}}` |
| `/v1/canonical/projections/students` | `{schemaVersion:"student-summary.v1", items:[{studentRef,displayName}]}` |
| `/v1/canonical/projections/students/:studentRef` | `{schemaVersion:"student-summary.v1", item:{studentRef,displayName}}` |

The same-origin website BFF exposes matching resources under `/api/canonical/projections/`. The optional local `/{locale}/canonical-family-preview` page consumes family/list routes. All are default-off, development/test-only and loopback-only; the page is not linked into public navigation. Existing family dashboards, `/v1/me/*` DTOs and legacy Store behavior are not silently replaced.

Actual response fields are selected from existing core.families, core.people, core.student_profiles and active family_memberships under Canonical RLS. No name/email/phone matching or automatic principal/family/student creation. References in this synthetic candidate are opaque UUIDv7 locators from existing Canonical rows; they are **not approved public IDs, legacy stu_/fam_ identifiers or an implementation of public-ID translation**. Public identifier contract remains HOLD before real activation.

Student data is conservatively limited to the current student本人 or a current VERIFIED guardian using the existing EDUCATION predicate (which already accepts GENERAL). No unrelated household member, self-declared legacy authority, future/expired/revoked guardian, expired student membership or other-family record is returned. This is a narrower preview subset of existing basic-data RLS, not a new general guardianship/consent policy. List excludes unauthorized students; individual unauthorized and unknown locators both return 404. No birth date, age, school, grade, contact, document, report, Learning/Health-sensitive field or membership roster is included. No new Consent purpose is invented; basic summary access is not Consent for learning/medical records.

## Trust and connection lifecycle

1. An isolated synthetic test issuer generates ES256/P-256 proof. Protected public-JWK configuration accepts only `https://family-projection.synthetic.invalid` and audience `family-projection-synthetic`; these are explicit fixtures, not claimed real provider facts. No remote JWKS/discovery or production signing key is used.
2. Validate exact alg/kid/typ, canonical JSON/base64url, signature, iss/aud/sub, signed application_family_id, iat/nbf/exp and maximum 60-second token lifetime. Reject extra claims, role/principal/channel assertions and unknown mappings. JWT can be reused during its short identity lifetime; each database ticket is independently single-use.
3. Separate real binder LOGIN calls existing 0023 `auth.issue_application_family_context_ticket`. It atomically resolves the active external identity, active FAMILY principal, verified PHOENIX_FAMILY_OS/FAMILY mapping and active actor membership. Unknown facts do not auto-provision.
4. Separate read LOGIN redeems the one-use ticket and validates request nonce. It may SET ROLE only to existing phoenix_canonical_reader, not app/binder; no principal-based ticket issuance or business DML is available. Verify actor/family/principal/channel on that same backend; select exact fields in a read-only business transaction.
5. On every request end: rollback if necessary, reset role, clear context, verify NULL family/principal, DISCARD ALL. Cleanup failure rejects the response and destroys the connection. Connection-loss events cannot terminate Node; active query/cleanup failures remain unavailable. Ticket/backend-start protections remain the existing database mechanisms.

Binder can use only the family resolver, not arbitrary principal ticket issuance; it has no table access or role memberships. The app LOGIN is NOINHERIT and belongs only to canonical_reader, with narrowly provisioned redeem/clear/nonce functions. These runtime grants are demonstrated only in disposable test clusters; the application never creates roles or changes a grant. A formal runtime provisioning/credential reference is still HOLD.

## Browser, errors and audit limits

The harness installs a short-lived synthetic JWT in an HttpOnly, SameSite=Strict preview cookie in a fresh local browser. No login/signing endpoint was added; browser JavaScript sees no JWT, app/binder password or signing key. BFF forwards only the bearer identity and no-store directive, with no cookies, client family/role headers or query assertions. It refuses redirects, extra/wrongly typed/duplicate DTO fields, oversized response streams, invalid origins and unknown paths. No CORS release, localStorage persistence or demo fallback.

Disabled 404; invalid method 405; unexpected query 400; invalid signature/time/claims 401; unknown/disabled/unmatched identity or mapping 403; unauthorized/unknown individual student 404; connection/cleanup/contract failure 503. Errors omit database messages and existence details. Responses private/no-store. A server-generated request UUID becomes the context nonce and X-Request-ID; client-supplied identity headers cannot select a principal/family/channel.

Application authorization outcome logs contain only requestId/operation/decision. They do **not** constitute tamper-proof persistent database read-decision audit. No new controlled authorize_family/authorize_student audit function exists in 0035, and ordinary read LOGINs cannot fabricate audit rows. A reviewed forward proposal for that formal audit capability, secure retention and actual trusted identities is required before any real activation. Revocation tests establish denial on the next request; this candidate does not claim linearizable cancellation of a response already being read under a database snapshot.

## Protected configuration references only

Backend default-off `CANONICAL_FAMILY_PROJECTION_ENABLED`; three distinct absolute protected files: `CANONICAL_FAMILY_APP_CONFIG_FILE`, `CANONICAL_FAMILY_BINDER_CONFIG_FILE`, `CANONICAL_FAMILY_IDENTITY_CONFIG_FILE`. The first two contain separate loopback phoenix_canonical_dev connection configurations; account/password reuse is refused. The third contains only synthetic issuer/audience/public JWK. Unix mode and Windows ACL checks apply. Private signing material remains in test memory. The website needs only its development flag and local `CANONICAL_FAMILY_API_ORIGIN`.

Rollback: disable the flags and stop the development processes. No business/schema rollback, migration, legacy-store repointing or public identity transition is needed. Real issuer/JWKS/staff/customer identity, final IDs, production provisioning/audit, Tencent, formal writes, real data and deployment remain HOLD.
