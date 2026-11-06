#!/usr/bin/env bash
set -Eeuo pipefail

readonly entry_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=db-staging-common.sh
source "$entry_dir/db-staging-common.sh"

db_staging_parse_args "$@"
db_staging_require_tools
db_staging_require_target_basics
db_staging_check_connection

role_record="$(db_staging_query "SELECT count(*) FILTER (WHERE rolname IN ('phoenix_canonical_migrator','phoenix_canonical_app','phoenix_canonical_reader','phoenix_canonical_context_binder','phoenix_canonical_service_workbench') AND rolcanlogin IS FALSE AND rolbypassrls IS FALSE)||'|'||count(*) FILTER (WHERE rolname IN ('phoenix_canonical_migrator','phoenix_canonical_app','phoenix_canonical_reader','phoenix_canonical_context_binder','phoenix_canonical_service_workbench')) FROM pg_roles;")"
IFS='|' read -r safe_roles all_roles <<<"$role_record"
[[ "$safe_roles" == '5' && "$all_roles" == '5' ]] || db_staging_die 'canonical group roles are missing or have LOGIN/BYPASSRLS'

ticket_record="$(db_staging_query "SELECT (CASE WHEN has_function_privilege('phoenix_canonical_context_binder','auth.issue_context_ticket(uuid,uuid,uuid,text,timestamptz,uuid,uuid)','EXECUTE') THEN 't' ELSE 'f' END)||'|'||(CASE WHEN has_function_privilege('phoenix_canonical_app','auth.redeem_context_ticket(uuid,uuid)','EXECUTE') THEN 't' ELSE 'f' END)||'|'||(CASE WHEN has_function_privilege('phoenix_canonical_service_workbench','service.workbench_summary(integer,timestamptz,uuid)','EXECUTE') THEN 't' ELSE 'f' END)||'|'||(CASE WHEN has_table_privilege('phoenix_canonical_service_workbench','service.workbench_settings','SELECT') THEN 't' ELSE 'f' END);")"
[[ "$ticket_record" == 't|t|t|f' ]] || db_staging_die "canonical role grants are outside the reviewed boundary: $ticket_record"

printf 'PASS canonical role boundary. Binder issues tickets, app redeems tickets, service role executes summary, and service role has no direct table SELECT.\n'
printf 'No login role, password, provider mapping, or real identity was created.\n'
