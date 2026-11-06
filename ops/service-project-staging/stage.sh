#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

die() { printf '%s\n' "$*" >&2; exit 1; }
root="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
website="$root/website/phoenix-nova-website-v5"
server="$root/Phoenix Compass/education compass/server"
ops="$root/ops/service-project-staging"
action="${1:-}"
sha="${2:-}"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || die "Usage: bash stage.sh build|start|worker-smoke FULL_SHA [PRIVATE_STATE]"
[[ "$(git -C "$root" rev-parse HEAD)" == "$sha" ]] || die 'Checkout does not match requested SHA'
[[ -z "$(git -C "$root" status --porcelain)" ]] || die 'Release checkout must be clean'
[[ "$(uname -s)" == Linux ]] || die 'Private staging package runs on Linux'
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major===22&&minor>=13?0:1)' ||
  die 'Node 22.13 or a later Node 22 patch release is required'

if [[ "$action" == build ]]; then
  [[ "$#" == 2 ]] || die 'build accepts a SHA only'
  (cd "$server"; npm ci --ignore-scripts --no-audit --no-fund; npm run typecheck; npm run build)
  (cd "$website"; npm ci --ignore-scripts --no-audit --no-fund; node node_modules/workerd/install.js; npm run typecheck; npm run build)
  (
    cd "$root"
    find website/phoenix-nova-website-v5/dist 'Phoenix Compass/education compass/server/dist' \
      -type f ! -name '.service-project-stage-hashes' ! -name '.service-project-stage-sha' -print0 |
      sort -z | xargs -0 sha256sum > "$website/dist/.service-project-stage-hashes"
  )
  printf '%s\n' "$sha" > "$website/dist/.service-project-stage-sha"
  printf 'Built Worker and API at %s\n' "$sha"
  exit
fi

[[ "$action" == start || "$action" == worker-smoke ]] || die 'Unknown action'
[[ "$#" == 3 && "${3:-}" == /* && -d "$3" && ! -L "$3" ]] || die 'Supply an existing private absolute state directory'
state="$(realpath -- "$3")"
[[ "$state" == "$3" && "$state" != / && "$state" != "$root" && "$state/" != "$root/"* ]] ||
  die 'State must be a resolved directory outside the release checkout'
[[ -O "$state" && "$(stat -c %a -- "$state")" == 700 ]] || die 'State directory must be owned by this user and have mode 0700'
[[ -f "$website/dist/.service-project-stage-sha" && "$(cat "$website/dist/.service-project-stage-sha")" == "$sha" ]] ||
  die 'Run build for this SHA first'
(cd "$root"; sha256sum --quiet --check "$website/dist/.service-project-stage-hashes")
exec 9>"$state/staging.lock"
flock -n 9 || die 'Another instance is using this state directory'

private_file() {
  [[ -f "$1" && ! -L "$1" && -O "$1" && "$(stat -c %a -- "$1")" == 600 ]] ||
    die 'Required environment file must be owned by this user and have mode 0600'
}

export WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false CI=1
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID
unset CLOUDFLARE_INCLUDE_PROCESS_ENV

private_file "$state/worker.env"
node "$ops/prepare-worker.mjs" "$website" "$state" "$action"
wrangler="$website/node_modules/wrangler/bin/wrangler.js"
config="$state/worker.config.json"
(
  cd "$state"
  node "$wrangler" d1 migrations apply DB --config "$config" --local --persist-to "$state/d1" </dev/null
)

children=()
stop() {
  if ((${#children[@]})); then
    kill "${children[@]}" 2>/dev/null || true
    wait "${children[@]}" 2>/dev/null || true
  fi
}
trap stop EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$action" == start ]]; then
  private_file "$state/server.env"
  (cd "$state"; exec node "$ops/start-api.mjs" "$server" "$state/server.env") &
  children+=("$!")
fi
(
  cd "$state"
  exec node "$wrangler" dev --config "$config" --env-file "$state/worker.env" --local \
    --ip 127.0.0.1 --port 4775 --inspector-ip 127.0.0.1 --inspector-port 0 \
    --no-bundle --persist-to "$state/d1" --show-interactive-dev-session=false
) &
children+=("$!")
wait -n "${children[@]}"
