#!/usr/bin/env bash
set -Eeuo pipefail
base=http://127.0.0.1:4775
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
check() {
  local expected="$1"
  shift
  local actual
  actual="$(curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}' "$@")"
  [[ "$actual" == "$expected" ]] || { printf 'Expected HTTP %s, received %s\n' "$expected" "$actual" >&2; exit 1; }
}
if [[ "${1:-}" != smoke && "${1:-}" != accounts ]]; then
  printf 'Usage: bash verify.sh smoke|accounts [PRIVATE_FIXTURE_JSON]\n' >&2
  exit 64
fi
check 200 "$base/__service-project-staging/health"
check 404 -H 'Host: preview.invalid:4775' "$base/__service-project-staging/health"
check 200 "$base/en/my-services"
node --input-type=module <<'ASSET'
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:4775";
let url = new URL("/brand/official/v3/phoenix-nova-header@2x.png", origin);
for (let hop = 0; ; hop++) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
  if (response.status === 200) {
    assert.match(response.headers.get("content-type") ?? "", /^image\/png(?:;|$)/);
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    await response.body?.cancel();
    break;
  }
  assert([301, 302, 307, 308].includes(response.status) && hop < 2, "Logo did not resolve to an image");
  const location = response.headers.get("location");
  assert(location, "Missing asset redirect");
  url = new URL(location, url);
  assert.equal(url.origin, origin, "Asset redirect escaped the private Worker");
  await response.body?.cancel();
}
ASSET
check 404 -X POST -H "Origin: $base" -H 'Content-Type: application/json' \
  --data '{"account":"client-a"}' "$base/api/service-workbench/dev-session"
check 401 "$base/api/family-services/summary"
check 403 -H 'X-Family-Id: forged' "$base/api/family-services/summary"
headers="$(curl --silent --show-error --max-time 15 --dump-header - --output /dev/null "$base/en/my-services")"
grep -qi '^x-robots-tag:.*noindex' <<< "$headers"
grep -qi '^cache-control:.*no-store' <<< "$headers"
printf 'PASS built Worker loopback, noindex/no-store, unauthenticated summary and synthetic-session denial\n'

if [[ "$1" == accounts ]]; then
  [[ "$#" == 2 && -f "$2" && ! -L "$2" && -O "$2" && "$(stat -c %a -- "$2")" == 600 ]] ||
    { printf 'Supply an operator-owned 0600 synthetic account fixture.\n' >&2; exit 64; }
  node "$script_dir/verify-accounts.mjs" "$2"
else
  printf 'NOT RUN PostgreSQL authorization, real identity, storage, or recovery checks\n'
fi
