# Legacy Database Physical Retirement Runbook

**Founder authorization:** 2026-11-20 — legacy database contents contain no valid business information; do not migrate or import them.  
**Scope:** old Education standalone PostgreSQL, old Family OS SQLite, old ASKWISE SQLite, old Phoenix V5 D1 and their legacy database backups.  
**Canonical protection:** the Canonical PostgreSQL databases and migrations 0001–0037 must remain untouched.

## 1. What is already completed in GitHub

- PR #68 merged as `02ffcdcf2c80d3d63ef737b2b9ff176bd5c3d5ab`.
- Removed old Education standalone PostgreSQL migrations and PostgresStore.
- Removed Family OS SQLite storage/migrations.
- Removed ASKWISE pilot SQLite engine.
- Removed Phoenix V5 D1 account/schema/migration implementation and D1 binding from the Worker.
- Removed D1 example database code from Phoenix East and Phoenix Digital World.
- Canonical migrations 0001–0037 remain in place.
- A follow-up PR removes old Education UAT/PM2 launch, worker, deployment, payment-secret and systemd runtime files.

This is repository/code retirement only. It does not itself stop remote processes or delete cloud database resources.

## 2. Known legacy identifiers from the retired source

| Resource | Source-backed identifier | Physical location / caveat |
|---|---|---|
| Education legacy PostgreSQL | Old backup script listed databases `compass` and `phoenix_uat` | Verify old service `.env` and `.env.uat` database names before dropping |
| Education runtime | `education-compass.service`, `education-compass-agent-worker.service`; PM2 names `phoenix_uat_api`, `phoenix_uat_agent_worker` | Old worktree: `/home/ubuntu/education-compass` |
| Family OS SQLite | `phoenix-family-os.sqlite` | Old default path: `Phoenix Family OS/phoenix-family-os-mvp/backend/data/phoenix-family-os.sqlite`; check any configured `PFS_DATABASE_PATH` |
| ASKWISE SQLite | `askwise.db` | Old default path: `askwise/askwise-learning-engine/data/askwise.db` (runtime path was `process.cwd()/data/askwise.db`) |
| Phoenix V5 D1 | Worker binding name `DB`; old Sites project reference `appgprj_6a984094b9ec819199c957f0f7a34889` | This project reference is **not** a D1 database ID. Identify the actual D1 database name/ID in the Cloudflare account before deletion |
| Phoenix East / Digital World D1 | Old `.openai/hosting.json` values were `d1: null` | Repository did not identify an active D1 binding for these sites |
| Legacy PostgreSQL dumps | `compass-*.dump`, `phoenix_uat-*.dump` | Old local directory `/home/ubuntu/backups/db`; remote COS path was `cos:$BUCKET/db` using `~/.config/phoenix-cos-bucket` |

Do not infer a remote database ID from a project ID. Do not delete any database whose identity is uncertain.

## 3. Execution sequence on the legacy Education host

### A. Capture sanitized inventory only

Do not copy or export table contents. Record only service state, database name, host, port, owner, size and whether connections exist. Never print passwords, tokens or full connection URLs.

Check old services:

```bash
sudo systemctl is-active education-compass.service education-compass-agent-worker.service || true
sudo systemctl is-enabled education-compass.service education-compass-agent-worker.service || true
pm2 jlist 2>/dev/null | node -e '
let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
  try { for (const p of JSON.parse(s)) if (["phoenix_uat_api","phoenix_uat_agent_worker"].includes(p.name)) console.log(p.name+" status="+p.pm2_env.status); }
  catch { process.exitCode=1; }
})'
```

Read only the `host`, `port` and database name from the old `.env` and `.env.uat` DATABASE_URL values using a local parser. Do not echo credentials. Compare those database names with the current Canonical service configuration.

List database metadata:

```bash
sudo -u postgres psql -X -c "SELECT datname, pg_get_userbyid(datdba), pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE NOT datistemplate ORDER BY datname;"
```

**STOP condition:** if the old Education URLs do not resolve exactly to `compass` and/or `phoenix_uat`, if either name is used by a Canonical service, or if Canonical database identity is ambiguous, do not drop anything. Return the sanitized inventory for direct resolution.

### A.1 Public API uptime-monitor continuity — MANDATORY before stopping legacy services

The retired `health-check.sh` was checking both Education UAT/production services **and the live public endpoint** `https://api.phoenixnova.com.cn/health`. Removing its cron before a replacement is running would silently disable the public API outage alert.

1. Confirm which API paths and consumers still depend on the Education service. If live clients still depend on it and an approved Canonical service replacement is not active, **STOP**: do not disable the service or DROP its database merely because historical rows are not valuable. Founder has authorized data retirement, not an unreviewed public-service outage.
2. Deploy the replacement monitor from reviewed repository path `ops/monitoring/public-api-health-check.sh` onto the host as `/home/ubuntu/public-api-health-check.sh` with mode 0755; use the accepted exact SHA, not an arbitrary local copy.
3. In the existing Feishu environment, test the replacement endpoint/notification and verify the 2-minute cron is present. A sample cron line is shown below:

```bash
install -m 0755 ops/monitoring/public-api-health-check.sh /home/ubuntu/public-api-health-check.sh
curl -fsS --max-time 10 https://api.phoenixnova.com.cn/health >/dev/null
( crontab -l 2>/dev/null | grep -vF '/home/ubuntu/health-check.sh' | grep -vF '/home/ubuntu/public-api-health-check.sh'
  echo '*/2 * * * * /home/ubuntu/public-api-health-check.sh >/dev/null 2>&1' ) | crontab -
crontab -l | grep -F '/home/ubuntu/public-api-health-check.sh'
```

The `install` command assumes the current directory is the reviewed repository checkout. If this path is unavailable, stop; do not create an unverified substitute. The notifier's actual receipt and a controlled alert/recovery drill must be recorded without leaking webhook secrets. The new monitor must remain in place after the old Education health-check cron is removed.

4. Keep the generic daily host check for certificate/disk as a separate cron. Canonical PostgreSQL backup/restore monitoring belongs to its own independent operations service.

**STOP condition:** live public API still depends on a to-be-stopped service and no accepted replacement exists; public health monitor is missing, has no alert delivery or no verified scheduled execution. No service stop, database DROP or credential revocation until these checks pass.

### B. Stop the retired Education runtime

Once the old service-to-database mapping is confirmed:

```bash
sudo systemctl disable --now education-compass.service education-compass-agent-worker.service 2>/dev/null || true
pm2 delete phoenix_uat_api phoenix_uat_agent_worker 2>/dev/null || true
pm2 save 2>/dev/null || true
sudo systemctl daemon-reload

# Remove only the retired Education high-frequency health-check cron; preserve other cron entries.
( crontab -l 2>/dev/null | grep -vF '/home/ubuntu/health-check.sh' ) | crontab -
crontab -l
```

Verify both systemd units are inactive/disabled, both PM2 process names are absent, and no retired health-check cron remains. Verify the new public-api-health-check cron remains installed and delivers alerts. Remove only the two retired unit files from `/etc/systemd/system` if they remain there, then run `sudo systemctl daemon-reload` again.

### C. Drop only the confirmed legacy databases

Founder has authorized no data migration. After step A proves the exact legacy database names and confirms they are not Canonical, drop only those confirmed legacy databases:

```bash
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "compass" WITH (FORCE);'
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "phoenix_uat" WITH (FORCE);'
```

Run only the line(s) for database(s) that were present and verified as legacy. Do not run either command against the Canonical database. No dump/import or schema migration is required.

### D. Remove legacy backup copies

After the database drop is verified, list the exact old dump files, then delete only the Education legacy dumps:

```bash
find /home/ubuntu/backups/db -maxdepth 1 -type f -name 'compass-*.dump' -print
find /home/ubuntu/backups/db -maxdepth 1 -type f -name 'phoenix_uat-*.dump' -print
```

After checking the printed list:

```bash
find /home/ubuntu/backups/db -maxdepth 1 -type f -name 'compass-*.dump' -delete
find /home/ubuntu/backups/db -maxdepth 1 -type f -name 'phoenix_uat-*.dump' -delete
```

If the old COS bucket configuration exists, list `cos:$BUCKET/db` and delete only object names beginning `compass-` or `phoenix_uat-` and ending `.dump`. Do not delete the bucket or unrelated objects. If the bucket cannot be identified with certainty, leave it untouched and report UNVERIFIED.

### E. Remove local legacy SQLite files

Search only the old application worktrees and explicitly configured data paths; do not run a broad filesystem-wide deletion:

```bash
find /home/ubuntu/phoenix /home/ubuntu/education-compass -type f -name 'phoenix-family-os.sqlite' -print 2>/dev/null
find /home/ubuntu/phoenix /home/ubuntu/education-compass -type f -name 'askwise.db' -print 2>/dev/null
```

For each exact file confirmed to belong to the retired applications, remove the database and its SQLite sidecars (`-wal`, `-shm`). Do not remove unrelated `.db` or `.sqlite` files.

If the old Education worktree has uncommitted files, stop and report them before deleting the worktree. Do not print or copy secrets from `.env`; after old service shutdown, revoke/rotate legacy DB credentials and any obsolete provider credentials through their secure owner channels.

## 4. Cloudflare D1 cleanup

The old Phoenix V5 Worker used a D1 binding named `DB`; the repository does not contain the actual Cloudflare D1 database ID. The value in `.openai/hosting.json` is a Sites project reference, not the D1 ID.

In the Cloudflare account:
1. Identify the D1 database bound to the retired Phoenix Nova V5 Worker/Pages project.
2. Verify no active Worker, Pages project or other application still references it.
3. Confirm the D1 database has no valid data to retain (Founder has waived migration).
4. Delete that exact D1 database resource.
5. Verify the database no longer appears and the retired Worker has no D1 binding.

Do not delete any D1 resource based only on a matching name or the Sites project ID. If Cloudflare access is unavailable, return the exact D1 name/ID and leave it UNVERIFIED; do not ask Codex to repeat repository analysis.

## 5. Final evidence required

Return a short sanitized execution receipt with:
- host/environment and timestamp (UTC);
- systemd and PM2 retired service states;
- public API consumer/cutover check, replacement monitor deployment, 2-minute cron and actual alert/recovery receipt;
- old PostgreSQL database names confirmed and dropped (or absent);
- confirmation Canonical database name and connection remained untouched;
- local SQLite exact paths found and removed (or absent);
- old local/COS dump object names removed (or absent);
- Cloudflare D1 name/ID removed and no remaining binding (or UNVERIFIED);
- confirmation no data migration/import was performed;
- sanitized command output only; no credentials, connection URLs, customer data or table contents.

## 6. Completion definition

The old stores are physically retired only when:
- their runtime processes are stopped/disabled;
- the verified legacy PostgreSQL databases are dropped;
- the verified Family/ASKWISE SQLite files and sidecars are removed;
- the retired V5 D1 resource is deleted or conclusively shown not to exist;
- old database backup copies are removed;
- Canonical PostgreSQL remains intact and is the sole database authority.

Until the physical receipt is returned, report **CODE RETIREMENT COMPLETE / PHYSICAL CLEANUP PENDING**. Do not claim all old databases have been physically deleted.
