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
container=$(docker run -d --network none --label phoenix.identity-journey=synthetic +  -e POSTGRES_USER=phoenix_bootstrap -e POSTGRES_DB=phoenix_canonical_dev -e POSTGRES_PASSWORD "$image")
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
  docker exec -i -e PGPASSFILE=/tmp/canonical-premerge.pgpass "$container" +    psql -X -h 127.0.0.1 -U phoenix_bootstrap -v ON_ERROR_STOP=1 "$@"
}

if output=$(psql_synthetic -d phoenix_canonical_dev < "$candidate/storage.sql" 2>&1); then
  echo 'The unapproved database-name guard did not block installation.' >&2; exit 1
fi
[[ "$output" == *IDENTITY_JOURNEY_SYNTHETIC_DATABASE_REQUIRED* ]]
psql_synthetic -d postgres -c 'ALTER DATABASE phoenix_canonical_dev RENAME TO phoenix_identity_journey_synthetic_ci'
psql_synthetic -d phoenix_identity_journey_synthetic_ci < "$candidate/storage.sql"
psql_synthetic -d phoenix_identity_journey_synthetic_ci < "$candidate/verify.sql"
echo "PASS Identity Journey candidate PostgreSQL $1; synthetic fixture only"
