# ASKWISE SQLite Backup / Restore Test

Date: 2026-11-01.

Implemented operator-only `backupPilotDatabase(destination)` uses better-sqlite3 online backup, including committed WAL data. It refuses an existing destination. `restorePilotBackup(source,destination)` opens source read-only, checks integrity, foreign keys and required business tables, and restores only into a new destination. No live overwrite, migration or auth-session restore is performed.

Actual automated acceptance: PASS. Anonymous live SQLite was populated with tasks, attempts, diagnoses, hints, evidence, maps and reflections; online backup was restored to another temporary file. Every table's rows and sqlite_master schema definitions were compared against the live database. Integrity was `ok`; foreign_key_check returned no violations. Repeating backup/restore into an existing target was rejected. See final full-suite count in ASKWISE_DAVID_PILOT_READINESS.md.

```powershell
# Set the private ASKWISE_DB_PATH and ASKWISE_AUTH_PATH first.
node scripts/pilot-admin.cjs backup D:\private-backups\askwise-snapshot.db
# Stop the service; select a NEW ASKWISE_DB_PATH before restoring.
node scripts/pilot-admin.cjs restore D:\private-backups\askwise-snapshot.db
```

The sample backup directory is illustrative, not a directory created on this machine. Do not copy only askwise.db while WAL is active. Use the backup API, not a raw main-file copy.

Scope limitation: this acceptance verifies the SQLite learning database, not full-host disaster recovery. Uploaded photos, receipt files and an approved external-ID mapping need their own controlled backup procedure. Auth credentials/sessions are deliberately not restored; provision access again. A restore of an old backup may contain subsequently deleted rows; apply the authorized deletion list before reopening. Backup retention, Windows ACLs, encryption at rest and recovery on a second host remain NOT VERIFIED. No real student backup was created or committed.
