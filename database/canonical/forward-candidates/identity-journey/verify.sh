#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  16) image='postgres:16@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d' ;;
  17) image='postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3' ;;
  *) echo 'Provide PostgreSQL major 16 or 17.' >&2; exit 64 ;;
esac

candidate="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
canonical="$(cd "$candidate/../.." && pwd)"
export POSTGRES_PASSWORD="$(openssl rand -hex 32)"
docker_args=(
  --network none --label phoenix.identity-journey=synthetic
  -e POSTGRES_USER=phoenix_bootstrap -e POSTGRES_DB=phoenix_canonical_dev -e POSTGRES_PASSWORD
)
container=$(docker run -d "${docker_args[@]}" "$image")
unset POSTGRES_PASSWORD
trap 'docker rm -fv "$container" >/dev/null' EXIT

for attempt in {1..60}; do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U phoenix_bootstrap -d phoenix_canonical_dev >/dev/null; then break; fi
  if [[ "$attempt" == 60 ]]; then echo 'Synthetic database startup timed out.' >&2; exit 1; fi
  sleep 1
done

docker cp "$canonical/migrations" "$container:/opt/canonical-migrations"
docker cp "$canonical/verification/migrate.sh" "$container:/opt/migrate.sh"
docker exec -e CANONICAL_EXPECTED_MIGRATIONS=37 "$container" bash /opt/migrate.sh

psql_synthetic() {
  local args=(-X -h 127.0.0.1 -U phoenix_bootstrap -v ON_ERROR_STOP=1)
  docker exec -i -e PGPASSFILE=/tmp/canonical-premerge.pgpass "$container" psql "${args[@]}" "$@"
}

if output=$(psql_synthetic -d phoenix_canonical_dev < "$candidate/storage.sql" 2>&1); then
  echo 'The unapproved database-name guard did not block installation.' >&2; exit 1
fi
[[ "$output" == *IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED* ]]
psql_synthetic -d postgres -c 'ALTER DATABASE phoenix_canonical_dev RENAME TO phoenix_identity_journey_synthetic_ci'
psql_synthetic -d phoenix_identity_journey_synthetic_ci < "$candidate/storage.sql"
psql_synthetic -d phoenix_identity_journey_synthetic_ci < "$candidate/verify.sql"

db=phoenix_identity_journey_synthetic_ci
psql_synthetic -d "$db" < "$candidate/verify-worker-fixture.sql"
publication="SELECT identity.publish_journey_station_notice('01910000-0000-7000-8100-000000000008', '01910000-0000-7000-8100-000000000003', '01910000-0000-7000-8100-000000000007');"
membership="UPDATE core.family_memberships SET valid_until = %s WHERE membership_id = '01910000-0000-7000-8100-000000000004';"

# Worker A publishes without committing. Waiting for its explicit result keeps
# the competing transaction deterministic without a fixed pg_sleep window.
coproc PUBLISHER { psql_synthetic -qAt -d "$db"; }
publisher_pid=$PUBLISHER_PID
printf 'BEGIN;\n%s\n' "$publication" >&"${PUBLISHER[1]}"
IFS= read -r -t 20 staged <&"${PUBLISHER[0]}"
[[ "$staged" == 'DELIVERED' ]]
[[ "$(psql_synthetic -qAt -d "$db" -c "SET statement_timeout='4s'; $publication")" == 'UNAVAILABLE' ]]
printf 'ROLLBACK;\n\\q\n' >&"${PUBLISHER[1]}"
wait "$publisher_pid"

# A recipient that lost membership during recovery must not receive the
# retried notice. Restoring the synthetic membership exercises a valid retry.
psql_synthetic -qAt -d "$db" -c "$(printf "$membership" 'clock_timestamp()')"
[[ "$(psql_synthetic -qAt -d "$db" -c "$publication")" == 'RECIPIENT_UNAVAILABLE' ]]
psql_synthetic -qAt -d "$db" -c "$(printf "$membership" NULL)"
[[ "$(psql_synthetic -qAt -d "$db" -c "$publication")" == 'DELIVERED' ]]
[[ "$(psql_synthetic -qAt -d "$db" -c "$publication")" == 'ALREADY_DELIVERED' ]]
[[ "$(psql_synthetic -qAt -d "$db" -c "
  SELECT count(*) FROM identity.journey_station_notices n
  JOIN identity.journey_station_reminders r USING (reminder_id)
  WHERE n.reminder_id = '01910000-0000-7000-8100-000000000008'
    AND n.published_at = r.delivered_at AND r.state = 'DELIVERED'
    AND r.attempt_count = 2 AND r.retry_not_before IS NULL")" == '1' ]]
echo "PASS competing sessions, rollback recovery, membership revocation and single receipt: PG$1"
echo "PASS Identity Journey candidate PostgreSQL $1; synthetic fixture only"
