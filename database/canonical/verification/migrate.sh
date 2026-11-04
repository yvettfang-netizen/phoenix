#!/usr/bin/env bash
set -euo pipefail
umask 077

# Disposable-container only. POSTGRES_PASSWORD is inherited from the container's
# synthetic --env-file; it is never supplied as a command argument.
printf '127.0.0.1:5432:*:phoenix_bootstrap:%s\n' "$POSTGRES_PASSWORD" > /tmp/canonical-premerge.pgpass
chmod 600 /tmp/canonical-premerge.pgpass
export PGPASSFILE=/tmp/canonical-premerge.pgpass

query() {
  psql -X -q -At -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev -v ON_ERROR_STOP=1 "$@"
}

expected="${CANONICAL_EXPECTED_MIGRATIONS:-35}"
[[ "$expected" =~ ^[1-9][0-9]*$ ]] || { echo 'FAIL invalid expected count'; exit 1; }
shopt -s nullglob
files=(/opt/canonical-migrations/[0-9][0-9][0-9][0-9]_*.sql)
all=(/opt/canonical-migrations/*.sql)
[ "${#files[@]}" -eq "$expected" ] && [ "${#all[@]}" -eq "$expected" ] || {
  echo "FAIL migration inventory expected=$expected numbered=${#files[@]} directory=${#all[@]}"; exit 1;
}

for file in "${files[@]}"; do
  name="$(basename "$file")"
  digest="$(sha256sum "$file" | cut -d' ' -f1)"
  if [ "$(query -c "SELECT to_regclass('canonical_migrations.applied') IS NOT NULL")" = t ]; then
    existing="$(query -c "SELECT sha256 FROM canonical_migrations.applied WHERE migration_name='$name'")"
    if [ -n "$existing" ]; then
      [ "$existing" = "$digest" ] || { echo "DRIFT_REFUSED $name"; exit 1; }
      echo "SKIP $name checksum verified"
      continue
    fi
  fi
  sed '1{/^[[:space:]]*BEGIN;[[:space:]]*$/d;}; ${/^[[:space:]]*COMMIT;[[:space:]]*$/d;}' "$file" > /tmp/canonical-body.sql
  {
    echo 'BEGIN;'
    echo 'SELECT pg_advisory_xact_lock(2202,1);'
    cat /tmp/canonical-body.sql
    echo "INSERT INTO canonical_migrations.applied(migration_name,sha256) VALUES ('$name','$digest');"
    echo 'COMMIT;'
  } > /tmp/canonical-atomic.sql
  query -f /tmp/canonical-atomic.sql > /tmp/canonical-migration-output.txt || {
    cat /tmp/canonical-migration-output.txt; exit 1;
  }
  echo "APPLIED $name $digest"
done

count="$(query -c 'SELECT count(*) FROM canonical_migrations.applied')"
[ "$count" -eq "$expected" ] || { echo "FAIL ledger=$count expected=$expected"; exit 1; }
echo "PASS ledger=$count files=${#files[@]} expected=$expected"
query -c "SELECT 'tables='||count(*) FROM pg_tables WHERE schemaname IN ('auth','core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service'); SELECT 'policies='||count(*) FROM pg_policies WHERE schemaname IN ('core','consent','audit','integration','docs','casework','education','identity','operations_ref','learning','crm','service');"
