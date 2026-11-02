# ASKWISE Independent David Pilot DB Setup

Date: 2026-11-01. Real David account remains unprovisioned.

## Storage boundary

Existing development DB is not copied or altered by initialization. Default Pilot DB is `askwise-learning-engine/data/pilot/askwise-pilot.db`; default private credential/session file is `data/pilot/auth.json`. Environment variables ASKWISE_DB_PATH and ASKWISE_AUTH_PATH may select absolute server-private locations. Do not place either in public/, a web-served directory or a synchronized client folder. Tests select temporary paths, not the Pilot or legacy development DB.

Credential storage maps account -> existing ASKWISE student_id and stores password hashes/session token hashes. It is not a second student master or a Phoenix Core database. There is no signup endpoint. Only offline operator provisioning creates pseudonymous rows using the existing students/experiments tables. No sample history is seeded.

## Operator commands

Run from the existing askwise-learning-engine directory. Set explicit private absolute paths before using the offline script:

```powershell
$env:ASKWISE_DB_PATH = 'D:\CODEX\PhoenixNova\askwise\askwise-learning-engine\data\pilot\askwise-pilot.db'
$env:ASKWISE_AUTH_PATH = 'D:\CODEX\PhoenixNova\askwise\askwise-learning-engine\data\pilot\auth.json'
node scripts/pilot-admin.cjs init
```

For anonymous UAT only, set ASKWISE_BOOTSTRAP_PASSWORD through a private operator session, then run `node scripts/pilot-admin.cjs provision anon_a`. Never place the password in source, reports, shell history or Git. Clear the variable afterwards. The command prints only the assigned internal student ID. Real-account activation is a separate gate.

Start local-only Web with the same data paths. For HTTP loopback UAT only set ASKWISE_COOKIE_SECURE=false. On a deployed service use HTTPS and leave secure cookies enabled (default).

```powershell
pnpm.cmd run dev --hostname 127.0.0.1 --port 3012
```

Login: /login. Logout/delete: /account. Export: /account/export (current student only). No caller-supplied student_id is accepted for selecting a principal. All sensitive pages are dynamic; data export is no-store. Existing advisor case access is disabled in the student pilot.

## Operating requirements

Single server process and local persistent volume only; JSON auth storage is not a multi-server session system. Restrict directory ACLs to the service operator and approved backup operator. File mode settings are best-effort on Windows and do not replace an ACL review. Remote hosting, HTTPS, filesystem ACLs, consent and the backup retention/deletion process must be verified before real David activation.

Learning answers are persisted in the existing SQLite tables. The task route no longer writes a second unscoped JSON answer log. Historical logs are not imported. Deletion removes active rows and revokes credentials/sessions; it is not forensic erasure of WAL/free pages or independently retained backups. Keep the service offline during restore, re-provision auth rather than restoring old sessions, and apply the approved deletion list before reopening restored data.

See companion acceptance reports for actual execution status. A database file's presence is not a readiness result.
