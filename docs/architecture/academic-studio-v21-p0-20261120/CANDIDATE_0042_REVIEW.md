# PR #77 / 0042 — current-head re-review for Academic Studio

**Academic Studio disposition: HOLD / DO NOT DEPEND ON 0042.**  
**Reviewed:** 2026-11-20  
**main:** `9db147ac3a5d135d50b90bfea5a7316ce747d90b`  
**Current PR #77 HEAD:** `380fec99da5151fd28b8a5d3a2acaaa7292d3c23`  
**0042 Git blob SHA:** `de104ac742d9116cb3a1752651695854d871e75d`  
**Current CI:** 19/21 passed; `workspace-authorization (16)` and `workspace-authorization (17)` failed.  
The earlier 21/21 result belongs to a previous PR head and must not be reused.

## 1. Current candidate contents (not the earlier taxonomy)

The latest candidate defines:
- `core.organization_workspace_profiles` with `HEADQUARTERS` and `CHANNEL` only;
- `core.organization_memberships`;
- `auth.workspace_role_bindings` with FOUNDER, STAFF, CHANNEL and FAMILY workspace kinds and role codes including STAFF_ADMIN, STAFF_TEACHER, CHANNEL_ADMIN, FAMILY_PRIMARY and FAMILY_MEMBER;
- persistent `auth.workspace_sessions`;
- `service.project_assignment_organization_scopes`;
- workspace binding/session IDs on the existing `auth.context_exchange_tickets` and `auth.session_contexts`.

The latest SQL no longer has the earlier REGIONAL_PARTNER / FRANCHISEE / SUB_PARTNER organization vocabulary. This re-review does not repeat that stale finding.

## 2. Findings

| Finding | Current evidence | Academic Studio disposition |
|---|---|---|
| Organization model | HQ/CHANNEL profiles and organization memberships remain | Not needed for global teaching resources. May be considered separately for Corporate OS channel/partner workspace, not as teaching tenants or regional teacher partitions. |
| Workspace role bindings | Role codes include STAFF_TEACHER, STAFF_ADMIN, FOUNDER, FAMILY roles | Potentially useful role metadata, but not sufficient by itself to implement Founder-approved capability semantics; see Principal-kind finding below. |
| Persistent workspace session | `auth.workspace_sessions` stores owner-session digest, context-token digest, binding/membership authorization versions, expiry and revocation | It is not a duplicate ticket or backend context table; it is a second durable workspace-selection/revocation lifecycle. No Academy requirement has yet proven it necessary. Prefer existing app login session + live capability checks + existing one-use context ticket and backend context. |
| Existing context reuse | 0042 extends the existing `auth.context_exchange_tickets` and `auth.session_contexts`; it does not create duplicate ticket/context tables | Good reuse of the existing ephemeral mechanism. |
| Multi-role identity | Formal `auth.validate_context_request()` still maps FAMILY Principal → FAMILY channel and TEACHER/SUPERVISOR → STAFF channel. `learning.current_staff_kind()` still derives from single `principal_kind`; `learning.teacher_has_class_access()` requires TEACHER. 0042 does not change these learning authorization functions. | A FAMILY Principal with a STAFF_TEACHER workspace binding is not automatically a Teacher in the existing learning functions. Therefore 0042 does not solve a person who is both Parent/Student and Teacher under one Principal. |
| Family scope | Family workspace binding is based on current `core.family_memberships`; downstream Canonical projections and Learning functions still need guardian authority and Consent checks | Membership must never be treated as parental authority. Keep live subject-specific checks on every protected read/write. |
| Runtime integration | Workspace service uses injected `resolve()` callback and is restricted to test/development mode; no production broker resolver/composition was found in main | Not a production-ready login or role-routing feature. |
| CI | Current exact PR #77 head has 2 failed PG16/17 workspace-authorization checks | Current candidate is not green; root cause is not asserted without raw job logs. |

## 3. Xuanwu security assessment

- The candidate correctly reuses the existing one-use context ticket and backend-bound context rather than creating duplicate context-ticket/session-context tables.
- The added workspace session stores authorization-version snapshots and is revalidated on ticket issue/redemption and during workspace context checks. The application service calls the injected `identity.assertCurrent()` before and after sensitive operations, and clears DB context/resets role/discards pooled connection state in cleanup.
- These controls are additional complexity. They do not establish that Academic Studio needs a separate persistent workspace session; this must be justified against the existing application session and live role/assignment checks.
- The role-binding table does not override the existing learning authorization's Principal-kind checks. A STAFF_TEACHER binding alone is insufficient for a FAMILY Principal.
- Parent/child data still requires Guardian Authority and Consent in the protected data functions. Do not rely on Family workspace membership as a substitute.
- Current 0042 CI is 19/21, not a full pass.

## 4. Founder-aligned direction

1. One Canonical Principal per Person; no duplicate student/teacher/parent accounts.
2. Student capability derives from the person's own `core.student_profiles`.
3. Parent capability derives from current verified `core.guardian_authorities` plus applicable Consent.
4. Teacher capability derives from existing `learning.teacher` and active class/student assignment.
5. Administrator/Founder authority requires a narrow, separately revocable and auditable grant if existing SUPERVISOR semantics are not accepted.
6. A dual Student+Parent actor defaults to Student; Parent view is a deliberate switch followed by fresh server-side authorization.
7. Decouple capabilities from the single `auth.principals.principal_kind` discriminator. Do not solve this by creating a second Principal or a broad multi-company tenant system.
8. Reuse `auth.session_contexts`, `auth.context_exchange_tickets`, `bind_context()`, `redeem_context_ticket()` and `clear_context()`. Do not add `workspace_sessions` for Academy unless a concrete acceptance test proves the existing login/session + context model cannot satisfy the required revocation semantics.

## 5. Decision

- **For Academic Studio:** HOLD 0042 in its current form; do not depend on it or install it.
- **For Corporate OS channels:** evaluate its HQ/CHANNEL organization and project-scoping features separately against the approved Partner Workspace scope. This review does not reject that separate use case.
- **For P0.1:** implement no SQL yet. First close the one-Principal/multiple-capability contract and Founder/Admin grant semantics.
- **Commercial rules:** remain HOLD.
- **No migration number is allocated.**
