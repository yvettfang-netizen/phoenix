# Canonical database source snapshot

- Source repository: `yvettfang-netizen/phoenix-canonical-db`
- Source branch: `codex/canonical-postgresql-phase1`
- Source commit: `48bb6c3ae18906f870ea9e8a717c03ebb2da34bd`
- Source path: `canonical-db/`
- Target repository: `yvettfang-netizen/phoenix`
- Target visibility: `PUBLIC`
- Target path: `database/canonical/`
- Tracked files copied: `668`
- Copy date: `2026-10-30` (Asia/Shanghai)
- Public-copy authorization: Founder explicitly requested copying the private
  Canonical path into `yvettfang-netizen/phoenix` on 2026-10-30.

The copy includes only Git-tracked files. It excludes ignored runtime state,
local secrets, root `.env`, `.local-roles.env`, `runtime/` and
`backups/`.

The original private branch remains retained as provenance. Future changes must
not be edited independently in both locations. After this main-repository branch
is reviewed and merged, `database/canonical/` becomes the only writable source
for new Canonical migrations.

Before public synchronization, the target copy was scanned for private-key
blocks, common provider tokens and access-key signatures; no matching secret was
found. The preserved historical evidence does include operational host
references and protected-file path names. It contains no copied runtime secret,
password file or private key.
