# Jimson exception ticket — named nonproduction runtime only

**Status: UNVERIFIED / NOT RUN.** This ticket is limited to a private environment receipt that the assistant cannot derive from repository source or local disposable PG16/17. It is not a request for another architecture review or for repeated source/automated testing.

| Field | Requirement |
| --- | --- |
| Target | The **specifically designated** `canonical-nonprod` Canonical PostgreSQL instance and database, after Jimson verifies the service binding. The documented `phoenix_nonprod` libpq alias is a placeholder until configured. No production or legacy DB. |
| Why manual | This review has no approved connection profile, runtime inventory or nonproduction database credential. Source and isolated PG tests cannot establish the installed ledger of that named instance. |
| Actor | Jimson using an approved, separate, read-only LOGIN with no SUPERUSER/BYPASSRLS/CREATEROLE/CREATEDB. |
| Command | `psql 'service=phoenix_nonprod' -X -v ON_ERROR_STOP=1 -f docs/architecture/academic-studio-v21-p0-20261120/p01-evidence/nonprod-readonly-preflight.sql` after confirming the alias points to the named nonproduction target. Use a protected local service/pgpass file; no password on the command line. |
| Evidence | UTC observation time, environment/service binding reference, command exit code and sanitized raw stdout/stderr, login role attributes, effective SELECT/INSERT/UPDATE/DELETE and EXECUTE privileges on the listed Auth/Learning objects, server version, migration ledger names+hashes, RLS/FORCE status. Attach any already-existing nonproduction backup-restore receipt if available; do not run a restore on a shared instance for this ticket. |
| Expected | Only authorized nonproduction target; role flags false; ledger aligns with the approved deployed baseline; Learning RLS/FORCE and role inventory match. A result below 0037 is a factual runtime difference, not permission to install 0037. |
| Stop | If alias/target is ambiguous, production or legacy is selected, role has elevated flags, credentials are unavailable, or the ledger differs unexpectedly: stop, keep UNVERIFIED/HOLD, and report the exact nonsecret mismatch. Do not SET ROLE to bypass a failure. |
| Rollback | None: the SQL is `BEGIN READ ONLY` and contains no DDL or DML. |
| Return location | Add a sanitized receipt under `p01-evidence/nonprod-manual/` on a private review branch. Never include usernames that identify customers, passwords, tokens, `.env`, pgpass, or row-level customer data. |

The local PG16/17 synthetic probe, source hashes, PR status and security review are already Codex-owned and must **not** be delegated to Jimson. Until a receipt exists, named nonproduction installation remains UNVERIFIED.
