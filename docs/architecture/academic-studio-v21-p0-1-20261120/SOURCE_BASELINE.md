# P0.1 Source Baseline — Post PR #88

**Captured:** 2026-11-20 (Asia/Shanghai)  
**Repository:** `yvettfang-netizen/phoenix`

## 1. Current main

| Item | Verified value |
|---|---|
| Current `main` | `5b7777e1e4b407393c77095a33a80dcfee68c2e1` |
| PR #68 | Merged — old parallel DB persistence code retirement |
| PR #88 | Merged — remaining Education UAT/PM2/systemd and DB operations scripts retired |
| Canonical formal migrations | 37 files, `0001_foundation.sql` through `0037_scoped_public_id_projection_read_audit.sql` |
| Formal history modified by PR #88 | None |
| Legacy database data migration | Not required by Founder |
| Physical remote resource cleanup | Separate manual task; no physical deletion is inferred from code merge |

## 2. PR #77 / 0042

| Item | Current evidence |
|---|---|
| PR #77 HEAD | `de42fbc2b7fcac2e611d25dd9b750c09db6fb28e` |
| Candidate SQL | `database/canonical/forward-candidates/workspace-authorization/0042_organization_workspace_authorization.sql` |
| SQL Git blob SHA | `15c00b1ae38e2e1ab90a0cc4037415871ff88e25` |
| Exact-head CI | 21/21 passed at captured check run |
| PR state | Draft / not merged |

The latest candidate uses Headquarters/Channel organization profiles, organization memberships, workspace role bindings and a persistent `auth.workspace_sessions` lifecycle. It reuses the existing `auth.context_exchange_tickets` and `auth.session_contexts`; it does not create duplicate context-ticket or backend-context tables.

**Academic Studio disposition remains HOLD / no dependency.** The current Founder teaching model does not require regional teaching organizations or a persistent workspace-session subsystem. Passing CI proves only the candidate's tested behavior; it does not approve the product model or authorize installation.

## 3. PR #83 P0 package

PR #83 remains a separate Draft design package and is based on an older main SHA. Its six-page previews and P0 materials remain design evidence, not production code. This P0.1 package is based directly on the post-PR #88 main commit above so that new design work does not inherit the stale baseline.

## 4. Canonical source fingerprints

Git blob SHAs below identify the exact current-main file versions; they are not presented as SHA-256 hashes.

| Source | Git blob SHA | Relevant capability |
|---|---|---|
| `database/canonical/migrations/0003_core_consent_access.sql` | `910b2f658ffc9e6d01f2064dd836c38bc91d7e73` | Person, Student Profile, Family, membership, guardian authority, Principal, consent |
| `database/canonical/migrations/0007_security_boundary_fixes.sql` | `4d3fc1607aa2d5509aae32bde676fc22f9202dc3` | backend PID + backend_start context, one-use context ticket, validation, bind/redeem/clear |
| `database/canonical/migrations/0012_service_principal_and_context.sql` | `76c71a750b1964c6ab3e682fb51f4581d7bcefd4` | single Principal-kind/channel validation, family context constraints |
| `database/canonical/migrations/0019_education_master_and_records.sql` | `6c4fa48bec57d02ae9766b3636fe6ba7999a3de4` | academic_record, score_record, language_test, evidence and append-only rules |
| `database/canonical/migrations/0022_learning_core.sql` | `bc9ca7db0f23ffdd9d8887451e5e0e07eff11ac9` | course, class, enrollment, teacher, assignment, timetable, attendance, reports, forced RLS |
| `database/canonical/migrations/0023_application_family_context_resolver.sql` | `d1d474ad7104c78c497acacf633885d8ca8654e6` | application Family → Canonical Family context resolver |
| `database/canonical/migrations/0037_scoped_public_id_projection_read_audit.sql` | `5eaeced372d75699d3b3322625f7fb9da31216a8` | Family / student summary projections and access audit |

## 5. Current application integration evidence

| Source | Git blob SHA | Verified limitation |
|---|---|---|
| `Phoenix Compass/education compass/server/src/index.ts` | `42ce4860734505e9cb4e70177f72988f032afbc2` | Production or DATABASE_URL startup is deliberately rejected; it uses an InMemoryStore only for isolated development fixtures |
| `Phoenix Compass/education compass/server/src/services/auth-service.ts` | `f68dc1b7e790ab964d1813ecacc9bf6a4b8205db` | Local demo AuthService creates family_user sessions in the in-memory store; not Canonical identity authority |
| `Phoenix Compass/education compass/server/src/auth/session-family-bridge.ts` | `bf0628be53b0bbd7b67e1866adfbf1d0d130f263` | Supports family/students projection only; explicitly refuses single-student identity translation from Family mapping alone |
| `Phoenix Compass/education compass/server/src/services/canonical-family-projection.ts` | `73e64f36df1a5a8a127379bbf1109de0ac038967` | Canonical projection is gated/default-off; production broker adapter is not composed in current bootstrap |
| `Phoenix Compass/education compass/server/src/services/canonical-learning-catalog.ts` | `e0326a3037fad2bd8b71a5a5b9034e0dfd22a8a1` | Exposes a limited published-course catalogue, not the full student/teacher timetable and learning workbench APIs |
| `Phoenix Compass/education compass/server/src/http/app.ts` | `f3e3fc7a6aa8e2303e49be18cff4da83b863a102` | Current application routes include legacy profile/assessment APIs and limited Canonical projections; not the approved production Family/Corporate OS identity router |

The existing Education Compass in-memory demo backend must not become a second production account or data authority. Production UI/API integration must use the trusted Phoenix Core / Family OS / Corporate OS identity and Canonical service boundary. The actual production broker adapter and deployed routing remain UNVERIFIED.

## 6. Important schema facts

- `auth.principals.person_id` is UNIQUE: one Canonical Principal per natural person.
- `auth.principals.principal_kind` is single-valued and is currently used as an authorization/channel discriminator.
- Formal channel vocabulary includes FAMILY, ADVISOR, PARTNER, INTERNAL and STAFF. STUDENT is not yet a context channel.
- `auth.session_contexts` and `auth.context_exchange_tickets` already support backend-bound context and one-use ticket transfer. The context ticket expires within 60 seconds.
- Formal `auth.session_contexts.family_id` and ticket `family_id` are nullable at the column level, but current check constraints require a family for every channel except INTERNAL.
- Existing `consent.has_active_consent()` is family-context-bound (`family_id = auth.current_family_id()`); a global STAFF context with NULL family cannot reuse it unchanged. A subject-scoped staff consent helper is a required gap if global STAFF context is approved.
- `learning.teacher` is keyed to `core.people`; `learning.teacher_assignment` is class-scoped and time-bounded.
- `learning.schedule_slot` has teacher overlap exclusion but uses free-text `room_label`; no stable room ID or per-student future slot reservation was found.
- `learning.place_enrollment_in_class()` locks the class row before checking capacity, protecting the final group seat.
- `education.score_record` is numeric-only; `education.language_test.score_json` is an unconstrained non-empty JSON object. Both are append-only but lack the full instrument/version/scale/review contract.
- `learning.stage_report` and `learning.publication` already provide a teacher narrative publication/retraction lifecycle.
- No formal `education.study_enrollments` object was found in 0001–0037. `learning.enrollment` is the training-course enrollment and must remain distinct.
