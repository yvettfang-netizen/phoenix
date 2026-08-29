# Education Compass × ASKWISE / 鳌鱼 E2E Acceptance

**Audit date:** 2026-08-29

**Canonical repository:** `yvettfang-netizen/phoenix`

**Canonical path:** `Phoenix Compass/education compass`

**Branch:** `codex/weekend-engineering-closeout-2026-08-29`

**Base:** `955a5cf169125dc4d864969edc022e5a50ea3bc2` (`origin/main`)

**Verdict:** `PASS_WITH_EXTERNAL_BLOCKERS` — local contracts, HTTP flow, privacy, entitlement, and reserved ASKWISE handoff pass; a real PostgreSQL migration and external CRM/ASKWISE calls were deliberately not run.

## Canonical-codebase decision

Education Compass is not an independent Git repository. Its only canonical source is the path above inside `yvettfang-netizen/phoenix`. The similarly named path under `D:\CODEX\01_PHOENIX_NOVA\wc-recovery` is another Git worktree of the same repository, not a second codebase.

The root manifest currently describes the WeChat mini-program while a dormant Next.js `src/` subtree and `pnpm-lock.yaml` remain in the same folder. This manifest/runtime drift is `NEEDS_REVIEW`; it was not resolved by deleting uncertain source.

## Frozen-capability review

| Capability | Result | Evidence |
|---|---|---|
| Question Bank | PASS | V1.0 base and V1.1 copy overlay are SHA-256 pinned; 23-field cross-layer contract and all seven L2 routes pass |
| Six-dimension / six-output model | PASS AS FROZEN | L2 produces six traceable discovery outputs; the frozen V1.1 contract deliberately emits no score |
| Scoring rules | PASS AS `NONE` | Tests enforce `scoringMode: NONE`, UNKNOWN preservation, and prohibited-conclusion boundaries; no numerical rule was invented |
| Consent | PASS | Active guardian grants are reusable; withdrawal fences draft/result/submit; prepay rechecks consent |
| Sensitive-field boundary | PASS | PII/raw answers/internal IDs are excluded from Agent/ASKWISE payloads; Feishu uses opt-in allowlists and pseudonyms |
| Persona/UAT coverage | PASS AS FIXTURE | Frozen persona/UAT contract exists; the executable smoke covers GAOKAO, DSE, and A_LEVEL synthetic students |
| `student_id` | PASS | Three unique server-owned IDs; remote client keeps an explicit local-to-server mapping |
| Service entitlement | PASS | Exactly one matching Growth Discovery entitlement per paid synthetic student; replay does not duplicate |
| Result | PASS | Level 1 routing and locked/unlocked Level 2 result states are server-authoritative |
| Growth Blueprint | GAP | The implemented artifact is the six-output Growth Discovery result; no exact `Growth Blueprint` domain artifact exists |
| CRM/storage write | PARTIAL | Phoenix store contract passes; optional Feishu mirror is tested and fail-closed, but no external CRM was called |
| ASKWISE / 鳌鱼 | PASS AS RESERVED | Validated RESERVED DTO; `network_enabled: false`; no external behavior or data ownership is created |

## Three-student E2E evidence

Command: `npm run smoke:education`

Mode: `LOCAL_HTTP_MOCK`; external calls: `0`.

| Stage | Evidence |
|---|---|
| Test students | 3 synthetic, 3 unique `student_id` values |
| Questionnaire / assessment | 6 assessments total: one Level 1 and one Level 2 per student |
| Consent | 6 active consent grants total |
| Level 1 scoring/result | Four frozen routes are evaluated; no numeric score is generated |
| Pre-payment lock | Each Level 2 result remains locked with no content leakage |
| Mock payment | Server-authoritative callback exercised; the success callback is replayed to prove idempotency |
| Entitlement | 3 entitlements total after replay, exactly one per student |
| Growth result | Six discovery outputs become readable only after the authoritative payment/entitlement gate |
| CRM/storage | 3 students and 3 transaction events in the isolated store; no external mirror call |
| ASKWISE handoff | 3 validated RESERVED handoffs; external network disabled |

Final structured result:

```json
{
  "status": "PASS",
  "mode": "LOCAL_HTTP_MOCK",
  "externalCalls": 0,
  "syntheticStudents": 3,
  "uniqueStudentIds": 3,
  "reservedAskwiseHandoffs": 3,
  "counts": {
    "students": 3,
    "assessments": 6,
    "activeConsents": 6,
    "entitlements": 3,
    "transactionEvents": 3
  }
}
```

## P0 verification

| Check | Result | Evidence |
|---|---|---|
| Install | PASS | Root lock install and server lock install completed; server audit reported 0 vulnerabilities |
| Release build | PASS | `OFFLINE_TEST_ONLY` artifact created; 1,628,577 / 1,835,008 bytes |
| Server build | PASS | TypeScript compile completed during P0 and smoke runs |
| Server typecheck | PASS | `tsc --noEmit` |
| Client validation | PASS | All domain, structure, privacy, UI, safe-area, payment, and release checks passed |
| Server test | PASS | 87/87 |
| Docs/contracts | PASS | 30 OpenAPI operations, 10 valid examples, 4 intentionally invalid examples |
| Secret scan | PASS | 0 findings |
| E2E smoke | PASS | Three-student evidence above |
| Root lint | BLOCKED_NOT_DEFINED | Root `package.json` has no `lint` script |
| PostgreSQL migration/E2E | BLOCKED_EXTERNAL | `EDUCATION_TEST_DATABASE_URL` is not configured; no database connection was attempted |

The complete `npm run test:p0` command exited 0 because the PostgreSQL probe reports an explicit structured external blocker instead of touching an unknown database.

## Cross-platform hardening in this branch

- Frozen JSON registry hashes now canonicalize CRLF to LF before verification.
- UI contract hash checks use the same canonical byte representation.
- Migration checksum verification accepts legacy LF/CRLF byte forms while storing the canonical LF checksum.
- The migration-baseline test canonicalizes line endings, preserving immutable migration semantics across Windows and Linux.
- The local smoke was expanded from one synthetic student to three and now proves unique IDs and replay-safe entitlements.
- 57 previously tracked `.npm-cache` entries are removed from Git; `.npm-cache/` is now ignored. No local cache is uploaded.

## Required control conclusions

1. **Unique `student_id` source:** PASS in the isolated server store; no duplicate ID or secondary client master was observed.
2. **Duplicate writes:** PASS for payment replay and entitlement creation; 3 replays still produce 3 entitlements and 3 transaction events.
3. **Entitlement generation:** PASS; paid content requires the matching Growth Discovery SKU and active consent.
4. **Consent:** PASS; grant, reuse, withdrawal, and post-payment withdrawal/refund-review paths are covered.
5. **Sensitive data placement:** PASS in tested boundaries; ASKWISE/Agent serializers exclude PII, free text, raw answers, and internal IDs.
6. **ASKWISE scope:** PASS AS RESERVED; it is a validated reference only, with networking disabled.
7. **Fake-data isolation:** PASS; release validation excludes demo generators, local DB, admin-demo pages, server source, and tourist AppID.

## Jimson PR verification

- PR: `yvettfang-netizen/phoenix#1`, title `jimson的拉取请求`.
- Author: `Jimson614`.
- Head: `main` at `f5ea73721befe89a5e550b63b964adf137d5e5bf`.
- State: `MERGED` on 2026-08-28 10:03:59 UTC.
- Merge commit on Phoenix `main`: `955a5cf169125dc4d864969edc022e5a50ea3bc2`.
- Conclusion: the PR is real, is in the correct `phoenix` repository, and was merged. It was not merely a local branch and was not missing.

## Remaining blockers and review items

1. Provision a dedicated, disposable `EDUCATION_TEST_DATABASE_URL`; then run migrations and PostgreSQL E2E. Do not use production.
2. Define a root lint command or explicitly document that only the existing structural/client validators and server TypeScript checks are authoritative.
3. Resolve the mixed mini-program/Next manifest and lockfile provenance without deleting dormant source.
4. Decide whether `Growth Blueprint` is a required new artifact or an approved name for the existing Growth Discovery result; this report does not change the frozen domain.
5. Connect a non-production CRM/Feishu environment only after credentials and permission boundaries are supplied; external CRM success is not claimed here.

