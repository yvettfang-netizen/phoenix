#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Disposable physical recovery transport for verify.sh's labelled, --network
# none PostgreSQL container. No production host or secret is discovered.
readonly root='/var/lib/postgresql/identity-journey-recovery'
readonly data="$root/standby" socket="$root/socket" log="$root/standby.log"
readonly source_pass='/tmp/identity-recovery-source.pgpass'
readonly client_pass='/tmp/identity-recovery-client.pgpass'
readonly db='phoenix_identity_journey_synthetic_ci' source_port=5432 port=5433
readonly limit="${IDENTITY_RECOVERY_TIMEOUT_SECONDS:-60}"

die() { printf 'recovery-transport: %s\n' "$*" >&2; exit 1; }
usage() { printf 'Usage: %s {start|promote|stop} <container> [flush-lsn]\n' "$0" >&2; exit 64; }
[[ "$limit" =~ ^[1-9][0-9]{0,2}$ ]] || die 'invalid IDENTITY_RECOVERY_TIMEOUT_SECONDS.'
[[ $# -ge 2 ]] || usage
c="$2"
[[ "$c" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] || die 'unsafe container name.'

# One inspect call proves the container is running, synthetic, and isolated.
inspect="$(docker inspect --format '{{.State.Running}}|{{.HostConfig.NetworkMode}}|{{index .Config.Labels "phoenix.identity-journey"}}' "$c" 2>/dev/null || true)"
IFS='|' read -r running network label <<<"$inspect"
[[ "$running" == true && "$network" == none && "$label" == synthetic ]] ||
  die 'container must be running, labelled phoenix.identity-journey=synthetic, and use network mode none.'

is_running() { docker exec -u postgres "$c" pg_ctl -D "$data" status >/dev/null 2>&1; }
q() { docker exec -u postgres -e PGPASSFILE="$client_pass" "$c" psql -w -X -qAt -h 127.0.0.1 -p "$port" -U phoenix_bootstrap -d "$db" -v ON_ERROR_STOP=1 -c "$1"; }

ready_standby() {
  local i
  for ((i=1; i<=limit; i++)); do
    [[ "$(q 'SELECT pg_is_in_recovery()' 2>/dev/null || true)" == t ]] && return 0
    sleep 1
  done
  die "standby on port $port did not become ready within ${limit}s."
}

start_transport() {
  docker exec "$c" sh -ceu "
    umask 077
    test ! -e '$root'
    test -s /tmp/canonical-premerge.pgpass
    install -d -o postgres -g postgres -m 700 '$root' '$socket'
    cp /tmp/canonical-premerge.pgpass '$source_pass'
    sed 's/:5432:/:5433:/' /tmp/canonical-premerge.pgpass > '$client_pass'
    for role in app binder workbench; do
      if test -s "/tmp/identity-crm-\${role}.pgpass"; then
        sed 's/:5432:/:5433:/' "/tmp/identity-crm-\${role}.pgpass" > "/tmp/identity-recovery-\${role}.pgpass"
      fi
    done
    chown postgres:postgres '$source_pass' '$client_pass'
    chmod 600 '$source_pass' '$client_pass'
  "
  docker exec -u postgres -e PGPASSFILE="$source_pass" "$c" pg_basebackup -w -h 127.0.0.1 -p "$source_port" -U phoenix_bootstrap -D "$data" -Fp -X stream -R -c fast >/dev/null
  docker exec -u postgres "$c" pg_verifybackup "$data" >/dev/null
  docker exec "$c" sh -ceu "cat >> '$data/postgresql.auto.conf' <<'CFG'
listen_addresses = '127.0.0.1'
port = 5433
unix_socket_directories = '$socket'
hot_standby = on
primary_conninfo = 'host=127.0.0.1 port=5432 user=phoenix_bootstrap passfile=$source_pass application_name=identity_journey_recovery'
CFG
chown postgres:postgres '$data/postgresql.auto.conf'; chmod 600 '$data/postgresql.auto.conf'"
  docker exec -u postgres "$c" pg_ctl -D "$data" -l "$log" -o "-p $port -h 127.0.0.1 -k $socket" -w -t "$limit" start >/dev/null
  ready_standby
  printf 'recovery_transport_ready container=%s port=%s mode=standby\n' "$c" "$port"
}

promote_transport() {
  local lsn="${3:-}" i ok=f
  [[ "$#" -eq 3 && "$lsn" =~ ^[0-9A-Fa-f]+/[0-9A-Fa-f]+$ ]] || die 'flush LSN must use PostgreSQL X/Y hexadecimal notation.'
  is_running || die 'standby is not running; run start first.'
  ready_standby
  q "SELECT '$lsn'::pg_lsn" >/dev/null
  for ((i=1; i<=limit; i++)); do
    ok="$(q "SELECT COALESCE(pg_last_wal_replay_lsn() >= '$lsn'::pg_lsn, false)" 2>/dev/null || true)"
    [[ "$ok" == t ]] && break
    sleep 1
  done
  [[ "$ok" == t ]] || die "standby did not replay requested flush LSN within ${limit}s."
  [[ "$(q 'SELECT pg_promote(true, 30)' 2>/dev/null || true)" == t ]] || die 'PostgreSQL refused standby promotion.'
  for ((i=1; i<=limit; i++)); do
    if [[ "$(q 'SELECT NOT pg_is_in_recovery()' 2>/dev/null || true)" == t ]]; then
      q 'CREATE TEMP TABLE recovery_transport_probe(ok boolean); INSERT INTO recovery_transport_probe VALUES (true); DROP TABLE recovery_transport_probe' >/dev/null
      printf 'recovery_transport_promoted container=%s port=%s target_lsn=%s\n' "$c" "$port" "$lsn"; return
    fi
    sleep 1
  done
  die 'standby did not become read/write after promotion.'
}

stop_transport() {
  if is_running; then docker exec -u postgres "$c" pg_ctl -D "$data" -m fast -w -t "$limit" stop >/dev/null; fi
  docker exec "$c" sh -ceu "rm -f -- '$source_pass' '$client_pass' /tmp/identity-recovery-app.pgpass /tmp/identity-recovery-binder.pgpass /tmp/identity-recovery-workbench.pgpass"
  printf 'recovery_transport_stopped container=%s\n' "$c"
}

case "${1:-}" in
  start) [[ "$#" -eq 2 ]] || usage; start_transport ;;
  promote) promote_transport "$@" ;;
  stop) [[ "$#" -eq 2 ]] || usage; stop_transport ;;
  *) usage ;;
esac
