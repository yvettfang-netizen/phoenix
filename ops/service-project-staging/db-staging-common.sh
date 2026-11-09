#!/usr/bin/env bash
set -Eeuo pipefail

# Shared, fail-closed checks for the operator-run Canonical staging package.
# This file is sourced by db-preflight.sh and db-apply.sh. It never creates a
# database, changes DNS, or invokes a deployment command.

readonly DB_STAGING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DB_STAGING_REPO_ROOT="$(cd "$DB_STAGING_SCRIPT_DIR/../.." && pwd)"
readonly DB_STAGING_DEFAULT_MIGRATIONS="$DB_STAGING_REPO_ROOT/database/canonical/migrations"
readonly DB_STAGING_DEFAULT_FORWARD="$DB_STAGING_REPO_ROOT/database/canonical/forward-candidates/service-workbench"
readonly DB_STAGING_DEFAULT_PINS="$DB_STAGING_SCRIPT_DIR/db-migration-pins.sha256"
readonly DB_STAGING_DEFAULT_IDENTITY="$DB_STAGING_DEFAULT_FORWARD/0040_hk_identity_workbench.sql"
readonly DB_STAGING_DATABASE_NAME="phoenix_service_project_staging"
readonly DB_STAGING_0038_SHA256="4b82dc15b86b5936258a3d32a1b91ccbaf756e8ca76cd11a609bb6373c934ecf"
readonly DB_STAGING_0039_SHA256="7679b16297ebcffb301a2aedfc3b9a3f0dd962e23bb571c1a748786d6160fe76"
readonly DB_STAGING_0040_SHA256="fc3fa2c2125e7e94c73b938a34f60ebcc893e2de748757047e05855a3c69b19e"

DB_STAGING_HOST="${PGHOST:-127.0.0.1}"
DB_STAGING_PORT="${PGPORT:-5432}"
DB_STAGING_USER="${PGUSER:-}"
DB_STAGING_DATABASE="${PGDATABASE:-$DB_STAGING_DATABASE_NAME}"
DB_STAGING_MIGRATIONS="$DB_STAGING_DEFAULT_MIGRATIONS"
DB_STAGING_FORWARD="$DB_STAGING_DEFAULT_FORWARD"
DB_STAGING_PINS="$DB_STAGING_DEFAULT_PINS"
DB_STAGING_IDENTITY_SQL="${PHOENIX_STAGING_IDENTITY_SQL:-$DB_STAGING_DEFAULT_IDENTITY}"
DB_STAGING_IDENTITY_SHA256="${PHOENIX_STAGING_IDENTITY_SHA256:-$DB_STAGING_0040_SHA256}"
DB_STAGING_CONFIRM=""

declare -a DB_STAGING_NAMES=()
declare -a DB_STAGING_PATHS=()
declare -a DB_STAGING_HASHES=()

db_staging_usage() {
  cat <<'USAGE'
Usage:
  db-preflight.sh --identity-sql PATH --identity-sha256 SHA256 [options]
  db-apply.sh --confirm-staging --identity-sql PATH --identity-sha256 SHA256 [options]

Options:
  --host HOST             Must be localhost, 127.0.0.1, or ::1.
  --port PORT             PostgreSQL port, default 5432.
  --user ROLE             PostgreSQL operator role, or PGUSER.
  --database NAME         Must be phoenix_service_project_staging.
  --migrations-root PATH  Directory containing exactly 0001 through 0037.
  --forward-root PATH     Directory containing the pinned 0038 and 0039 SQL.
  --pins PATH              SHA-256 pin file for 0001 through 0037.
  --identity-sql PATH     Build-inventory 0040 SQL file.
  --identity-sha256 HASH  Exact SHA-256 for the 0040 SQL file.
  --confirm-staging       Required by db-apply.sh. Explicit staging-only gate.
  --help                  Show this usage text.
USAGE
}

db_staging_die() {
  printf 'BLOCKED: %s\n' "$*" >&2
  exit 1
}

db_staging_parse_args() {
  while (($#)); do
    case "$1" in
      --host) [[ $# -ge 2 ]] || db_staging_die '--host requires a value'; DB_STAGING_HOST="$2"; shift 2 ;;
      --port) [[ $# -ge 2 ]] || db_staging_die '--port requires a value'; DB_STAGING_PORT="$2"; shift 2 ;;
      --user) [[ $# -ge 2 ]] || db_staging_die '--user requires a value'; DB_STAGING_USER="$2"; shift 2 ;;
      --database) [[ $# -ge 2 ]] || db_staging_die '--database requires a value'; DB_STAGING_DATABASE="$2"; shift 2 ;;
      --migrations-root) [[ $# -ge 2 ]] || db_staging_die '--migrations-root requires a value'; DB_STAGING_MIGRATIONS="$2"; shift 2 ;;
      --forward-root) [[ $# -ge 2 ]] || db_staging_die '--forward-root requires a value'; DB_STAGING_FORWARD="$2"; shift 2 ;;
      --pins) [[ $# -ge 2 ]] || db_staging_die '--pins requires a value'; DB_STAGING_PINS="$2"; shift 2 ;;
      --identity-sql) [[ $# -ge 2 ]] || db_staging_die '--identity-sql requires a value'; DB_STAGING_IDENTITY_SQL="$2"; shift 2 ;;
      --identity-sha256) [[ $# -ge 2 ]] || db_staging_die '--identity-sha256 requires a value'; DB_STAGING_IDENTITY_SHA256="$2"; shift 2 ;;
      --confirm-staging) DB_STAGING_CONFIRM='yes'; shift ;;
      --help) db_staging_usage; exit 0 ;;
      *) db_staging_die "unknown option $1" ;;
    esac
  done
}

db_staging_require_tools() {
  local tool
  for tool in awk find grep mktemp psql sha256sum sed sort; do
    command -v "$tool" >/dev/null 2>&1 || db_staging_die "required tool is missing: $tool"
  done
}

db_staging_require_target_basics() {
  [[ "$DB_STAGING_HOST" == 'localhost' || "$DB_STAGING_HOST" == '127.0.0.1' || "$DB_STAGING_HOST" == '::1' ]] ||
    db_staging_die "database host must be localhost, 127.0.0.1, or ::1, got $DB_STAGING_HOST"
  [[ "$DB_STAGING_DATABASE" == "$DB_STAGING_DATABASE_NAME" ]] ||
    db_staging_die "database name must be $DB_STAGING_DATABASE_NAME"
  [[ "$DB_STAGING_PORT" =~ ^[0-9]+$ && "$DB_STAGING_PORT" -ge 1 && "$DB_STAGING_PORT" -le 65535 ]] ||
    db_staging_die "invalid PostgreSQL port"
  [[ -n "$DB_STAGING_USER" ]] || db_staging_die 'operator role is required via --user or PGUSER'
  [[ "${APP_ENV:-staging}" != 'production' && "${NODE_ENV:-staging}" != 'production' && "${PHOENIX_ENV:-staging}" != 'production' ]] ||
    db_staging_die 'production environment variables are refused'
}

db_staging_require_local_target() {
  db_staging_require_target_basics
  [[ -r "$DB_STAGING_MIGRATIONS" && -d "$DB_STAGING_MIGRATIONS" ]] || db_staging_die "migration directory is unreadable"
  [[ -r "$DB_STAGING_FORWARD" && -d "$DB_STAGING_FORWARD" ]] || db_staging_die "forward candidate directory is unreadable"
  [[ -r "$DB_STAGING_PINS" && -f "$DB_STAGING_PINS" ]] || db_staging_die 'migration pin file is unreadable'
  [[ -r "$DB_STAGING_IDENTITY_SQL" && -f "$DB_STAGING_IDENTITY_SQL" ]] || db_staging_die '0040 Identity build-inventory SQL is required'
  [[ "$(basename "$DB_STAGING_IDENTITY_SQL")" =~ ^0040_[A-Za-z0-9._-]+\.sql$ ]] || db_staging_die 'Identity SQL must be named 0040_*.sql'
  [[ "$DB_STAGING_IDENTITY_SHA256" =~ ^[0-9a-fA-F]{64}$ ]] || db_staging_die '0040 SHA-256 must be 64 hexadecimal characters'
  [[ "${DB_STAGING_IDENTITY_SHA256,,}" == "$DB_STAGING_0040_SHA256" ]] || db_staging_die '0040 SHA-256 is not the pinned build-inventory candidate'
}

db_staging_hash() {
  sha256sum -- "$1" | awk '{print tolower($1)}'
}

db_staging_canonical_path() {
  local path="$1"
  printf '%s/%s' "$(cd "$(dirname "$path")" && pwd -P)" "$(basename "$path")"
}

db_staging_check_pins() {
  local line hash name actual expected_name expected_hash
  local -a pin_names=()
  while read -r hash name; do
    [[ -n "${hash:-}" && -n "${name:-}" ]] || continue
    [[ "$hash" =~ ^[0-9a-fA-F]{64}$ ]] || db_staging_die "invalid pin hash for $name"
    pin_names+=("$name")
  done < "$DB_STAGING_PINS"
  ((${#pin_names[@]} == 37)) || db_staging_die "pin file must contain exactly 37 historical migrations"

  local n
  for ((n=1; n<=37; n++)); do
    expected_name="$(printf '%04d_' "$n")"
    mapfile -t matches < <(find "$DB_STAGING_MIGRATIONS" -maxdepth 1 -type f -name "${expected_name}*.sql" -print | sort)
    ((${#matches[@]} == 1)) || db_staging_die "expected exactly one migration matching ${expected_name}*.sql"
    name="$(basename "${matches[0]}")"
    expected_hash="$(awk -v wanted="$name" '$2==wanted {print tolower($1)}' "$DB_STAGING_PINS")"
    [[ -n "$expected_hash" ]] || db_staging_die "missing pin for $name"
    actual="$(db_staging_hash "${matches[0]}")"
    [[ "$actual" == "$expected_hash" ]] || db_staging_die "migration hash drift: $name"
    DB_STAGING_NAMES+=("$name")
    DB_STAGING_PATHS+=("${matches[0]}")
    DB_STAGING_HASHES+=("$actual")
  done

  while IFS= read -r -d '' actual; do
    name="$(basename "$actual")"
    [[ "$name" =~ ^[0-9]{4}_[A-Za-z0-9._-]+\.sql$ ]] || db_staging_die "unknown SQL in migration directory: $name"
    expected_hash="$(awk -v wanted="$name" '$2==wanted {print tolower($1)}' "$DB_STAGING_PINS")"
    [[ -n "$expected_hash" ]] || db_staging_die "migration is not pinned: $name"
  done < <(find "$DB_STAGING_MIGRATIONS" -maxdepth 1 -type f -name '*.sql' -print0)
}

db_staging_check_forward_candidates() {
  local path
  path="$DB_STAGING_FORWARD/0038_service_project_workbench.sql"
  [[ -f "$path" ]] || db_staging_die '0038 candidate is missing'
  [[ "$(db_staging_hash "$path")" == "$DB_STAGING_0038_SHA256" ]] || db_staging_die '0038 candidate hash drift'
  path="$DB_STAGING_FORWARD/0039_service_project_summary.sql"
  [[ -f "$path" ]] || db_staging_die '0039 candidate is missing'
  [[ "$(db_staging_hash "$path")" == "$DB_STAGING_0039_SHA256" ]] || db_staging_die '0039 candidate hash drift'
  local candidate
  local identity_name
  local identity_hash
  local identity_real
  local candidate_real
  local -a identity_candidates=()
  mapfile -t identity_candidates < <(find "$DB_STAGING_FORWARD" -maxdepth 1 -type f -name '0040_*.sql' -print | sort)
  ((${#identity_candidates[@]} == 1)) || db_staging_die 'forward candidate directory must contain exactly one 0040_*.sql Identity candidate'
  identity_real="$(db_staging_canonical_path "$DB_STAGING_IDENTITY_SQL")"
  candidate_real="$(db_staging_canonical_path "${identity_candidates[0]}")"
  [[ "$identity_real" == "$candidate_real" ]] || db_staging_die '0040 Identity SQL is not the sole build-inventory candidate in the forward directory'
  while IFS= read -r -d '' candidate; do
    case "$(basename "$candidate")" in
      0038_service_project_workbench.sql|0039_service_project_summary.sql|0040_*.sql) ;;
      *) db_staging_die "unknown SQL in forward candidate directory: $(basename "$candidate")" ;;
    esac
  done < <(find "$DB_STAGING_FORWARD" -maxdepth 1 -type f -name '*.sql' -print0)
  DB_STAGING_NAMES+=(0038_service_project_workbench.sql 0039_service_project_summary.sql)
  DB_STAGING_PATHS+=("$DB_STAGING_FORWARD/0038_service_project_workbench.sql" "$DB_STAGING_FORWARD/0039_service_project_summary.sql")
  DB_STAGING_HASHES+=("$DB_STAGING_0038_SHA256" "$DB_STAGING_0039_SHA256")
  identity_name="$(basename "$DB_STAGING_IDENTITY_SQL")"
  identity_hash="$(db_staging_hash "$DB_STAGING_IDENTITY_SQL")"
  [[ "$identity_hash" == "${DB_STAGING_IDENTITY_SHA256,,}" ]] || db_staging_die '0040 Identity candidate hash drift'
  DB_STAGING_NAMES+=("$identity_name")
  DB_STAGING_PATHS+=("$DB_STAGING_IDENTITY_SQL")
  DB_STAGING_HASHES+=("$identity_hash")
}

db_staging_validate_sql_wrappers() {
  local index path first last
  for index in "${!DB_STAGING_PATHS[@]}"; do
    path="${DB_STAGING_PATHS[$index]}"
    first="$(sed -n '1p' "$path")"
    last="$(sed -n '$p' "$path")"
    [[ "$first" =~ ^[[:space:]]*BEGIN\;[[:space:]]*$ && "$last" =~ ^[[:space:]]*COMMIT\;[[:space:]]*$ ]] ||
      db_staging_die "SQL must be wrapped in BEGIN/COMMIT: ${DB_STAGING_NAMES[$index]}"
  done
}

db_staging_validate_inputs() {
  DB_STAGING_NAMES=()
  DB_STAGING_PATHS=()
  DB_STAGING_HASHES=()
  db_staging_require_tools
  db_staging_require_local_target
  db_staging_check_pins
  db_staging_check_forward_candidates
  ((${#DB_STAGING_NAMES[@]} == 40)) || db_staging_die 'staging package must contain exactly 40 SQL files'
  db_staging_validate_sql_wrappers
}

db_staging_psql_args() {
  DB_STAGING_PSQL_ARGS=(--no-psqlrc --no-align --tuples-only --quiet --set=ON_ERROR_STOP=1
    --host "$DB_STAGING_HOST" --port "$DB_STAGING_PORT" --username "$DB_STAGING_USER" --dbname "$DB_STAGING_DATABASE")
}

db_staging_query() {
  psql "${DB_STAGING_PSQL_ARGS[@]}" --command "$1"
}

db_staging_check_connection() {
  db_staging_psql_args
  local server_record db_name server_addr session_user is_superuser can_create_role can_create_db server_version_num
  server_record="$(db_staging_query "SELECT current_database()||'|'||coalesce(host(inet_server_addr()),'local')||'|'||session_user||'|'||(CASE WHEN r.rolsuper THEN 't' ELSE 'f' END)||'|'||(CASE WHEN r.rolcreaterole THEN 't' ELSE 'f' END)||'|'||(CASE WHEN has_database_privilege(current_user,current_database(),'CREATE') THEN 't' ELSE 'f' END)||'|'||current_setting('server_version_num') FROM pg_roles r WHERE r.rolname=current_user;")" || db_staging_die 'cannot connect to the dedicated staging database'
  IFS='|' read -r db_name server_addr session_user is_superuser can_create_role can_create_db server_version_num <<<"$server_record"
  [[ "$db_name" == "$DB_STAGING_DATABASE_NAME" ]] || db_staging_die 'connected database name did not match staging name'
  [[ "$server_addr" == '127.0.0.1' || "$server_addr" == '::1' || "$server_addr" == 'local' ]] || db_staging_die 'server address is not loopback'
  [[ "$server_version_num" =~ ^1[67][0-9]{4}$ ]] || db_staging_die "PostgreSQL server_version_num must be PG16 or PG17, got $server_version_num"
  [[ "$is_superuser" == 't' || ( "$can_create_role" == 't' && "$can_create_db" == 't' ) ]] ||
    db_staging_die 'operator lacks CREATEROLE and database CREATE privileges'
}

db_staging_check_database() {
  db_staging_check_connection
  local empty_record
  empty_record="$(db_staging_query "WITH ns AS (SELECT nspname FROM pg_namespace WHERE nspname NOT IN ('pg_catalog','information_schema','public') AND nspname NOT LIKE 'pg_toast%' AND nspname NOT LIKE 'pg_temp%'), rel AS (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%' AND c.relkind IN ('r','p','v','m','f','S')) SELECT (SELECT count(*) FROM ns)||'|'||(SELECT count(*) FROM rel)||'|'||(CASE WHEN to_regclass('canonical_migrations.applied') IS NULL THEN 'f' ELSE 't' END);")" || db_staging_die 'empty-database probe failed'
  [[ "$empty_record" == '0|0|f' ]] || db_staging_die "database is not empty or has a partial migration: $empty_record"
}

db_staging_print_plan() {
  local index
  printf 'STAGING_TARGET database=%s host=%s port=%s operator=%s\n' "$DB_STAGING_DATABASE" "$DB_STAGING_HOST" "$DB_STAGING_PORT" "$DB_STAGING_USER"
  for index in "${!DB_STAGING_NAMES[@]}"; do
    printf '%02d %s %s\n' "$((index+1))" "${DB_STAGING_NAMES[$index]}" "${DB_STAGING_HASHES[$index]}"
  done
}
