# Health V6 validation — 2026-11-05
Scope: local candidate and CI evidence only. Production / Sites / backend writes: HOLD.

## Reproducible local evidence
- Clean isolated worktree D:/hV6 from main 9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc.
- npm ci --no-audit --no-fund: PASS, 638 locked packages installed. No dependency/lockfile change.
- npm run typecheck: PASS after final UI changes and during preparatory engineering review.
- node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern work: PASS (0 errors; 2 existing unrelated warnings in customer-account/customer-center).
- Git Bash scripts/build-verified.sh: PASS on Windows/Node 24.19.0, including the inherited PR53 source correction. Existing Vinext sourcemap/config warnings remain.
- node --import ./tests/register-typescript.mjs --test tests/health-model.test.mjs tests/health-claims.test.mjs tests/health-integration-contract.test.mjs tests/health-geo-content.test.mjs: PASS, 22 tests, 0 skipped.
- Full Miniflare route-unit execution on this Windows host: BLOCKED by native runtime access violation/stack overflow before assertions. No tests removed or disabled. Ubuntu CI runs the complete npm test suite.
- tests/health-v6-browser.mjs on existing scripts/wealth-node-preview.mjs with synthetic example.com Host on loopback: PASS, both locales x 320/390/768/1440 x HEALTH_COMPASS_PREVIEW 0/1 = 16 scenarios. Native Workers/Cloudflare environment is NOT established by this Node rehearsal. Evidence: previews/health-v6/browser-off.json and browser-on.json.
- Browser coverage: no horizontal overflow, noindex, 11 brand choices and four specialties, all UNVERIFIED, no initial inferred insurer, reset, no non-GET/external requests from interactions, no file inputs, specialty keyboard ArrowRight/End/Home, 12 FAQ items and open/close, controlled Compass link state.
- Source/asset integrity: previews/health-v6/integrity.json; LF-normalized source and raw image equality against base. Existing Health CSS is preserved and the launch-values styles are appended.
- Preparatory engineering review: no source blocker identified. This agent review is not a human, medical/privacy, Founder or GitHub APPROVED review.

## Preview files
Flag OFF; local Node frontend rehearsal, not deployed Sites:
- [Chinese desktop](previews/health-v6/zh-1440-full.png)
- [Chinese mobile](previews/health-v6/zh-390-full.png)
- [English desktop](previews/health-v6/en-1440-full.png)
- [English mobile](previews/health-v6/en-390-full.png)
- APEC crops: zh/en at 390 and 1440 with -apec.png suffix.
- Hero crops: zh/en at 390 and 1440 with -hero.png suffix.
Visual inspection: desktop English and mobile Chinese APEC modules checked for readable flow, disclosure and responsive stacking. No full visual/brand approval is claimed.

## Remote validation
Health workflow retains full build/typecheck/lint/unit, Health landing and family, GEO, APEC, Compass, both flags, Wealth regression and adds V6 browser tests. Website, Education, Identity and Canonical workflows remain enabled. Final-head remote CI status must be read from the new PR and reported separately; prior PR50 green checks do not certify this branch.

## Known gaps
- Staging browser E2E: NOT VERIFIED; no Sites save/deploy.
- Real CRM integration / PostgreSQL patient authorization, RLS and cross-role isolation: NOT VERIFIED. Existing side-effect-free contract denial tests pass, but no real DB test or production connection occurred.
- Provider facts, medical review, image rights, multi-region privacy/legal review, independent review and Founder final acceptance: EVIDENCE_MISSING / HOLD.
- Real appointments, claims, consent grants, payments, patient files and operational status writes: disabled; no success is simulated.

## Reused safety correction
Open PR53 remains untouched. Its Health-only five-file patch from edb5a3a7342f7e48373beb25dfdaa9ab5fe1515a is incorporated in this candidate: current registration source, corrected clinical/insurance decision responsibilities, source register, remediation note and regressions. The official Shenzhen authority page lists the 2024 rules as current and Article 44 repeals the 2020 version (https://wjw.sz.gov.cn/gkmlpt/content/11/11667/mpost_11667974.html). Insurance Authority guidance assigns final claim decisions to insurers (https://www.ia.org.hk/en/medical_insurance/tips_on_making_claims.html). These references are not provider verification or human approval.

