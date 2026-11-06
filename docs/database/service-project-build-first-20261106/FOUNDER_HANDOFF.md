# Founder Handoff | Service Project BUILD FIRST

本收据记录 BUILD FIRST 工程收口、签审入口和真实 Staging 前置条件。交付 Draft 的说明绑定本轮候选完整 SHA、依赖和当前 CI。

## 候选和当前判断

基线必须以远端重新核验结果为准。已记录的 P1 验收候选是：

~~~text
P1 HEAD  5caa8ff524eb925866db13582160779640c1b381
Main     9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc
PR55     5414c18ca521d8b8eae1f650102485749e6ebd3a
PR57     fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683
PR58     a0123c7f39292274962b72b73c06828b85770599
PR59     3ceac97abe5503583e5cc179b98293814d1e1b4d
~~~

上一轮 P1 隔离验收在 PostgreSQL 16/17 完成 17 项 API、10 项浏览器检查，GitHub PR 检查为 24/24。该结果只能证明合成数据链路和隔离浏览器组件。它不代替真实身份、真实文件、真实合同付款或真实 Staging 验收。提交负责人应在本次会议前重新确认所有 SHA、检查和依赖。

| 门 | 当前建议 | 解除条件 |
|---|---|---|
| P0 0038 | HOLD | Jimson 完成 SQL/FK/RLS/角色审查，业务、财务、隐私和运维责任人完成独立签审 |
| P1 0039 | 合成验收 PASS，真实接入 HOLD | 真实身份映射、私有配置、独立安全审查和两个受控账号完成 |
| 私有 Staging | PENDING，真实身份准入 BLOCKED | 由环境负责人配置并证明实际访问控制，再进行独立服务器验收 |
| 生产 | HOLD | Founder 对完整候选 SHA 明确批准，并完成所有独立责任人签审 |

## BUILD FIRST 交付

运维准备入口是 [ops/service-project-staging/README.md](../../../ops/service-project-staging/README.md)。其中约束了合成数据、D1/Canonical/PostgreSQL/对象存储角色分离、私有配置占位、监控、健康检查和回滚顺序。

当前候选 SQL 的事实是：

- 0038、0039 和香港身份模板 0040 位于 forward-candidates。历史 SQL 与 0038/0039 保持字节不变。
- Service Project、Family、Subject、Contract、Payment、Document 和 Consent 继续使用既有 authority。候选不创建第二套主数据。
- 0038 对教育材料和现有 DOCUMENT_READ Consent、subject、family、withdrawal、retention、下载哈希做了受控校验。Health 的普通项目摘要不返回临床内容。
- 真实对象存储、恶意文件扫描/CDR、quarantine purge、护照等敏感文件分类、正式 retention/legal-hold 和真实财务来源仍未批准。
- 合同签署、付款、opening、退款和终止必须由实际 phoenix_operations 来源负责人确认。CRM WON、entitlement、deposit 或历史支付记录不能自动推导这些事实。

香港硕士沿用 P0 的学校和专业、材料版本与审核、正式结果、项目生命周期及站内事件。新增香港身份模板记录资格评估、材料、递交、预约、结果和交付阶段。顾问分配来源为 Canonical 现有独立管理权限，已分配顾问与管理人员使用各自的工作台操作权限。正式政府端、财务事件生产签名、外发通知和真实文件传输等外部对接仍待负责方批准。

## 责任人签审矩阵

实际责任人填写姓名、组织、签审时间、审查 SHA 和证据链接。空白项保持 HOLD。

| 领域 | 责任角色 | 必须附的证据 | 状态 |
|---|---|---|---|
| 0038/0039 SQL、FK、RLS、SECURITY DEFINER、函数授权 | Jimson / 独立数据库负责人 | 准确 SHA、SQL 查询输出、依赖和回滚证明 | 未签审 |
| Customer Auth、Canonical mapping、撤权和会话 | 身份负责人 | provider contract、mapping、revocation、私有 binding、负向测试 | 未签审 |
| 家庭和成员隔离、顾问/管理员边界、Health | 玄武 / 独立安全负责人 | 独立负向测试、审计、缓存和下载检查 | 未签审 |
| Consent、文件分类、护照、存储、扫描、留存和删除 | 白虎 / 隐私与数据负责人 | 政策、Consent/guardian、对象 provider、扫描器、purge/legal-hold 责任 | 未签审 |
| 香港硕士业务流程和客户状态 | 麒麟 / 业务负责人 | 合同、付款、顾问、材料、申请结果和终止状态来源 | 未签审 |
| 合同、付款、退款、opening 和 reversal | Finance/Operations source owner | 来源 schema、service principal、版本/签名、waiver、reversal 记录 | 未签审 |
| WAL/PITR、备份、RPO/RTO、恢复和告警 | SRE/DBA owner | backup authenticity、restore runbook、演练、值班和时间目标 | 未签审 |
| 最终范围和真实 Staging 申请 | Founder | 完整候选 SHA、所有签审和风险决定 | 待 Founder |

## 私有 Staging 准入清单

以下项目全部完成前，不得导入真实资料：

- 获批的真实登录提供方和当前 issuer/audience/JWKS 或等价验证材料。
- 客户和员工到 Canonical principal、family、subject、assignment、Consent/grant 的唯一映射，含撤权、过期和多重匹配拒绝。
- 私有 Sites/Worker/D1/PostgreSQL/object storage/scanner/observability 配置，权限最小化，密钥只在 secret manager 或 runtime binding。
- BUILD FIRST 的 loopback 端口和配置接口必须保持为 Worker 127.0.0.1:4775、Node staging API 127.0.0.1:4776、identity authority 127.0.0.1:4777 或 Unix socket，使用独立 app/binder DSN 和 PHOENIX_SERVICE_WORKBENCH_MODE=private-staging。
- 两个权限不同的受控真实测试账号、批准的测试 Consent、测试范围和数据删除方案。
- 私有对象存储的加密、key rotation、恶意检测/CDR、quarantine、下载链接期限和 purge/legal-hold 处理。
- 0038/0039 的独立数据库安全审查和不使用 CASCADE 的回滚证明。
- 备份真实性、WAL/PITR、正式 RPO/RTO、恢复 operator、故障演练和审计保留。
- noindex 与实际访问控制。noindex 本身不等于私有。

## 测试和证据缺口

PR #61 的通用 Website 作业因缺少 WEALTH_TEST_ORIGIN 条件跳过四项测试。同一 SHA 的 Health workflow 42088306404 设置回环测试地址，四项 Wealth HTTP 断言在前端预演中全部通过。正式服务器性能、真实账号、真实外部系统、正式恢复演练和生产级监控按 BUILD FIRST 策略集中留到服务器阶段。

## 回滚和 Founder 决定

回滚先关闭 Customer Canonical bridge 和 Family/Workbench flags，再撤销 session、mapping、ticket 和下载能力，恢复最后一个独立批准的 artifact。数据库不执行破坏性 down migration，不删除业务事件，不删除真实文件，不重写 migration ledger。0039 函数回滚须先停消费者，按依赖逐项 revoke/drop，遇到意外依赖停止并交给数据库负责人。审计记录、对象和 legal hold 必须按已批准政策留存。

Founder 需要决定：

1. 是否接受当前 P0 为 HOLD、P1 合成为 PASS 且真实接入为 HOLD。
2. 是否授权实际责任人完成私有 Staging 准入审查。
3. 是否批准两个受控真实账号的测试范围和 Consent。
4. 确定生产变更、真实客户访问和医疗能力的单独审批范围及责任人。

本文件不代表 Jimson、玄武、白虎、麒麟、财务、隐私、数据库、运维或 Founder 的签名。
