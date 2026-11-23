# Jimson canonical-nonprod read-only receipt — blocked before connection

**Status: BLOCKED / NOT RUN.** Reconciled on 2026-11-23 from the separate V7 A2 verification window. This file records the stop condition for the [PR #85 ticket](../../P0_1_JIMSON_NONPROD_TICKET.md); it is not a database query result or an approval to install a candidate migration.

## Evidence provenance

- [GitHub Issue #97, 2026-11-23 continuation comment](https://github.com/yvettfang-netizen/phoenix/issues/97#issuecomment-7090274376) records the observed time as `2026-11-23T02:49:50Z` (10:49:50 Beijing), the specific missing bindings, and that no database connection or PR #85 preflight ran.
- The [original Jimson Canonical P0 Notion page](https://app.notion.com/p/3fbc31ee15bb815daa8ed9e841ef5b93) contains the linked sanitized V7 A2 receipt and machine-readable JSON. Its evidence is referenced rather than copied into this repository candidate branch.
- PR #92's fixed HEAD `56a8ca761e0ab09270f5acaf0942ad3688d4f310` has 6/6 successful candidate workflows according to the cited Issue receipt. This proves candidate CI only, not the installed state of `canonical-nonprod`.

## PR #85 acceptance fields

| Field | Result | Reason / next evidence |
|---|---|---|
| Named target and service binding | **BLOCKED** | V7 had no confirmed `phoenix_nonprod` service alias or approved target mapping. A historical Tencent reference database is not the designated target. Jimson/database operations must supply the exact nonproduction binding and private DNS reference. |
| Protected connection and TLS | **BLOCKED** | No protected read-only connection profile, certificate DNS/CA binding or confirmed `sslmode=verify-full` target was available. No weaker TLS mode is accepted. |
| Separate read-only LOGIN | **BLOCKED** | The dedicated role and its nonsecret privilege/credential-custody references were not established. Do not substitute owner, bootstrap, migrator or superuser. |
| Actual database and PostgreSQL version | **NOT RUN** | No connection was made. |
| Formal migration ledger and hashes | **NOT RUN** | No query was executed; repository source hashes and CI artifacts are not an installed ledger. |
| Actual role privileges | **NOT RUN** | No query was executed against the named database. |
| Learning RLS / FORCE | **NOT RUN** | No query was executed against the named database. |
| UTC time and sanitized raw output | **HOLD** | The cross-window stop receipt has an observation time and raw local metadata; there is no database stdout/stderr or PR #85 command exit code because the preflight was not invoked. |

## Controlled continuation

Jimson/database operations and the credential custodian first provide a nonsecret reference that binds `phoenix_nonprod` to the approved `canonical-nonprod` instance, private DNS and CA, plus a dedicated read-only LOGIN's privilege and protected credential references. Confirm a suitable `psql` client is available on the approved workstation. Only after those facts are verified should the fixed [read-only preflight SQL](../nonprod-readonly-preflight.sql) run with `sslmode=verify-full`; save the command exit status, UTC time and sanitized raw output. If any binding, TLS or role check fails, stop again and preserve this HOLD.

No 0042, 0044, A2 or other forward candidate was installed by this reconciliation. No production/shared database, real customer data, restore operation, SQL merge or deployment was touched.
