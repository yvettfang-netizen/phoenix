#!/usr/bin/env bash
set -Eeuo pipefail

readonly DB_STAGING_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-staging-common.sh
source "$DB_STAGING_SCRIPT_DIR/db-staging-common.sh"

db_staging_parse_args "$@"
db_staging_validate_inputs
db_staging_check_database
db_staging_print_plan
printf 'PASS staging preflight. No SQL was applied.\n'
