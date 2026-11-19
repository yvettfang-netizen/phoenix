# Education 0041 候选本地门禁输出

执行日期：2026-11-19（北京时间）
范围：本地 Docker、纯合成数据、PG16.15／PG17.11；不连接腾讯，不进入正式 Migration 账本。

## 候选清单门禁

命令：

```text
node database/canonical/verification/education-assessment-report/gate-manifest.mjs
```

原始结论输出：

```text
PASS active ledger=37 latest=0037; proposed Education candidate=0041 only
PASS candidate LF SHA-256=c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6
PASS isolation, PUBLIC revoke, pinned SECURITY DEFINER and default-off runtime gates
PASS external fact gates I-1/I-2/H-1/P-1 remain explicit HOLD with no fabricated evidence
PASS promotion evidence template and fail-closed validator are pinned to the candidate digest
```

## 真实事实采集与晋升拒绝门禁

命令：

```text
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --template
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --self-test
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --promotion docs/database/education-assessment-report-20261118/live-evidence/LIVE_EVIDENCE_INTAKE_TEMPLATE.json
```

原始结论输出：

```text
PASS live evidence template is structurally complete and remains fail-closed HOLD
PROMOTION_FACTS=HOLD
PASS evidence gate self-tests: complete test packet accepted only in test mode
PASS missing gate, wrong digest, credential material and non-HTTPS reference are rejected
PROMOTION_FACTS=HOLD
AssertionError: 'HOLD' !== 'PASS'
PASS promotion template rejected exit=1
```

因此空模板、合成自测和任一缺项均不能生成真实晋升 PASS。实际脱敏证据包还必须绑定候选摘要、运行提交、指定非生产服务、四组事实报告及 Founder 最终编号／目标批准。

同一组命令已固化到 `.github/workflows/education-assessment-candidate.yml`，并与 PG16／PG17 候选持久化及旧库关闭链路组成独立矩阵检查。GitHub 结果只在推送后的准确 PR HEAD 上确认。

## Education 服务端

依次执行：

```text
npm.cmd --prefix "Phoenix Compass/education compass/server" run typecheck
npm.cmd --prefix "Phoenix Compass/education compass/server" run build
npm.cmd --prefix "Phoenix Compass/education compass/server" test
```

原始结论输出：

```text
tests 146
suites 0
pass 146
fail 0
cancelled 0
skipped 0
todo 0
```

三项退出码均为 0。

## 脱敏与秘密扫描

复用 `.github/workflows/canonical-0035-premerge.yml` 固定的 Gitleaks 镜像摘要，以 `--no-git` 文件系统模式对以下只读挂载范围执行扫描：

```text
database/canonical/forward-candidates/education-assessment-report
database/canonical/verification/education-assessment-report
docs/database/education-assessment-report-20261118
docs/database/education-assessment-report-20261118/live-evidence
```

原始结论输出：

```text
no leaks found
no leaks found
no leaks found
no leaks found
PASS scoped secret scan
```

## PG16／PG17 候选持久化

命令：

```text
node database/canonical/verification/education-assessment-report/candidate-acceptance.mjs 16
node database/canonical/verification/education-assessment-report/candidate-acceptance.mjs 17
```

原始结论输出：

```text
PASS ledger=37 files=37 expected=37
tables=93
policies=83
SERVER_VERSION 16.15 (Debian 16.15-1.pgdg13+2)
CANDIDATE_SHA256_LF c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6
PASS all eight V1.1 questionnaire pins match the server registry
PASS actual Consent/Assent registration, signer/scope checks, version conflict and immutable submission
PASS publisher and settlement separation, exact SKU and submission digest, single report, guardian signer scope
PASS refund terminal and replay rules, distinct repurchase, both purpose withdrawals, scoped audits and context cleanup
PG16 EDUCATION_FORWARD_CANDIDATE=PASS NUMBERED_LEDGER=37 LIVE_INTEGRATION=HOLD

PASS ledger=37 files=37 expected=37
tables=93
policies=83
SERVER_VERSION 17.11 (Debian 17.11-1.pgdg13+2)
CANDIDATE_SHA256_LF c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6
PASS all eight V1.1 questionnaire pins match the server registry
PASS actual Consent/Assent registration, signer/scope checks, version conflict and immutable submission
PASS publisher and settlement separation, exact SKU and submission digest, single report, guardian signer scope
PASS refund terminal and replay rules, distinct repurchase, both purpose withdrawals, scoped audits and context cleanup
PG17 EDUCATION_FORWARD_CANDIDATE=PASS NUMBERED_LEDGER=37 LIVE_INTEGRATION=HOLD
```

两种版本的一次性实例和私有合成配置均由测试清理。

## PG16／PG17 隔离应用链路

命令：

```text
node database/canonical/verification/education-isolated-e2e.mjs 16
node database/canonical/verification/education-isolated-e2e.mjs 17
```

两版共同结论：

```text
PASS old public.products readiness reproduced; owned legacy PostgreSQL stopped and TCP refused
PASS repeat checks all 37 migration digests
PASS Canonical baseline has no legacy product, assessment, report, order or entitlement tables
PASS disabled synthetic external identity loses projection and entitlement access with the same token
PASS context and one-time tickets cleaned across A/B/A and Operations calls
PASS projection LOGIN cannot select raw entitlement rows, revoke or create audit rows (42501)
PG16 APPROVED_ISOLATED_CHAIN=PASS QUESTIONNAIRE_AND_REPORT=HOLD LEGACY_RETIREMENT=HOLD
PG17 APPROVED_ISOLATED_CHAIN=PASS QUESTIONNAIRE_AND_REPORT=HOLD LEGACY_RETIREMENT=HOLD
```

额外反例实际返回包括：过期／撤销／缺失权益拒绝，跨家庭 403，未授权学生 404，客户端自报范围 403，未开放的问卷、报告和订单路由 503 `CANONICAL_CONTRACT_HOLD`，数据库停止后健康、目录和投影均 503。

## 结论

本地候选、默认关闭接线、事实采集拒绝门禁和 PG16／PG17 合成验收为 PASS。正式账本仍为 0037。I-1、I-2、H-1、P-1、0041 晋升、腾讯 0041 部署、生产切换、真实数据与旧库退役继续 HOLD／NOT RUN。
