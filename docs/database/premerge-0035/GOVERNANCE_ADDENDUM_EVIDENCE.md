# PR #36 governance addendum evidence — 2026-11-02

These are local and GitHub read-only verification outputs for the addendum branch before its new CI run. They do not constitute independent reviewer or Founder signatures. The GitHub Actions run for the resulting commit must be read separately.

## Migration byte integrity

Command: compare each of the 35 `database/canonical/migrations/*.sql` file SHA-256 values with `CANONICAL_0035_SOURCE_MANIFEST.md` using PowerShell `Get-FileHash -Algorithm SHA256`.

```text
SQL_COUNT=35
HASH_MISMATCH_COUNT=0
```

## Pinned candidate scan

Command: `docker run --rm --mount "type=bind,source=<resolved candidate path>,target=/scan,readonly" ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f dir /scan --redact=100 --no-banner --exit-code=1`, repeated for the four paths below.

```text
SCAN_PATH=database/canonical
scanned ~584607 bytes (584.61 KB); no leaks found
EXIT_CODE=0
SCAN_PATH=docs/database/premerge-0035
scanned ~36375 bytes (36.38 KB); no leaks found
EXIT_CODE=0
SCAN_PATH=.github/workflows/canonical-0035-premerge.yml
scanned ~3071 bytes (3.07 KB); no leaks found
EXIT_CODE=0
SCAN_PATH=.github/CODEOWNERS
scanned ~275 bytes (275 bytes); no leaks found
EXIT_CODE=0
```

## Live main protection and review state

Command: `gh api repos/yvettfang-netizen/phoenix/branches/main/protection --jq '{strict: .required_status_checks.strict, checks: .required_status_checks.checks, enforce_admins: .enforce_admins.enabled, reviews: .required_pull_request_reviews.required_approving_review_count, codeowners: .required_pull_request_reviews.require_code_owner_reviews, last_push: .required_pull_request_reviews.require_last_push_approval, stale: .required_pull_request_reviews.dismiss_stale_reviews, linear: .required_linear_history.enabled, force: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled, conversation: .required_conversation_resolution.enabled}'`.

```json
{"checks":[{"app_id":15368,"context":"public-candidate-scan"},{"app_id":15368,"context":"isolated-postgres (16, fresh)"},{"app_id":15368,"context":"isolated-postgres (16, upgrade)"},{"app_id":15368,"context":"isolated-postgres (17, fresh)"},{"app_id":15368,"context":"isolated-postgres (17, upgrade)"}],"codeowners":true,"conversation":true,"deletions":false,"enforce_admins":true,"force":false,"last_push":true,"linear":true,"reviews":1,"stale":true,"strict":true}
```

Command: `gh pr view 36 --repo yvettfang-netizen/phoenix --json isDraft,state,headRefOid,reviews,reviewRequests --jq '{draft: .isDraft, state, head: .headRefOid, review_count: (.reviews|length), request_count: (.reviewRequests|length)}'`.

```json
{"draft":true,"head":"54fd1eb415c5be7d98ffb27b4d30961d69b73c04","request_count":0,"review_count":0,"state":"OPEN"}
```

Command: `gh api repos/yvettfang-netizen/phoenix/contents/.github/CODEOWNERS?ref=main --silent`.

```text
gh: Not Found (HTTP 404)
CODEOWNERS_MAIN_EXIT=1
```

The 404 is expected while CODEOWNERS exists only in the proposed PR branch; it is a current governance gap, not evidence that the file is active on `main`.
