# P0 published-course catalog — development contract

Task: PHOENIX-V7-CANONICAL-P0-CATALOG-20261104. Jimson authorized this implementation on 2026-11-04. **Local synthetic implementation PASS; production and real-identity activation HOLD.**

Baseline: main `9355d28667ee9cf4761b4abcdaf959f0ad154820`, Canonical 0001–0035. Planning source: [PR42](https://github.com/yvettfang-netizen/phoenix/pull/42), `c9a5fcd47cce753ba2517c0c294ef65e2a122745`. No historical migration change, new SQL migration, second authority or master-data write.

## Implemented path

Education page Academy section → same-origin `GET /api/learning/catalog` → existing Node backend `GET /v1/learning/catalog` → dedicated minimal LOGIN → existing `learning.list_published_courses()` → validated projection.

The page/route is disabled by default and unavailable in production. This is an authenticated **local synthetic preview**, with a generated opaque HttpOnly preview cookie, not an implementation of real customer login, OIDC, family binding or public anonymous release. No preview login endpoint was added. The test harness provisions the cookie in an isolated browser context; no real user is registered. The separate server-to-server capability and database password stay server-side.

Response:

```json
{"schemaVersion":"learning-catalog.v1","items":[{"courseRef":"UUIDv7 course locator","versionRef":"UUIDv7 version locator","courseCode":"code","title":"title","versionNo":1}]}
```

References are opaque locators and do not confer authority or introduce a public-ID prefix decision. At most 200 items, deterministic code/version ordering. SQL excludes draft/archived courses, retired versions and future/expired effective windows. Empty results remain empty. No teacher/student/price, personally identifiable data, questionnaire, booking, entitlement, lesson-hour balance or Finance fields are returned. React renders titles as text.

## Access and failure behavior

| Boundary | Enforced rule |
|---|---|
| Browser | Local origin, one matching synthetic HttpOnly cookie, no query assertions; cross-origin/cross-site requests refused |
| BFF | Development-only flag, loopback HTTP backend, distinct preview/service capabilities, timeout, no redirect following, strict DTO whitelist; no cookies/customer headers forwarded upstream |
| Node | Default-off, loopback development/test only, exact GET path/no query fields, constant-time capability verification, rate limit; does not call old Store/auth |
| Database | Separate NOINHERIT LOGIN; no memberships, superuser/DDL/BYPASSRLS/table privileges; only learning schema usage and exact list function EXECUTE |
| Pool | Read-only transaction, bounded statement/connection time, DISCARD ALL before reuse; discard connection on error |
| Errors | Missing preview/service capability denied; disabled route 404, unsupported method 405, invalid query 400, unavailable/invalid upstream 503; no raw database/credential errors |
| Caching | Private/no-store responses, no persisted client cache; redirects and extra response fields refused |

This catalog contains no family-sensitive data, so it creates no principal/family session context or binder ticket. Existing app/binder and personal-projection boundaries are unchanged. Sensitive learning cards and Family/Student projections still require real mapping, consent, guardian/teacher authorization and separate E2E.

## Configuration without values

Node: `CANONICAL_LEARNING_CATALOG_ENABLED=true` only in development/test; `CANONICAL_CATALOG_CONFIG_FILE` is an absolute protected JSON-file reference with exactly host/port/database/user/password/serviceToken. Only local `phoenix_canonical_dev` is accepted. Unix rejects group/other access; Windows checks the ACL permits only the current user, SYSTEM or Administrators. Runtime never creates/grants a database role.

Website development bindings: the same flag, `CANONICAL_CATALOG_API_ORIGIN`, `CANONICAL_CATALOG_SERVICE_TOKEN`, and a **different** `CANONICAL_CATALOG_PREVIEW_TOKEN`. They have no NEXT_PUBLIC names. `.dev.vars` is ignored by Git. Real references/values have not been obtained or enabled; do not populate with production credentials. Test files are generated under protected temporary storage, never passed as command-line passwords.

Rollback: remove/disable the feature flags and restart the development processes. No schema/data rollback is needed. Do not point the legacy DATABASE_URL or run its migrations against Canonical.
