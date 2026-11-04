# Health remediation and production gate — 2026-11-04

Status: **DEPENDENCY_HOLD / PRODUCTION_READY=NO**.

This increment remediates PR #33 before dependent PR #34 can be integrated. It is not an independent approval, medical/privacy sign-off, Founder approval or deployment authorization.

## Change and source boundary

Starting #33 HEAD: `5771c910f8d1bb507eabf0cc6a529f6f28774217`.
Observed #34 HEAD: `5a0fbc4fcee09bcb58668b0f112d1b4f8e13558c`.
Observed main: `9355d28667ee9cf4761b4abcdaf959f0ad154820`.

Both PRs are open Drafts without submitted reviews in the observed GitHub snapshot. Existing successful CI belongs to their previous heads; the remediation needs its own exact-head CI.

The bilingual cost card no longer compares Shenzhen private-care prices with Hong Kong/UK services. It now asks users to verify dated written estimates, inclusions, exclusions and separate fee categories, without promising savings. This resolves the conflict between the previous content and `HEALTH_V31_COPY_AND_CLAIMS.md` section 6. No comparative evidence has been obtained or approved by this change.

The original six-card structure, section anchors, 14-question Compass, scoring, feature flag, questionnaire and local consultation flow are preserved. No real submission, patient-data storage, API, authorization or database behavior is introduced.

## Required review records

| Gate | Required evidence / reviewer responsibility | Current state |
| --- | --- | --- |
| PR #33 independent review | Independent reviewer approves the actual final diff and SHA in GitHub | EVIDENCE_MISSING |
| PR #33 merge | Authorized maintainer merges the approved dependency; automated task does not merge | NOT_MERGED |
| Medical / content | Designated human reviewer records reviewed claims, official URLs, source dates, applicability and permitted public wording | EVIDENCE_MISSING |
| Provider resources | Provider confirms cooperation, current clinicians/language/rooms/insurance facts and any public permissions | EVIDENCE_MISSING; see resource evidence list |
| Image rights | Human reviewer confirms rights and approves the intended illustrative use; AI scene is never institutional proof | EVIDENCE_MISSING for release sign-off |
| Privacy | Designated privacy reviewer approves the local-only behavior, notices and no-upload boundary; any future submissions require separate consent and server security review | EVIDENCE_MISSING |
| Founder | Explicit approval of the final bilingual content, scope, images and business boundaries | EVIDENCE_MISSING |
| PR #34 integration | Only after approved #33 is merged: base=main, integrate latest main and verify no repeated dependency diff | DEPENDENCY_HOLD |
| PR #34 independent review | Separate actual approval on its final integrated diff | EVIDENCE_MISSING |
| Exact-head CI | Required checks succeed on each final pushed SHA | Required for remediation; prior green checks do not establish this |
| Staging | Approved environment actually serves final SHA; flag ON/OFF and bilingual responsive/SEO matrix pass; noindex remains active | NOT_RUN; no staging release authorized here |
| Operations | Verify actual configuration, observability, rollback artifact and responsible maintainer | EVIDENCE_MISSING |
| Production | All gates above plus explicit deployment authorization; indexing is separately approved | HOLD |

No reviewer's name, approval date or decision is invented. Repository documents describing intended permissions are not approval records.

## Validation obligations

The existing rendered Health landing test keeps its six-card and bilingual checks, with the changed cost title replacing the retired comparative title. New positive assertions require quotation dates and inclusions/exclusions; negative assertions prohibit the retired comparative statements. A pure content-policy test adds the same medical-claim boundary without requiring a Worker runtime. Existing model, route, family, auth and browser tests remain in place.

The first remediation CI completed with ten successful checks, including Health, and four Canonical jobs blocked before database execution by `PR_BASE_UNAVAILABLE`. The Canonical workflow from main `9355d28667ee9cf4761b4abcdaf959f0ad154820` is now included with only its isolated-PostgreSQL candidate checkout changed from depth 2 to full history. Its source-selection guards, pinned reference, 35 migration digests, harness checks and all four actual PostgreSQL scenarios are unchanged. This makes the PR base object available for validation; it does not approve or execute a production migration. The updated commit must pass a fresh CI run.

Original Compass regression and Health flag ON/OFF, landing/family, Education/Identity regressions remain required. After #34 integration, also run GEO and APEC, zh/en × 390/768/1440, preserve existing wider browser coverage, and verify actual noindex/canonical/hreflang/sitemap behavior. An unsupported local Worker runtime must be reported as a failure/limitation, not skipped or represented as PASS; remote Ubuntu CI must run the real Worker suite.

## Safe handoff

Until independent approval and maintainer merge of #33, do not change #34's base, merge main into it or push an integration. Even after all engineering checks pass, missing human evidence keeps the release on HOLD. All previews and staging remain noindex; there are no production, DNS, index or database operations in this increment.
