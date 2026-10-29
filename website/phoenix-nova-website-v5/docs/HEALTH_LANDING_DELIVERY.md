# Health landing V1 — delivery evidence

Task PHOENIX-HEALTH-WEB-20261029. Work performed 2026-10-29–30, Asia/Shanghai.

## Candidate and scope

- Base: main `2e00b2c83bf54d5699fa3326d159448fda8afc0c`.
- Branch: `feature/phoenix-health-landing-v1`.
- Isolated local worktree: `_Worktrees/health-landing-v1` (relative to the original local repository).
- Frontend candidate only. No merge, production deployment, switch activation, database migration or patient information.
- PRs #6/#12/#13 remain untouched. Existing uncommitted work in the original checkout was preserved.

## Delivered files

- `app/[locale]/health/page.tsx`: bilingual route and metadata.
- `app/[locale]/health/family/page.tsx`, `components/health-family.tsx`, `health-family.module.css`: family planning entry and integrated support route, added under Founder dual-goal V1.1 steering.
- `components/health-landing.tsx`, `health-landing.module.css`: eight content sections, responsive visual design and controlled questionnaire entry.
- `components/health-consultation.tsx`: truthful state-only consultation checklist demonstration.
- `components/v5-site.tsx`: reuse Footer export, preserve language switching on the new route, add home/footer/Health Compass service links.
- `public/images/health-{lounge,planning,language,navigation,concierge,claims}.jpg`: locally served illustrative stock assets.
- `scripts/health-node-preview.mjs`: explicitly limited Node frontend preview fallback for this Windows host.
- `tests/health-landing.test.mjs`: real Worker route/metadata/navigation/gate regression.
- `tests/health-landing-browser.mjs`: bilingual viewport, consultation and questionnaire-entry checks with screenshots.
- `tests/health-family.test.mjs`, `tests/health-family-browser.mjs`: six-direction family entry, three homepage goals, voluntary independent consultations and both gate states.
- `components/health-compass.tsx`: one optional result-stage navigation aside; the original 14 questions, model and privacy mechanisms are preserved. See HEALTH_DUAL_GOAL_V1_1.md.
- `.github/workflows/health-compass-validation.yml`: run new browser checks in both gate states after the unchanged original browser suite.
- This report, `HEALTH_LANDING_V1.md` and `HEALTH_IMAGE_CREDITS.md`: scope, future Core design, rollback, source credits and verification limits.

## Local evidence

| Check | Result / limit |
| --- | --- |
| Locked dependency install | PASS, npm ci; package.json and package-lock unchanged. Initial Next tarball stalled; bounded cached retry succeeded. |
| TypeScript | PASS, direct project tsc --noEmit. |
| ESLint | PASS, 0 errors; 1 existing unused Bell warning in customer-center.tsx. |
| Vinext build | PASS, new dynamic /:locale/health route discovered. Windows direct CLI used because repository wrapper requires Linux tools. |
| Original Health model | PASS, 8 tests including canonical question hash, 36 combinations, action limits and export/privacy boundaries. |
| Family demo regression | PASS, 4 tests. |
| Native Windows Worker full suite | BLOCKED/FAILED runtime start: workerd structured exception 0xc0000005 / Miniflare ERR_RUNTIME_FAILURE. Reproduced outside restricted execution. The suite was terminated after hanging; not labelled PASS. |
| Local frontend browser QA, gate off | PASS, 17 checks on final built frontend; two locales, 320/375/390/768/1024/1440px, metadata, no horizontal overflow/header overlap, truthful consultation, no interaction requests/storage, refresh reset, FAQ/mobile navigation/language links. |
| Local frontend browser QA, gate on | PASS, 18 checks including landing → original questionnaire, adult acknowledgment, back/edit, skips, no context-only invented result and no answer requests/storage. |
| Actual physical iOS/Android/WeChat | NOT RUN. Synthetic Edge viewport checks are not physical-device acceptance. |

Local frontend browser evidence uses the built application through the limited Node adapter with an empty Cloudflare binding and no D1. It does not prove Worker/D1 or authentication runtime behavior. The existing real Worker tests and original Python Health browser suite are retained for Ubuntu CI on the exact PR commit.

An initial answer-time request assertion caught delayed official-logo loading. The test was corrected to wait for header image decoding before monitoring questionnaire interactions; it still requires zero requests during answering. No product privacy assertion was removed. Initial missing-image screenshots were superseded after all six assets were added and the site rebuilt.

## Local preview

Default-off frontend candidate: `http://127.0.0.1:4390/zh/health` and `http://127.0.0.1:4390/en/health` on this laptop only.

Family planning: `http://127.0.0.1:4390/zh/health/family` and `http://127.0.0.1:4390/en/health/family`. All three homepage goals share the existing Compass; international services and consultations do not require its completion.

If the local process has stopped, open PowerShell in the website directory, use Node >=22.15 (this session used 24.19), then run:

```powershell
node node_modules/vinext/dist/cli.js build
$env:HEALTH_TEST_PORT = '4390'
Remove-Item Env:HEALTH_COMPASS_PREVIEW -ErrorAction SilentlyContinue
node scripts/health-node-preview.mjs
```

The fallback binds loopback and rejects non-GET/API requests. Use it for frontend visual acceptance only. Do not connect customer data or treat its empty bindings as a deployable configuration. The separate real Worker adapter remains `scripts/health-preview-server.mjs`; normal Linux build/test scripts are unchanged.

Local screenshots/results are in ignored `outputs/health-landing/` (default off) and `outputs/health-landing-on/`. Each has zh/en desktop 1440, tablet 768 and mobile 390 PNGs plus browser-results.json. CI artifacts additionally retain Worker preview logs, original questionnaire screenshots and the new landing screenshots for 14 days.

## Xuanwu review and Founder acceptance

Technical status: frontend candidate ready for review, with real Worker CI evidence required separately. Founder visual/wording acceptance pending. Formal consultation integration is intentionally absent. Both routes retain candidate noindex; release metadata needs an approved absolute origin. Core lead/service ID contracts, sensitive-data authorisation, server permissions, PostgreSQL RLS and audit/retention remain future gates, not implemented capabilities.

No independent Xuanwu human review or physical-device approval is claimed. See the PR checks for exact remote execution status; local success is not remote or production readiness.
