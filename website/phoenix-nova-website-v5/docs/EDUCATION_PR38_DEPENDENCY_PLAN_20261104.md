# Education PR #38 dependency remediation plan

Date: 2026-11-04 (Asia/Shanghai)

This is a read-only dependency plan. It does not change `package.json`,
`package-lock.json`, source code, or the database. Those files already had
uncommitted changes from a parallel upgrade pass in the shared worktree; this
task did not create, revert, or overwrite those changes.

## Historical planning evidence

The original audit evidence is `outputs/education-pr38/npm-audit.json`. The
recorded command was `npm audit --package-lock-only --json` and exited 1:

- 43 vulnerable package entries: 1 critical, 18 high, 23 moderate, 1 low.
- Dependency inventory: 196 production, 645 development, 218 optional, and 43
  peer dependencies (878 total).
- The report was generated before the coordinated runtime/toolchain upgrade.

The coordinated candidate lockfile is summarized in
`outputs/education-pr38/runtime-audit-first.json`. Its recorded result is 30
entries: 0 critical, 4 high, 25 moderate, and 1 low. The remaining package
keys are:

`@babel/core`, `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`,
`@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`,
`@next/eslint-plugin-next`, `@typescript-eslint/eslint-plugin`,
`@typescript-eslint/parser`, `@typescript-eslint/type-utils`,
`@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`,
`@vercel/og`, `baseline-browser-mapping`, `brace-expansion`, `browserslist`,
`drizzle-kit`, `esbuild`, `eslint`, `eslint-config-next`,
`eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`,
`fast-uri`, `fflate`, `js-yaml`, `minimatch`, `satori`, `typescript-eslint`, and
`vinext`.

The current candidate versions in the shared lockfile include Next 16.4.5,
React and React DOM 19.3.1, React Server DOM Webpack 19.3.1, Zod 4.6.7,
`@cloudflare/vite-plugin` 1.67.0, Wrangler 4.157.0, Vinext 1.4.3, Vite 8.3.5,
`@vitejs/plugin-rsc` 0.5.38, `eslint-config-next` 16.4.5, and Drizzle Kit
0.31.11. These are candidate values, not a completed security release: the
30-entry audit result still contains unresolved items.

## Registry compatibility checks

Read-only requests were made to the official npm registry through the
configured proxy on 2026-11-04. Relevant metadata was:

| Package | Registry version | Compatibility evidence |
| --- | --- | --- |
| `next` | 16.4.5 | Node `>=20.9.0`; React/DOM `^19.0.0` accepted. |
| `react`, `react-dom` | 19.3.1 | `react-dom` requires React `^19.3.1`. |
| `react-server-dom-webpack` | 19.3.1 | Requires React and React DOM `^19.3.1`. |
| `vinext` | 1.4.3 | Requires Vite `^8`, React/DOM `^19.3.1`, RSC `^19.3.1`, and `@vitejs/plugin-rsc ^0.5.37`. |
| `@vitejs/plugin-rsc` | 0.5.38 | Peer metadata accepts the coordinated React/RSC versions. |
| `vite` | 8.3.5 | Node `^20.19.0 || >=22.12.0`; the repository engine `>=22.13.0` satisfies it. |
| `@cloudflare/vite-plugin` | 1.67.0 | Requires Vite `^6.1 || ^7 || ^8` and Wrangler `^4.156.1`. |
| `wrangler` | 4.157.0 | Node `>=22`; satisfies the Cloudflare plugin peer. |
| `eslint-config-next` | 16.4.5 | Peer requires ESLint `>=9` and TypeScript `>=3.3.1`. |
| `eslint` | 10.14.0 | Node requirement is satisfied, but current import/jsx-a11y/react plugin peers stop at ESLint 9; do not upgrade this alone. |
| `drizzle-kit` | 0.31.11 | Still depends on `@esbuild-kit/esm-loader ^2.5.5`; it is not a security fix for the old esbuild chain. |
| `satori` | 0.63.2 | Latest metadata still declares `fflate: 0.7.3`. |
| `@vercel/og` | 1.0.3 | Declares `satori: 0.33.5`; Vinext 1.4.3 uses this release. |
| `fast-uri` | 4.2.3 latest; 3.1.9 is the first safe 3.x floor in the advisory ranges | Ajv currently accepts `fast-uri ^3.0.1`; use a scoped 3.x override, not a global 4.x replacement. |
| `fflate` | 0.8.3 latest; 0.7.5 security backport | Use the 0.7.5 backport only as a scoped Satori override, with image-generation tests. |
| `js-yaml` | 5.5.0 latest; 4.3.2 safe 4.x floor | `@eslint/eslintrc` accepts `^4.1.1`; prefer `^4.3.2`, not a major 5.x override. |
| `browserslist` | 4.29.5 | Compatible with the existing `^4.x` parent ranges. |
| `baseline-browser-mapping` | 2.11.33 latest | Compatible with existing `^2.9.19` / `^2.10.12` parent ranges. |
| `brace-expansion` | 1.1.21 and 5.0.12 safe floors | Both are within the current `minimatch` 3.x and 10.x dependency ranges. |

## Recommended remediation sequence

1. Keep the coordinated runtime group together: Next 16.4.5, React/DOM
   19.3.1, React Server DOM Webpack 19.3.1, Vinext 1.4.3, Vite 8.3.5, and
   `@vitejs/plugin-rsc` 0.5.38. This is the group that addresses the original
   Next critical finding and the RSC/Vinext peer contract. Run build,
   TypeScript, lint, unit, and browser checks after the group is locked.

2. Keep the Cloudflare tools coordinated: `@cloudflare/vite-plugin` 1.67.0
   with Wrangler at least 4.156.1 (the registry latest checked was 4.157.0).
   The plugin brings newer Miniflare, `ws`, and esbuild nodes. Verify the
   Worker adapter and local preview separately; this does not prove production
   runtime reachability.

3. Keep Zod 4.6.7 as a deliberate major migration. Audit every Zod call site,
   run typecheck and the Education/security tests, and record any schema or
   error-format changes before treating the upgrade as complete.

4. Do not accept npm's automatic `eslint@4.0.0` or `eslint-config-next@0.2.4`
   suggestions. They are major downgrades and would discard the current Next
   toolchain. The current latest `eslint-plugin-import`,
   `eslint-plugin-jsx-a11y`, and `eslint-plugin-react` metadata does not declare
   ESLint 10 support. Upgrade those plugins first when compatible releases are
   available, then evaluate ESLint 10.14.0 as a separate toolchain change.

5. Resolve same-major transitive patches with scoped overrides only after a
   lockfile install and targeted tests. The following is a review candidate,
   not an instruction to apply blindly:

   ```json
   {
     "overrides": {
       "eslint-plugin-react-hooks": { "@babel/core": "^7.29.1" },
       "ajv": { "fast-uri": "^3.1.9" },
       "@eslint/eslintrc": { "js-yaml": "^4.3.2" },
       "browserslist": "^4.29.5",
       "baseline-browser-mapping": "^2.11.33",
       "minimatch": { "brace-expansion": "^1.1.21" },
       "@typescript-eslint/typescript-estree": {
         "minimatch": { "brace-expansion": "^5.0.12" }
       },
       "satori": { "fflate": "0.7.5" }
     }
   }
   ```

   The `fflate` line is intentionally scoped to Satori and must be tested with
   every image/Open Graph path. Satori's latest metadata still pins 0.7.3, so
   0.7.5 is a compatibility candidate rather than a proven fix.

6. Do not globally override `minimatch` to 11.0.1. The current ESLint 9,
   `@eslint/config-array`, `@eslint/eslintrc`, and the three React/JSX/import
   plugins declare 3.x ranges; TypeScript-ESLint declares a 10.x range. A
   global 11.x override would violate all of those contracts and may change
   glob matching behavior. The remaining minimatch findings require upstream
   dependency-range updates or a fully tested ESLint ecosystem migration.

7. Do not override the Drizzle Kit esbuild chain to 0.28.x. Drizzle Kit
   0.31.11 still routes through `@esbuild-kit/esm-loader` →
   `@esbuild-kit/core-utils` → `esbuild ~0.18.20`; forcing a newer esbuild is
   outside the declared range and has not been compatibility-tested. The npm
   suggestion to install Drizzle Kit 0.18.1 is a major downgrade and is
   rejected. This dev-only chain remains a release HOLD until Drizzle provides
   a supported dependency update or the migration tool is replaced and tested.

## Remaining risk and release gate

The 30-entry result still contains a runtime `fast-uri` high finding and a
development-toolchain cluster around minimatch, ESLint, TypeScript-ESLint,
Drizzle Kit, and Satori/fflate. Runtime reachability of `fast-uri` through the
deployed Worker/request path has not been independently proven, so it must be
treated as reachable until a dependency trace and post-upgrade audit say
otherwise. The Education URL sanitizer is an application-layer control; it
does not clear a vulnerable transitive parser.

The branch is HOLD for dependency readiness until all of the following are
recorded against the final lockfile: a fresh `npm audit --package-lock-only
--json` with no unreviewed critical/high findings, a documented decision for
any remaining moderate/low dev-only issue, clean install, build, TypeScript,
lint, Education/security/unit/browser tests, and a review of the package-lock
diff. No `npm audit fix` or blind override is authorized by this plan.


## Execution update after the plan

The coordinated upgrade and compatible-range refresh completed. npm 10.9.2
regenerated the lockfile after npm 10 CI rejected npm 11 optional-platform
placement. Node 22.13.0 / npm 10.9.2 `ci --dry-run` now exits 0.

Full lockfile audit with `--audit-level=high`: exit 0, 0 critical, 0 high,
0 low and 20 moderate package entries. Production-only audit with
`--omit=dev --audit-level=low`: exit 0, zero reported vulnerabilities.
These are scanner classifications, not proof that every devDependency is
excluded from every production bundle.

Remaining scanner findings originate from minimatch glob amplification and
esbuild's development server through ESLint/Drizzle Kit chains. The existing
lint APIs require old minimatch majors, and the old esbuild loader has no safe
forced major replacement established here. Both consume repository-controlled
build/tool inputs; this app does not expose their tooling endpoints. These
moderate residuals still require independent security/release review.

Satori's installed fflate is scoped to the same-minor 0.7.5 security backport.
The published @vercel/og 1.0.3 JavaScript also embeds fflate 0.7.3 and a Node
ESM/HarfBuzz compatibility defect; dependency overrides cannot rewrite that
embedded code. Source declares no dynamic OG route and a built-Worker marker
scan found no OG/fflate/HarfBuzz matches, which is limited evidence rather than
a reachability proof. The PNG fixture renders the real package in an isolated
Node child with compatibility globals/cwd; this is not a production shim or a
claim that the unconfigured Node API works. Preserve this upstream residual
before adding any OG/font/archive input surface.

Root local build, TypeScript, ESLint and compatibility check passed. The new
three-test fixture passes real PNG headers/body/dimensions, Zod bounds and form
resolver compatibility without weakening existing assertions. Miniflare 5's
official `convertV4MiniflareOptions` preserves the Worker test options. Exact-SHA
Linux CI remains required; Windows workerd still fails at runtime startup.