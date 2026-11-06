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
  local expected="$3"
  shift 3
  if bash "$command" "$@" >"$TEST_OUTPUT" 2>&1 || ! grep -Fq "BLOCKED: $expected" "$TEST_OUTPUT"; then
    printf 'FAIL expected refusal: %s\n' "$label" >&2
    cat "$TEST_OUTPUT" >&2
    exit 1
  fi
}

expect_blocked 'non-loopback host' "$PREFLIGHT" 'database host must be localhost' \
  --host example.invalid --user staging_operator \
  --identity-sql "$IDENTITY_SQL" --identity-sha256 "$VALID_SHA"
expect_blocked 'production database name' "$PREFLIGHT" 'database name must be phoenix_service_project_staging' \
  --database phoenix_production --user staging_operator \
  --identity-sql "$IDENTITY_SQL" --identity-sha256 "$VALID_SHA"
expect_blocked 'identity hash drift' "$PREFLIGHT" '0040 SHA-256 is not the pinned build-inventory candidate' \
  --user staging_operator --identity-sql "$IDENTITY_SQL" \
  --identity-sha256 0000000000000000000000000000000000000000000000000000000000000000
expect_blocked 'apply without explicit confirmation' "$APPLY" 'db-apply.sh requires --confirm-staging' \
  --user staging_operator --identity-sql "$IDENTITY_SQL" \
  --identity-sha256 "$VALID_SHA"

printf 'PASS staging safety refusal tests\n'
