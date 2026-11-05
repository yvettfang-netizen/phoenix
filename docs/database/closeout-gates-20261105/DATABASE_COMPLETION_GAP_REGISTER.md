# Canonical 最终完成标准与剩余门禁

2026-11-05，Jimson本人授权，Codex执行。这里是既有工程的收口清单，不重新设计产品或建第二套数据库。

## 已经完成的部分

- 唯一Schema/Migration权威为phoenix的 `database/canonical/`；0001–0035已由PR36进入main。最新本轮核验main为 `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`（含后续Wealth/Health页面合并），不沿用9355d28作为最新main。
- M0–M5的数据库工程、历史约束/RLS/受控API、备份恢复已有合成验收，不重做。新broker候选 [PR52](https://github.com/yvettfang-netizen/phoenix/pull/52)准确SHA `6aa3abcbaf8a80f7b401ba74bb5585256bb4668e`，本轮再次核验14/14 CI SUCCESS，仍Draft/未合并，无正式Review结果。
- PR45课程目录、PR46家庭/学生投影、PR48的0037 public ID与READ审计、PR52的选定profile验证器与opaque-session家庭桥接，均有各自合成工程证据。它们不是已经进入main或已启用的证明。
- 本分支再补LATE-1：等受控DB读取审计实际COMMIT后撤销会话，预期HTTP401且无DTO，同nonce保留DB READ/ALLOW与gateway DENY，并清空上下文/票据。其完整PG16/17及恢复结果以本轮执行报告和私有原始输出为准。

## “完成”必须分三层

| 层 | 完成标准 | 当前结论 |
|---|---|---|
| 数据库基础工程 | 唯一主数据和迁移权威，已合并基础schema，PG16/17约束/隔离/恢复证据 | PASS（既有0001–0035工程）；不等于所有应用完成 |
| 已批准范围的开发整合 | 最新候选统一版本、完整合成页面/API/授权/审计/写入闭环，仍默认关闭；准确SHA验收、审查和整合材料齐全 | HOLD：下列G1/G3/G4/G6未全部关闭 |
| 获批范围的生产可用 | 可信环境、当前身份/配置事实、运维与独立审核齐全，另有Founder发布授权及受保护发布 | HOLD：本会话不批准部署、真实登记或切换 |

不要求为“完成”先导入客户资料、迁移旧库或删除历史；未来Health病历、完整Finance、未获批的新产品不是本轮无限扩建目标。必须在批准的首批业务范围内签收。

## 剩余七组门禁

| 编号 | 还差什么 | Codex可以先做 | 必须由事实/批准补齐 | 状态 |
|---|---|---|---|---|
| G1 统一候选版本 | 0036分类/获客与独立0037尚未形成基于最新main的完整整合验收版本；PR45→46→47→48→49→52仍为未合并链 | 复用PR41和C-1～C-4来源，准备字节保真的隔离兼容候选、依赖/manifest、fresh/upgrade/restore与精确CI；不改历史SQL或合并main | 真实Review和后续明确整合/合并授权；旧PR36授权不自动覆盖新PR | HOLD |
| G2 真实身份与配置 | 当前真实issuer/JWKS可信性、实际signer/reader/app/binder配置、运行版本及逐案登记事实未齐 | 复用原参数/owner，做受保护配置和HTTPS reader/signer注入的默认关本地设计与Mock验收，不接真实端点 | 原F1–F5当前受控证据引用；不得索取密钥/token/真实逐人ID | HOLD |
| G3 单学生受控映射 | 新session桥接只有family/students，单学生主动403；应用stu_不能当Canonical stu_ | 查已有正式ID/来源/映射生命周期依据；有明确依据就复用，没有就出最小合同/API提案及拒绝测试 | 缺失的具体映射语义/生命周期须批准，不能用姓名或ID形状决定 | HOLD |
| G4 应用及批准业务闭环 | 网站真实登录/BFF与新bridge未接线；各模块仍需逐一证明使用Canonical投影/受控写入，而非旧Store/Mock返回成功 | 按PR42契约与最新main做差异核验，优先Education/Learning/学苑，再Identity/Wealth、Health非敏感咨询、ASKWISE及双OS投影；只实现已有合同的合成接口 | 各模块缺失字段/用途/角色/状态/Consent/保留依据，以及实际应用版本证明 | HOLD / 个别模块NOT RUN |
| G5 可运行和可恢复 | 常驻开发/非生产库当前schema未在本轮查询；腾讯仍不连接；真实日志采集、保护配置轮换、备份目的地/保留/RPO-RTO证明不齐 | 整理已有安装/健康/备份恢复脚本，做自有一次性集群故障、恢复和运维演练，列清运行手册 | 可信目标环境和运维契约的当前证明、后续专门部署授权；A4旧目标不视为可信 | HOLD / 当前运行NOT RUN |
| G6 主仓库安全治理及审核 | 当前Required Checks仅5项0035基线；新scoped-read-audit非必需；enforce_admins=false，等效Ruleset/有效规则查询为空；CODEOWNERS未覆盖新增auth/session engine | 准备CODEOWNERS范围扩展和不会卡死非相关PR的required-gate设计，核实真实reviewer资格，逐项附命令证据 | Repo Owner/Founder审核规则方案；真实独立Review及所需具名验收，不能自动补签 | HOLD |
| G7 最终签收与发布 | 未有本次新整合候选的最终发布验收与许可 | 输出准确SHA、版本、测试、风险/回滚、签收空栏和唯一下一步 | Founder对获批范围、整合及后续发布分别确认；此前不合并、不部署 | HOLD |

### G6的核验限制和处理

本轮读到：main保护strict=true、1个Review、要求Code Owner及最后推送者之外批准、禁止force push和删除；这些控制保留。当前有效required contexts为public-candidate-scan及4个isolated-postgres基线任务。CODEOWNERS现列yvettfang-netizen和Jimson614；本轮API分别验证admin/write，无新增邀请或权限变更。

不自动启用管理员约束或调整远端规则。也不能直接将带paths过滤的0037 jobs无条件设为全仓Required Checks，否则不相关PR可能永久等待；必须先审查始终出结果的聚合gate或等效规则，相关变更真实运行，不相关变更明确记录适用范围，禁止伪造PASS。新增含空格路径的CODEOWNERS模式必须按GitHub语法验证后提交，不能用未验证转义。

## 事实补证不重新做决定

[原私有表单](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/9c1867755b24f71c902f0020af213d43f27acb83/canonical-db/integration/identity-facts-20261104/OWNER_RESPONSE_FORM.md)已经预填历史参数和责任人。F1为当前域名/TLS/JWKS证明，F2为分离保护配置/ACL/轮换及最小权限，F3为实际运行repo/branch/SHA及可信会话链，F4为登记/岗位/关系/用途的证据引用，F5为注销撤销和审计/备份运维证明。只收脱敏文档引用/版本/摘要、观察时间和核验岗位，不收逐人数据。

PR42的页面矩阵是2026-11-03历史审计，未见其新增源码即可不能宣称所有页面今天仍未接通；本轮仅把已验证的课程目录、投影及broker进展叠加，其他模块要求针对最新main/实际候选补充证据。[并行PR51](https://github.com/yvettfang-netizen/phoenix/pull/51)为Meta×Canonical的独立文档/候选准备，不当作已合并运行接入，不在本轮替换其工作。

不报虚构完成百分比。下一份完整执行指令为[CODEX_DATABASE_CLOSEOUT_INSTRUCTION.md](CODEX_DATABASE_CLOSEOUT_INSTRUCTION.md)；按门禁逐项关闭，而不是重新建库或无限增加功能。
