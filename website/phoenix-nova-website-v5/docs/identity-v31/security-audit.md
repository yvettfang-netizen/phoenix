> Historical baseline (2026-11-02). Current remediation and remaining HOLD gates: [2026-11-04 readiness](production-readiness-20261104.md). The import route now always returns 404; the old import flag cannot reopen it. Canonical 0035 is now present through main, but no website adapter/runtime approval is established. Dependency findings below describe the old lockfile, not the remediated audit.

# Identity V3.1 Dependency Security Audit

**Status:** `HOLD / NOT_SECURITY_PASS`
**Scope:** production dependencies for the Identity V3.1 candidate website
**Command:** `npm audit --omit=dev --json`
**Raw evidence:** [`outputs/identity-v31/security-audit.json`](../../outputs/identity-v31/security-audit.json)

## Result

The audit completed with a non-zero status because vulnerabilities were reported. The JSON report is valid and records:

| Severity | Count |
|---|---:|
| Critical | 1 |
| High | 7 |
| Moderate | 10 |
| **Total** | **18** |

No `npm audit fix`, install, dependency upgrade, downgrade or package-lock rewrite was performed.

## Baseline comparison

The comparison was performed in Node memory using the baseline lockfile from `origin/main` SHA `259753248ff54b07fd9c52f270e45ae1c877bc09` and the current candidate lockfile. The top-level production change is:

| Package | Baseline | Current | Attribution |
|---|---|---|---|
| `exceljs` | absent | `4.4.0` | Newly introduced direct production dependency |

The current lockfile has 102 package-entry version/path changes (98 added entries and 4 changed existing entries). The material new production chain is:

`exceljs@4.4.0` → `archiver@5.3.2` → `archiver-utils`, `readdir-glob`, `zip-stream`, `glob`, `minimatch`, `brace-expansion`; and `exceljs` also brings `uuid@8.3.2`.

`brace-expansion@1.1.14` and `minimatch@3.1.5` existed in the baseline lockfile as dev-only entries; the ExcelJS chain makes the vulnerable versions production-reachable. The nested `readdir-glob/node_modules/brace-expansion@2.1.7` is newly added. This is why a same-version lock entry can still represent a new production exposure.

The audit also reports existing baseline production findings, including `next@16.2.6`, `zod@3.25.76`, `nanoid@3.3.12`, `fast-uri@3.1.2`, `sharp@0.34.5` and `source-map-js@1.2.1`. “Baseline” means not introduced by this CBI change; it does not mean safe or releasable.

## Critical baseline finding

`next@16.2.6` is the single critical package reported by this audit. The raw report associates the critical advisories below; retain these official GitHub Advisory URLs in any release decision:

- [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) — unauthenticated RCE on Windows-hosted servers.
- [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) — unauthenticated RCE in Image Optimization API when AVIF is used.
- [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) — RCE in `next/og` `ImageResponse`.
- [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) — unauthenticated RCE in Image Optimization API when SVG files are used.
- [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) — RCE in `use cache` functions returning typed arrays.

This finding is baseline-existing, but it blocks a release/security pass for the candidate as a whole. The audit JSON retains the other Next.js high/moderate advisory URLs and all package-level advisory metadata.

## Newly reachable ExcelJS chain

The direct `exceljs@4.4.0` record is reported as moderate through `archiver` and `uuid`. The transitive packages are also reported by npm audit:

| Package / path | Current version | Reported risk | Evidence |
|---|---:|---|---|
| `exceljs` | 4.4.0 | Moderate; dependency chain | Direct dependency in `package.json`; `lib/cbi-import.ts` imports it dynamically |
| `archiver`, `archiver-utils`, `readdir-glob`, `zip-stream` | 5.3.2 / 2.1.0 / 1.1.3 / 4.1.1 | Moderate transitive archive/glob exposure | New lock entries under ExcelJS |
| `glob`, `minimatch` | 7.2.3 / 3.1.5 | Moderate DoS path | `archiver-utils`/`readdir-glob` chain |
| `brace-expansion` | 1.1.14 and nested 2.1.7 | High/moderate expansion DoS advisories | Baseline dev-only version becomes production-reachable; nested version is new |
| `uuid` | 8.3.2 | Moderate buffer-bounds advisory | New ExcelJS transitive dependency |

Relevant official advisories retained in the raw report include:

- [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp), [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) — `brace-expansion` expansion/recursion DoS findings.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) — `minimatch` globparts amplification DoS.
- [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — `uuid` buffer-bounds issue when a buffer is supplied.

`npm audit` suggested an `exceljs@3.4.0` fix path, which is a semver-major downgrade and was not applied or treated as an approved remediation.

## Reachability and containment

Code evidence reviewed:

- `lib/cbi-import.ts:134` dynamically imports `exceljs` in `parseXlsx`.
- `components/cbi-import-preview.tsx` is a client component and calls `previewCbiImport` on a user-selected local file.
- `app/[locale]/identity/import-review/page.tsx` returns `notFound()` unless the server-only `IDENTITY_CBI_IMPORT_REVIEW=1` flag is enabled.
- The same page emits `noindex`, `nofollow` and `nocache` metadata when enabled; it has no public fallback.
- The preview result stays `IMPORT_REVIEW`; the current route does not write a database or publish a version. `releaseCbiImport` requires an explicit repository and server authorization.
- The parser has file-size, row, ZIP-entry, uncompressed-size, encryption, macro and ZIP64 checks. These reduce exposure but do not remove vulnerable dependency code.

This is therefore **preview-only and not intended as a public data endpoint**, but it is not a complete security boundary: the env flag is not an authenticated role/RBAC check, and untrusted XLSX bytes still reach the client-side ExcelJS/archive parser. Malicious or oversized files can still create browser CPU/memory/availability risk. The baseline Next.js critical finding remains release-wide.

## Gate decision

`SECURITY_PASS: HOLD`

Reasons:

1. One critical and seven high production findings remain in the current audit.
2. The newly added ExcelJS archive/glob chain is production-reachable in the XLSX preview path.
3. Internal/noindex/preview-only containment is useful evidence, not a substitute for dependency remediation, authenticated access control and a reviewed parser isolation boundary.
4. Canonical PostgreSQL/RLS evidence is already `HOLD / NOT_VERIFIED` in the mapping handoff.

Do not publish CBI import data, expose the import route publicly, execute `audit fix`, or claim `SECURITY_PASS` until a separately approved remediation and re-audit are complete.
