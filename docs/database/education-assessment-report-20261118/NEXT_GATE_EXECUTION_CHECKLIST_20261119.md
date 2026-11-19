# Education Canonical 下一门禁执行清单

2026-11-19 · Jimson 数据库台账 · PR #74 后续收口

## 执行结果

| 清单 | 状态 | 实际结果 |
| --- | --- | --- |
| 主线与并行候选编号复核 | PASS | `main@9db147ac3a5d135d50b90bfea5a7316ce747d90b` 的正式账本仍为 0001–0037。PR #59 预留 0038／0039，PR #61 包含 0040 候选；Education 不占用这些编号。 |
| Education Forward Migration 编号预留 | PASS | 建立机器可读 manifest，暂定 0041。它仍位于 `forward-candidates`，不在正式迁移目录，账本仍为 37。若 0038–0040 的合入次序变化，0041 必须在晋升前重新编号。 |
| 数据库与权限静态复审 | PASS | 候选要求显式隔离标记；PUBLIC 无表权限及函数执行权；APP、发布和结算角色分离；所有 SECURITY DEFINER 固定安全 `search_path`；运行时仅 `NODE_ENV=test`、回环监听且拒绝旧 DSN 和旧会话桥。未发现需要改写候选 SQL 的新缺陷。 |
| 脱敏与秘密扫描 | PASS | 使用现有 GitHub 工作流固定摘要的 Gitleaks 镜像，对 Education 候选、验证程序及本轮文档三个范围逐一扫描，均为 `no leaks found`。 |
| 外部事实门禁登记 | PASS（登记）／HOLD（事实） | I-1、I-2、H-1、P-1 已转为机器可读登记。合成机制均 PASS；真实 provider、逐人映射、设备交接及权威支付／退款回执均无引用，未伪造。 |
| 自动化门禁 | PASS | `gate-manifest.mjs` 校验正式账本、候选摘要、0041 预留、权限边界、默认关闭与外部事实 HOLD。服务端 typecheck／build 通过，146／146 测试通过；PG16.15／PG17.11 的候选持久化与旧库关闭后的隔离应用链路均通过。原始结论见[本地门禁输出](LOCAL_GATE_VERIFICATION_20261119.md)。 |
| GitHub 同步 | PASS | 修改继续同步现有 Draft PR #74，不创建重复 PR，不合并。 |
| 腾讯 0041 部署 | NOT RUN / HOLD | 腾讯隔离非生产库继续停在正式 0037。未将候选 0041 载入现有运行数据库。 |
| 生产、真实数据与旧库退役 | HOLD | 未执行生产切换、真实客户数据导入、旧库删除或 PR #68 合并。 |

## 独立安全复审摘要

1. 候选函数只通过选择性 `EXECUTE` 暴露；运行账号不能直接读写 `education_compass` 底表。
2. 发布服务只能读取已提交且授权有效的精确测评；Level 2 还要求当前 `PAID` 的单份报告引用。
3. 结算服务只能登记固定商品 `EDUCATION_GROWTH_DISCOVERY_SINGLE_V1`、3990 分 CNY 的受控事件；客户端不能授予权益。
4. 退款中和全额退款均关闭读取；终态事件不可被迟到付款恢复。
5. 隔离 HTTP 运行时不开放问卷、报告、订单或支付写入路由；这些路由统一返回 `CANONICAL_CONTRACT_HOLD`。
6. 请求不能通过 `x-family-id`、`x-principal-id`、`x-role`、`x-channel` 或 `x-source-system` 自报身份。

## 唯一外部下一步

Jimson 按 [外部事实登记](EXTERNAL_FACT_EVIDENCE_REGISTER.json) 补充 I-1、I-2、H-1、P-1 的脱敏、可复验引用。四组事实与最终候选摘要绑定并通过独立复核后，再由 Founder 决定是否把 0041 晋升为正式 Migration 及是否在指定非生产环境启用。
