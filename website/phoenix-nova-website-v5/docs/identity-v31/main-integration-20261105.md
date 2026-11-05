# PR #35 main integration — 2026-11-05

Status: engineering candidate / Draft / Sites HOLD / PRODUCTION_READY=NO.
This is a Codex integration record, not an independent review or Founder sign-off.

## Verified starting refs

- PR: https://github.com/yvettfang-netizen/phoenix/pull/35
- Branch: `codex/identity-v31-cbi-review`.
- Starting PR HEAD: `fabdfdc98c70e8ce1832ea71d9fe6b1795c298da`.
- Main being integrated: `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`.
- Merge-base: `9355d28667ee9cf4761b4abcdaf959f0ad154820`.
- Work uses a new isolated worktree and a normal merge; existing worktrees are preserved.

## Actual conflict decisions

| File | Integration decision |
| --- | --- |
| `app/robots.ts` | Keep main's identical disallow-all implementation. The only conflict was a comment; no crawler permission changes. |
| `package.json` | Keep main's React/RSC 19.3.1, Zod 4.6.7, Vinext 1.4.3, Vite 8.3.5, Wrangler 4.157.0 and npm 10.9.2 baseline. Retain Identity's ExcelJS and existing security overrides, including Babel 7.x and the CJS-compatible archive chain. |
| `package-lock.json` | Seed from main and regenerate with npm 10.9.2 against the combined manifest. Verify clean install, full audit, XLSX parsing, image generation, build and cross-product tests. Do not splice lockfile conflict blocks or downgrade the shared runtime. |
| `worker/index.ts` | Deny original CBI import/publish/rollback paths before host routing or body parsing; retain a post-routing guard. Keep main's exact-host Wealth routing, image handling and server-derived Health locale. Preserve Identity noindex/no-store/nosniff/no-referrer responses. |

## Non-textual regression found and fixed

Identity's additional `app/sitemap.ts` shadowed main's explicit
`app/sitemap.xml/route.ts`. The generated response was empty but lost the
explicit route's `X-Robots-Tag: noindex` and `Cache-Control: no-store` headers.
The unchanged Education readiness browser test caught this integration failure.

Remove only that redundant Identity metadata entry and reuse main's empty,
closed sitemap index. Keep the Education assertion intact; add corresponding
checks to the actual Worker and CBI GEO browser tests. No indexing switch opens.

The CBI workflow now uses main's asynchronous TypeScript test loader so its
full test discovery includes the inherited Wealth TypeScript regressions on
the supported Node versions. No tests or required checks are removed.

The inherited homepage browser assertion still accepted only obsolete local
Wealth destinations. It now requires the exact locale-specific
`https://wealth.phoenixnova.com.cn/{locale}` destination already implemented by
main. The homepage component is unchanged, and the CBI workflow also runs this
22-check homepage regression.

## Local engineering evidence

- `npm ci` with npm 10.9.2: passed.
- Full dependency audit including development/optional dependencies: zero findings at every severity.
- Typecheck and build: passed. Lint: zero errors, two existing customer-component warnings.
- `npm test`: 149 passed, zero failed, four conditional HTTP tests skipped without their servers. Those four tests were separately run with dedicated Wealth/main rehearsal servers: four passed, zero skipped.
- Real Workers tests cover 132 denied import/publication/rollback requests across Identity and Wealth hosts, unchanged test database tables, both Identity locales, Wealth routing, forged Health hints and the closed root sitemap.
- Identity landing and all five CBI browser scripts passed. Health Landing/Family passed with the flag off and on; Health GEO passed 205 checks and APEC passed six locale/viewport checks.
- Main homepage: 22 passed. Education landing: 16 passed; knowledge: 148 passed; readiness: 75 passed after the sitemap fix. The strengthened CBI GEO and import-denial browser checks also passed again on the final build.
- Exact pushed-HEAD Actions results belong in the delivery evidence. Local adapters and disposable Worker tests are not Staging or production evidence.

## Release boundary

Country records, verification dates, `IMPORT_REVIEW`, empty public catalogue,
disabled import constant and reviewer allowlists are unchanged. No source-owner,
legal, security, independent review or Founder approval is inferred.
Missing human, Canonical adapter, staff authorization and actual Staging evidence
remain `EVIDENCE_MISSING`; release remains HOLD.

No PR merge, Ready transition, Sites save/deploy, DNS or indexing change,
production configuration change, database migration or production-data action
is part of this integration.
