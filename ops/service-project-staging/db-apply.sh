#!/usr/bin/env bash
set -Eeuo pipefail

readonly DB_STAGING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-staging-common.sh
source "$DB_STAGING_SCRIPT_DIR/db-staging-common.sh"

db_staging_parse_args "$@"
[[ "$DB_STAGING_CONFIRM" == 'yes' ]] || db_staging_die 'db-apply.sh requires --confirm-staging'
db_staging_validate_inputs
db_staging_check_database
db_staging_psql_args

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/phoenix-service-project-staging.XXXXXX")"
cleanup() { rm -rf -- "$work_dir"; }
trap cleanup EXIT

sql_literal() {
  local value="$1"
  printf "'%s'" "$value"
}

strip_transaction_wrappers() {
  local source="$1" target="$2"
  sed '1{/^[[:space:]]*BEGIN;[[:space:]]*$/d;}; ${/^[[:space:]]*COMMIT;[[:space:]]*$/d;}' "$source" > "$target"
}

db_staging_print_plan
printf 'Applying each file in its own transaction with the canonical migration ledger.\n'

for index in "${!DB_STAGING_PATHS[@]}"; do
  name="${DB_STAGING_NAMES[$index]}"
  source_sql="${DB_STAGING_PATHS[$index]}"
  digest="${DB_STAGING_HASHES[$index]}"
  body="$work_dir/$name.body.sql"
  atomic="$work_dir/$name.atomic.sql"
  strip_transaction_wrappers "$source_sql" "$body"
  {
    printf 'BEGIN;\n'
    printf 'SELECT pg_advisory_xact_lock(2202,1);\n'
    cat "$body"
    printf 'INSERT INTO canonical_migrations.applied(migration_name,sha256) VALUES (%s,%s);\n' "$(sql_literal "$name")" "$(sql_literal "$digest")"
    printf 'COMMIT;\n'
  } > "$atomic"
  psql "${DB_STAGING_PSQL_ARGS[@]}" --file "$atomic" || db_staging_die "transaction failed for $name. The database is now partial and must be restored to a fresh empty staging database before retry."
  printf 'APPLIED %s %s\n' "$name" "$digest"
done

expected_count="${#DB_STAGING_NAMES[@]}"
actual_count="$(db_staging_query "SELECT count(*) FROM canonical_migrations.applied;")"
[[ "$actual_count" == "$expected_count" ]] || db_staging_die "ledger count mismatch after apply: expected $expected_count got $actual_count"

for index in "${!DB_STAGING_NAMES[@]}"; do
  name="${DB_STAGING_NAMES[$index]}"
  expected_hash="${DB_STAGING_HASHES[$index]}"
  actual_hash="$(db_staging_query "SELECT sha256 FROM canonical_migrations.applied WHERE migration_name=$(sql_literal "$name");")"
  [[ "$actual_hash" == "$expected_hash" ]] || db_staging_die "ledger hash mismatch after apply: $name"
done

unknown_count="$(db_staging_query "SELECT count(*) FROM canonical_migrations.applied WHERE migration_name !~ '^[0-9]{4}_[A-Za-z0-9._-]+\.sql$';")"
[[ "$unknown_count" == '0' ]] || db_staging_die 'unknown migration ledger rows detected after apply'
role_count="$(db_staging_query "SELECT count(*) FROM pg_roles WHERE rolname IN ('phoenix_canonical_migrator','phoenix_canonical_app','phoenix_canonical_reader','phoenix_canonical_context_binder','phoenix_canonical_service_workbench') AND rolcanlogin IS FALSE AND rolbypassrls IS FALSE;")"
[[ "$role_count" == '5' ]] || db_staging_die 'canonical non-login role boundary is incomplete after apply'
printf 'PASS staging database applied 0001-0035, 0036, 0037, 0038, 0039, and supplied 0040.\n'
printf 'STAGING ONLY. Production, DNS, deployment, and real-data access were not invoked.\n'
