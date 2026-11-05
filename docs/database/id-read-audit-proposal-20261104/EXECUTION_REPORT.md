# ID 翻译 / 数据库读取审计准备：实际执行报告

2026-11-04｜Jimson 本人授权及回写，Codex 执行。

**PREPARATION PASS / FORWARD IMPLEMENTATION NOT RUN / REAL IDENTITY HOLD**。

| 门禁 | 本轮完成事实 | 状态及证据 |
|---|---|---|
| 当前仓库/并行任务 | 复用现有工程工作树，读取规则、README、精确远端状态；main仍9355d286…；PR41/45/46均Draft未合并 | PASS；[原始命令与输出](evidence/baseline-verification.json) |
| 既有决策 | FD-2/F-18、业务基线与FM批准原字节摘要实测匹配；不重开ID/来源/人员主档决定 | PASS；[溯源](ID_DECISION_TRACEABILITY.md)，3/3摘要 |
| 历史SQL | 0001–0035全部与main blob及源Manifest匹配；本轮无Migration文件 | PASS；35/35，不代表本轮连接过运行库 |
| 最小Forward | 专用无表直读/直写role；类型化现有public_ids翻译；受控最小DTO与内部READ审计；事务/拒绝/回滚边界 | 设计交付；[方案](FORWARD_MIGRATION_PROPOSAL.md)。SQL与PG16/17新能力均NOT RUN |
| 真实身份 | 核对已有Option A/broker及责任人记录；不把真实issuer、JWKS、secret或身份登记事实视为已有 | 审计交付；[缺口表I-1～I-10](REAL_IDENTITY_GAP_AUDIT.md)，事实项HOLD |
| 验收准备 | 明确F-01～F-14、两版本、分离LOGIN、票据、审计负例和全新恢复 | [计划](ACCEPTANCE_PLAN.md)，全部NOT RUN，不借用PR46历史PASS |
| 文档/工具验证 | 只读核验64/64；Node语法、git diff --check；既有服务端 npm run typecheck | PASS；[验证记录](evidence/check-execution.json)。本轮未改应用代码 |
| 候选公开边界 | 新目录仅源码规则/设计/合成边界/摘要、固定Git链接、只读核验工具与脱敏输出；无真实标识、密钥/secret引用值、服务器地址或原始运行日志 | 扫描PASS，见下说明。不是全仓库历史Secret/PII审计 |
| 合并/运行环境 | 不合并PR，不部署、不连腾讯/生产、不登记或导入真实身份/数据；原数据库与历史临时保留项均不操作 | NOT RUN / HOLD，按任务边界 |

## 安全扫描事实

固定摘要Gitleaks镜像首次命中 `generic-api-key`：本轮核验工具的FM批准文件路径含API字样，旁边是已公开、可重算的64位决策文件SHA-256。它不是密钥。[原始脱敏发现](evidence/gitleaks-redacted.json)保留；只在该行加 `gitleaks:allow` 与原因，未宽泛排除文件/规则/目录，未改任何历史Migration。复扫[结果](evidence/gitleaks-final.json)为无发现。此例外与其校验值可由verify-baseline工具独立复核，不宣称首次零命中。

## Git及本轮权限

本分支 `codex/id-read-audit-proposal-20261104` 从PR46固定基线 `97e47f2287483aeda63948c849ea5eed07f0153b` 建立，仅提交本目录；不修改PR46已验收代码或SHA。沿用已授权的任务分支同步与Draft审查流程。准确交付SHA及Draft链接在Notion本轮记录和GitHub提交记录中登记；文档不能自包含自己的提交SHA。

历史PR46在其97e47f2…上的PG16/17及18/18 CI是独立既有事实；新文档分支的CI如触发，只能按其准确SHA另行报告，不把旧CI算作新SQL测试。本轮没有新的迁移、数据库恢复、真实身份联调、生产运行或独立审查签名。

## 唯一下一工程动作

对这份窄方案做审查后，重新核对编号，在独立本地合成实现批次完成新角色、受控public-ID投影和数据库READ审计，并跑完F-01～F-14。实际身份事实I-1～I-6、I-8～I-10继续补证，缺证默认拒绝真实启用；不需要重复批准已冻结ID前缀或重新选broker。
