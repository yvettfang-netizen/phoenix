#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PREFLIGHT="$SCRIPT_DIR/db-preflight.sh"
readonly APPLY="$SCRIPT_DIR/db-apply.sh"
readonly IDENTITY_SQL="$SCRIPT_DIR/../../database/canonical/forward-candidates/service-workbench/0040_hk_identity_workbench.sql"
readonly VALID_SHA="$(sha256sum "$IDENTITY_SQL" | awk '{print $1}')"
readonly TEST_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/phoenix-service-project-staging-test.XXXXXX")"
cleanup() { rm -f -- "$TEST_OUTPUT"; }
trap cleanup EXIT

expect_blocked() {
  local label="$1"
  local command="$2"
  shift 2
  if "$command" "$@" >"$TEST_OUTPUT" 2>&1; then
    printf 'FAIL expected refusal: %s\n' "$label" >&2
    cat "$TEST_OUTPUT" >&2
    exit 1
  fi
}

expect_blocked 'non-loopback host' "$PREFLIGHT" \
  --host example.invalid --user staging_operator \
  --identity-sql "$IDENTITY_SQL" --identity-sha256 "$VALID_SHA"
expect_blocked 'production database name' "$PREFLIGHT" \
  --database phoenix_production --user staging_operator \
  --identity-sql "$IDENTITY_SQL" --identity-sha256 "$VALID_SHA"
expect_blocked 'identity hash drift' "$PREFLIGHT" \
  --user staging_operator --identity-sql "$IDENTITY_SQL" \
  --identity-sha256 0000000000000000000000000000000000000000000000000000000000000000
expect_blocked 'apply without explicit confirmation' "$APPLY" \
  --user staging_operator --identity-sql "$IDENTITY_SQL" \
  --identity-sha256 "$VALID_SHA"

printf 'PASS staging safety refusal tests\n'
