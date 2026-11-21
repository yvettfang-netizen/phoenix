# Jimson manual receipt — P0.1-S1 runtime transaction boundary

**Status: UNVERIFIED / NOT RUN.** This is the remaining manual runtime task for the S1 installation decision. It is a read-only evidence request, not permission to install candidate 0045.

## Target and safety

- Target only the specifically designated `canonical-nonprod` Canonical PostgreSQL instance after verifying the configured service alias and service binding.
- `phoenix_nonprod` is only a placeholder until Jimson confirms its exact target.
- Use the approved separate read-only LOGIN. Do not use SUPERUSER, BYPASSRLS, migrator, app LOGIN or `SET ROLE`.
- No production or legacy database, no real learner records, no DDL/DML, no test writes, no installation and no restore drill.
- If target, role or ledger is ambiguous, stop and report the mismatch without attempting repair.

## Command

After confirming the alias points to the named nonproduction instance:

```sh
psql 'service=phoenix_nonprod' -X -v ON_ERROR_STOP=1 \
  -f database/canonical/verification/v0045/s1-runtime-readonly-preflight.sql
```

Use protected local service/pgpass configuration. Never put passwords, tokens or connection secrets in the command line or receipt.

## Return exactly these facts

1. UTC observation time, nonproduction environment identifier and service-binding reference (no host secrets).
2. Command exit code and sanitized raw output.
3. Server version and current/database default transaction isolation.
4. Role-level and database/role-level transaction overrides for Canonical app/reader roles.
5. Whether active app transactions are unexpectedly long-lived; do not include SQL text.
6. Current `learning.can_read_sensitive` function-definition MD5. Expected pre-install baseline: `4b65b734551738529b6cbc3935217bab`. If different, stop and investigate; do not install.
7. Canonical migration ledger names and hashes; candidate 0045 must not appear in the formal ledger.
8. RLS/FORCE status for Family Membership, Guardian Authority, Consent, after-class card, stage report and publication tables.
9. Deployed application commit and sanitized pool/transaction configuration. Confirm whether actual Learning card/report endpoints use a bounded READ COMMITTED request transaction. If those endpoints are not wired in the deployed build, state NOT WIRED rather than infer behavior from another Family Projection endpoint.

## Decision rules

- A read-only SQL receipt can establish database settings and installed schema state. It cannot by itself prove application request transaction lifecycle.
- READ COMMITTED is the required current request boundary for the demonstrated immediate-next-request guarantee.
- If app/database settings force REPEATABLE READ, active transactions are long-lived, app transaction lifecycle cannot be evidenced, or Learning endpoints are not wired, return **HOLD**.
- No `SET ROLE`, no changing database/role settings, no candidate install, no writes.

## Return location

Commit a sanitized receipt under `p01-evidence/nonprod-manual/` on a private review branch and link the exact commit. Do not include customer names, row data, passwords, tokens, service files, pgpass, environment files or secret connection strings.

**This ticket does not authorize merge, installation, feature enablement or deployment.**
