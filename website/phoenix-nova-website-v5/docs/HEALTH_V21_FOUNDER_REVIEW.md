# Health V2.1 — Founder review

Task: `XUANWU-HEALTH-FOUNDER-REVIEW-V21`, including the subsequent official Footer instruction. Branch: `feature/phoenix-health-landing-v1`. Draft PR: https://github.com/yvettfang-netizen/phoenix/pull/29. Recovery baseline: `b90bd3580f7487e73388fa0817f2d61a97c0621c`; approved main base remains `2e00b2c83bf54d5699fa3326d159448fda8afc0c`.

## Recovery and scope

The isolated Health worktree was clean before V2.1. The main local checkout's unrelated uncommitted work was left untouched. V2 Hero scenery, headline, dual entries, four values, five services, three life stages and all questionnaire source/rules remain in place. No reset, clean, branch deletion, authentication change, database migration or production action was performed. PRs #6, #12, #13 and brand PR #30 remain separate.

Changes are limited to the shared navigation and Footer, Health service photos, six-step service journey, overseas/Hong Kong insurance explanations, consultation preparation UI and associated tests/evidence. The assessment route shell receives only a Footer text colour correction for readability on the new light shared surface. The 14-question implementation, options, six-dimensional text rules, consent, skip/edit/export and server gate are unchanged.

| Module | Recovery finding | V2.1 outcome / next gate |
| --- | --- | --- |
| Header / Logo | V2 already used approved horizontal source; older navigation | Seven approved destinations; same immutable transparent source; visual review |
| Health Hero | Complete at recovery baseline | Preserved; before/after captures |
| Service cards | Complete, four photos mismatched | Four sourced replacement photographs; Founder image review |
| Family planning | Complete bilingual page and three life stages | Retained; regression checks |
| Dual entries / assessment | Existing shared 14-question gated assessment | Unchanged rules; service consultation remains independent |
| Footer / mobile | White-backed primary logo on dark Footer | Transparent horizontal on warm ivory, 210/165 px; actual screenshots |

## Review points

- Header and Footer navigation: Home, Education, Identity, Finance, Health, About Us, Insights; locale and Family Center remain. Education/Identity/Finance target existing `/{locale}/compass#education`, `#identity`, `#wealth`; no nonexistent business pages are invented. Existing Oriental and Digital World content/routes remain.
- Six numbered, keyboard-operable disclosure steps appear directly after services and before Why Phoenix. Clinical decisions and insurer decisions are distinguished from non-clinical coordination.
- UK is an example of an overseas market. Overseas-to-China coordination and Hong Kong insurance coordination have independent voluntary consultation entries. No questionnaire is required for service information or consultation preparation.
- Fees, third-party charges, cancellation/refund terms and confirmation responsibilities are explained. The enquiry channel remains a truthful local preparation demo; it neither books nor claims a successful submission.
- Gate-off Compass offers service and consultation-preparation links without an assessment URL. Gate-on uses the original controlled bilingual routes. No production switch is changed.
- The four replacement service photographs have official source and licence records in `HEALTH_IMAGE_CREDITS.md`. A doctor/mother/child photo is a communication illustration, not evidence of an actual interpreting service or partnership.

## Official Logo / Footer

Immutable master: `public/brand/official/v3/phoenix-nova-primary-original.png`, 1254 × 1254.

SHA-256: `A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E`.

Header and Footer: `public/brand/official/v3/phoenix-nova-header@2x.png`, 1040 × 320 RGBA.

SHA-256: `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA`.

The already approved transparent raster is reused byte-for-byte; no asset was regenerated, redrawn, recoloured or overwritten. Shared Footer uses warm ivory `#F8F6F1`, transparent unframed image/wrapper, 210 CSS px desktop / 165 CSS px mobile, proportional contain display and surrounding space. There is no reliable vector source. No invented SVG, dark adaptation or favicon is enabled. Existing pale edge limitations restrict the asset to the accepted light-background use. The later instruction and prior acceptance are recorded in `public/brand/official/v3/APPROVAL.md`.

## Future Core handoff — design only

The following three dimensions must remain separate:

| Dimension | Meaning | V2.1 behaviour |
| --- | --- | --- |
| `referral_source` | Where an introduction originated, e.g. UK, another overseas channel or Hong Kong | Optional browser state only |
| `client_region` | Where the client is currently located | Optional independent browser state only |
| `insurance_channel` | The insurance coordination channel, if relevant | Optional independent browser state only |

None is inferred from either of the others; all may be blank. Changing a choice clears the prepared checklist. Clear resets all fields; reload clears state. There are no requests, URL propagation, cookies, local/session storage or telemetry from this interaction. No patient, policy, document, diagnosis or contact fields are added. Questionnaire answers are never read or transferred.

The preparation submit button is disabled in server HTML and when JavaScript is unavailable. It becomes available only after the local React handler is attached, preventing native pre-hydration GET submission of the optional fields. A no-script notice explains the local demo. This protection also applies to the family preparation entry.

An eventual explicitly authorised enquiry must resolve existing canonical client, family, member and service-project IDs through the current Core authority, following the design in `HEALTH_LANDING_V1.md`. Hong Kong insurance clients do not create a separate identity registry, nor does a UK source create UK-specific master data. No ID assignment, schema change, database association, CRM/Family OS ingestion or backend endpoint is implemented here. Raw medical records must stay out of ordinary CRM/Family Timeline. Future handling still requires separate patient-level consent, server permissions, PostgreSQL RLS, audited controlled storage and retention rules.

## Validation and preview

Local preview: http://127.0.0.1:4390/zh/health and http://127.0.0.1:4390/en/health. This is a frontend-only Node adapter with an empty Cloudflare environment and no database. Native Windows workerd remains incompatible on this machine; actual Worker regressions are checked separately in Ubuntu CI for the submitted head. Gate-on 4391 is a local test fixture, not an approved public preview.

Before/after and full-page bilingual desktop/mobile captures are under `docs/previews/health-v21/`. A checkerboard/ivory proof shows the same transparent PNG; actual Footer captures show the unmodified page. Viewport browser testing is synthetic and does not certify physical iOS/Android/WeChat devices. CI results and exact head are recorded in the final delivery after execution.

Founder visual acceptance and technical review remain pending. Do not merge main or deploy production from this review package.

## Executed local checks

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Production bundle build | PASS | `outputs/health-v21/build.log`; frontend bundle only |
| TypeScript | PASS | No type errors |
| ESLint | PASS with one pre-existing warning | Unused `Bell` import in `customer-center.tsx`; zero errors |
| Immutable Logo and all 13 asset records | 58 PASS | Existing source/alpha/dimension/RGB verifier; no asset bytes changed |
| Original questionnaire model | 8 PASS | `outputs/health-v21/model.log`; original text/rule locks retained |
| Health landing browser, gate off / on | 42 / 43 PASS | `outputs/health-v21/landing-off`, `landing-on`; includes native-submission protection without JavaScript |
| Family page browser, gate off / on | 13 / 13 PASS | `outputs/health-v21/family-off`, `family-on` |
| Responsive / interaction | PASS | Both languages; 320, 375, 390, 768, 1024, 1440 px; six native steps desktop/mobile, seven real nav links, Footer dimensions, no overflow, no entry interception, independent local consultation fields |
| Visual review evidence | Captured and inspected | Full pages, before/after, actual Footer, real-alpha proof in the preview folder |

Actual Worker installation/build/full test/browser results must correspond to the submitted head in GitHub Actions. The local Node checks above do not substitute for that runtime evidence.

## Changed file inventory (V2.1 relative to recovery baseline)

- `app/globals.css`: shared Footer surface, logo size and unframed transparent wrapper.
- `app/[locale]/compass/health/page.tsx`: Footer text colour only.
- `components/brand-mark.tsx`: common approved horizontal image.
- `components/v5-site.tsx`: seven shared navigation destinations and Footer.
- `components/health-landing.tsx`: journey, overseas/HK explanations, FAQ/fees and gate-off alternatives.
- `components/health-landing.module.css`: responsive new sections, replacement photo references, removed dark Footer override.
- `components/health-consultation.tsx`: voluntary service choices and three independent temporary context fields.
- `public/images/health-v21-{communication,navigation,concierge,claims}.jpg`: four licensed replacement photos.
- `public/brand/official/v3/APPROVAL.md`: later Founder Footer instruction; no PNG changes.
- `tests/brand-integrity.mjs`, `tests/health-landing-browser.mjs`, `tests/health-landing.test.mjs`: provenance, route, flow, Footer and privacy regression checks.
- `docs/HEALTH_IMAGE_CREDITS.md`, `docs/OFFICIAL_LOGO_ASSET.md`, this document and `docs/previews/health-v21/`: provenance and review evidence.
