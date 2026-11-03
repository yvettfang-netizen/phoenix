# Health Compass × Website V5 — candidate integration

Founder request, 2026-09-06: “接入 V5 并验证”. This authorises the previously supplied navigation-only prototype's V5 candidate integration, not a medical service, production deployment or Family OS ingest.

## Baseline and scope

- Repository: yvettfang-netizen/phoenix
- Baseline PR #6: 02859e6427de31a4feedac158d23a36cf56625bc
- Isolated branch: codex/v5-health-compass-integration-20260906
- This is stacked on the PR #6 branch, not a replacement for it or the later Founder-approved V5 direction. Do not deploy the older V5 portal solely because this additive change passes.
- Only V5 Health source, two additive route-entry changes, tests and a read-only CI workflow are included.
- No changes to official logo files, Identity/Wealth/Education questions, Oriental, Digital World, Core, Family OS, databases, auth, DNS, payments, service entitlements or production configuration.
- HEALTH stays RESERVED in the Family OS/Core ingest contracts. No handoff is implemented.

## Native routes and controlled preview

`/zh/compass/health` and `/en/compass/health` are native V5 pages. `/compass/health` redirects to the Chinese route. `/health` is NOT used; existing backend probes are separate.

Server-side `HEALTH_COMPASS_PREVIEW` defaults off. Only the exact value `1` enables the route and the additive candidate entry on the localized homepage and Compass index. Disabled means no entry and direct routes return 404. This is not authentication: enable only on an approved access-controlled candidate. Noindex is not an access-control mechanism.

The existing V5 homepage is intentionally not redesigned. The additive entry can be moved into the future approved four-Compass card component in the V5 visual update without changing the Health contract. Official BrandMark and existing site header/footer/button styles are reused; Health-specific styles use a scoped CSS module.

## Preserved product contract

The source is the supplied Health_Compass_V1_Design_Handoff.zip, not a new medical assessment. Chinese question IDs, wording, hints, option values and option labels are locked by canonical SHA-256 `df3c795277e63e972926da0bf6ec9aa0418cb7a65c164b180e8bdbf1882ada3d`.

14 questions, all skippable; adult boundary; review/edit; six textual arrangement statuses; up to three user-selected actions in selection order; local text export and manual-copy fallback; explicit clear; refresh/navigation resets. English translations are added without changing the rules.

No medical score, eligibility determination, diagnosis, treatment, insurance recommendation, personal data upload, booking or professional advice. Context answers alone cannot generate personalised results.

## Privacy and browser behaviour

Answers are component-local state only. No storage, cookies, URL parameters, API calls, analytics events, external model calls, CRM/Notion/Feishu writeback or Family Center save. Export includes only selected generic actions, not raw responses. Clear is confirmed. Download initiation is never described as a confirmed saved file. Page restoration clears the session.

The baseline root layout was inspected and contains no analytics provider. Full target-host third-party scripts/logging, legal/privacy approval and real device testing remain release gates; source inspection does not prove production privacy compliance.

## Verification

- `node --test tests/health-model.test.mjs`: 8 tests; includes all 36 two-answer rule combinations and original wording hash.
- Existing `npm test`: builds the actual worker, then runs original V5 regression plus Health model and route gates.
- `npm run typecheck` and `npm run lint`.
- `python tests/health-browser.py`: synthetic Chromium flow through actual built V5 worker on 127.0.0.1, homepage entry, hydration, back/edit, all-skipped, cap, export/fallback, no answer-time requests/storage, refresh, 320/375/390/768/1440 widths and EN route.
- The dedicated workflow checks out the exact PR head SHA; artifacts retain the SHA, results and lightweight screenshots for 14 days.
- Browser automation is not physical iOS, Android or WeChat acceptance. Failed or unexecuted checks must not be labelled PASS.

## Rollback and remaining release gates

Before merge, leave the default switch off or close the Draft PR. No main or production change is included. For a future approved deployment, disable `HEALTH_COMPASS_PREVIEW` on the candidate/release environment and verify both entry absence and direct-route 404; restart/rebuild as required by the target runtime. Revert the isolated integration commit through review if removal is required. No database rollback exists because no data schema or persistence was introduced.

Jimson must bind the final V5 release SHA and approved test host, check the combined site's actual domain/HTTPS/ICP and access control, run iOS/Android/WeChat full-flow and download fallback, review scripts/logs, and provide rollback evidence. Founder review of final visual/wording and release is separate. Do not merge, deploy, invent an ICP number or mark real-device tests passed from Chromium evidence.
