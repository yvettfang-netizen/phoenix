# Phoenix Nova Enterprise V3｜机构工作区授权 P1

状态：`PG16/PG17 SYNTHETIC CI = PASS` / `REAL IDENTITY INTEGRATION = HOLD` / `DEPLOYMENT = NOT APPROVED`

PR [#77](https://github.com/yvettfang-netizen/phoenix/pull/77) remains Draft. The current 0042 candidate is verified on PostgreSQL 16 and 17 in GitHub Actions; this is not approval to merge, install in a shared environment, or deploy.

## Fixed baseline

- Main baseline: `main@9db147ac3a5d135d50b90bfea5a7316ce747d90b`
- Formal historical migrations: `0001–0037`, unchanged
- Reserved candidates: `0038/0039` Service Workbench, `0040` historical PR #61, `0041` PR #74
- Candidate: `0042_organization_workspace_authorization.sql`
- Current candidate SHA-256: `9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`
- Isolated ledger: 38 rows; 98 tables; 88 policies including auth

## Context consolidation decision

0042 creates five new tables only:

1. `core.organization_workspace_profiles`
2. `core.organization_memberships`
3. `auth.workspace_role_bindings`
4. `auth.workspace_sessions`
5. `service.project_assignment_organization_scopes`

It does **not** create a second temporary ticket/context subsystem. It extends the existing Canonical `auth.context_exchange_tickets` and `auth.session_contexts` with two nullable workspace references. The persistent browser login/workspace session remains in `auth.workspace_sessions`; the database ticket and backend-bound context are shared.

The old Family/Advisor/Partner/Teacher context flow remains compatible. Legacy redemption rejects workspace tickets and clears both workspace references when it rebinds a backend connection. Workspace redemption similarly replaces the existing context row. The live-context predicate rechecks backend PID + backend_start, session status/expiry, current binding/membership authorization versions, actor, family and channel.

## Verification

- GitHub Actions run for code commit `b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91`: [44719124928](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928)
- PG16: 20/20 acceptance groups PASS
- PG17: 20/20 acceptance groups PASS
- Source/backend job: hash guard, scoped secret scan, backend typecheck/build/tests PASS
- Migration ledger: 38; isolated tables: 98; RLS policies including auth: 88
- Cross-flow replay rejection, same-backend legacy rebind, cleanup, revocation, rollback and checksum-drift rejection all covered

Structured evidence: [GITHUB_ACTIONS_PG16_PG17_RESULT.json](evidence/GITHUB_ACTIONS_PG16_PG17_RESULT.json).
The installation failure, correction and current acceptance receipts are recorded in [CI_FIX_EXECUTION_REPORT_20261120.md](CI_FIX_EXECUTION_REPORT_20261120.md).

## Explicit HOLD

- Real OIDC/WeChat/employee/partner identity provider and authoritative mapping to `auth.principals`
- Actual shared non-production installation and trusted reverse-proxy/session resolver
- Independent security/database review of the exact candidate SHA
- Production migration, real data, Tencent Cloud, merge and deployment

Default startup remains off. No real identities, credentials, production data or external database environment were used by the synthetic CI run.
