# Public release allowlist — Canonical 0035 candidate

**Gate 2: CONDITIONAL.** Applies only to the new integration branch of the public `yvettfang-netizen/phoenix` repository. It does not authorize release of the private repository or its full history.

## Allowed files

1. The exact 35 files `database/canonical/migrations/0001_*.sql` through `0035_*.sql`, if each SHA-256 equals [`CANONICAL_0035_SOURCE_MANIFEST.md`](CANONICAL_0035_SOURCE_MANIFEST.md). No edited Migration is allowlisted.
2. `database/canonical/README.md`, `database/canonical/.gitattributes` and the seven pre-merge gate documents in `docs/database/premerge-0035/`, after the public-candidate scan. The attributes force LF checkouts for SQL and verification scripts so staged migration bytes remain stable on Windows. These documents may include code paths, hashes, synthetic counts and public links. Private GitHub links resolve only for authorized readers.
3. A purpose-built verification script, CI workflow and `.github/CODEOWNERS` containing only the verified public GitHub login `yvettfang-netizen`, if they contain no credentials, real records, server addressing, or private operational topology and pass the same scan. The CODEOWNERS file is proposed on PR #36; it does not become effective on `main` before an approved merge.

## Stay in the private repository

`canonical-db/evidence/`, `runtime/`, `backups/`, `deploy/tencent/`, `.env*`, `*.pgpass`, keys, certificates, raw application or database logs, real identity/family mappings, signed decision evidence, secret references, server IPs/hostnames, infrastructure layout, backup destinations, and any document not individually reviewed for public release. The private Git history and Draft PR #1–#7 content are not part of the copy. A future addition needs a separate allowlist review.

## Scan and risk boundary

The 35 source SQL files were scanned with pinned `ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f dir /scan --redact=100 --no-banner --exit-code=1 --verbose`: 575,445 bytes scanned, zero findings. A targeted text search found no credential value, address, email or URL in these SQL files; one 0026 comment mentions a secret/document store without a secret. Full candidate tree and Git patch scans must be rerun after all files are staged. Gitleaks alone does not establish absence of PII or safe historical Git commits.

The public `phoenix/main` is an existing mixed project history and was **not** fully audited or rewritten by this task. The new branch starts from current main and adds only reviewed files. Existing unrelated public content is outside this allowlist. No private history is merged, rebased or pushed. CI artifacts must exclude environment files, backup dumps, pgpass and raw logs; verification publishes only sanitized summaries.

If a migrated file produces a credible secret/PII or topology finding, Gate 2 becomes **HOLD**: remove the proposed file from the integration branch without altering its approved private-source bytes, document the finding privately, rotate any exposed credential through its owner, and request a forward fix or a private-only packaging decision. Never edit 0001–0035 to silence a detector.
