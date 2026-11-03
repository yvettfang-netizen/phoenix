#!/usr/bin/env bash
# Only the fresh disposable cluster started by v0036/smoke.ps1.
set -euo pipefail
umask 077
printf '127.0.0.1:5432:*:phoenix_bootstrap:%s\n' "$POSTGRES_PASSWORD" >/tmp/canonical-premerge.pgpass
chmod 600 /tmp/canonical-premerge.pgpass
export PGPASSFILE=/tmp/canonical-premerge.pgpass
q() { psql -X -qAt -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -v ON_ERROR_STOP=1 "$@"; }
# The digest detects corruption; an unsigned manifest cannot authenticate origin.
test "$(sha256sum /backup/source.dump | cut -d' ' -f1)" = "$(cat /backup/source.sha256)" || { echo RESTORE_MANIFEST_DIGEST_MISMATCH; exit 1; }
test "$(q -c "SELECT to_regclass('canonical_migrations.applied') IS NULL")" = t
q <<'SQL'
CREATE ROLE phoenix_canonical_migrator NOLOGIN NOINHERIT;
CREATE ROLE phoenix_canonical_app NOLOGIN NOINHERIT;
CREATE ROLE phoenix_canonical_reader NOLOGIN NOINHERIT;
CREATE ROLE phoenix_canonical_context_binder NOLOGIN NOINHERIT;
CREATE ROLE phoenix_canonical_backup_runtime NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
SQL
pg_restore -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev --no-owner --exit-on-error /backup/source.dump
test "$(q -c "SELECT count(*) FROM canonical_migrations.applied")" = 36
test "$(q -c "SELECT count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')")" = 93
test "$(q -c "SELECT count(*) FROM pg_policies WHERE schemaname IN ('core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service')")" = 83
test "$(q -c 'SELECT count(*)>0 FROM crm.lead_events WHERE need_domain IS NOT NULL')" = t
echo 'PASS 0036 manifest-verified fresh cluster restore ledger=36 tables=93 policies=83; typed history retained'
# Recreates LOGINs using fresh synthetic passwords and exercises the restored API
# with a distinct fixture. Never exports/reuses the source passwords or globals.
CANONICAL_FIXTURE_BASE=46000 bash /opt/verification/v0036/acceptance.sh
echo 'PASS 0036 restored API regression using fresh separate LOGIN credentials'
