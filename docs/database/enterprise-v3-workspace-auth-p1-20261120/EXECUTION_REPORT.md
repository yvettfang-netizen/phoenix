# Enterprise V3 P0/P1 执行报告

核验日期：2026-11-20（Asia/Shanghai）

## P0｜网站 PR #76

| 项目 | 结果 |
|---|---|
| 六项主导航及桌面/移动中英文断言 | PASS |
| 关于我们页脚入口 | PASS |
| Corporate OS 路由默认关闭与显式开启跳转 | PASS |
| 本地网站 Node 测试 | 157：153 pass / 4 skip / 0 fail |
| 本地 Playwright Edge | off 44/44；on 45/45 |
| PR #76 GitHub Checks | 24/24 PASS；PR 仍为 Draft |

## P1｜0042 Canonical context consolidation

- PR：[#77](https://github.com/yvettfang-netizen/phoenix/pull/77)，Draft，未合并。
- Code commit：`b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91`
- Candidate SQL SHA-256：`9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`
- GitHub Actions：[44719124928](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928)（source/backend、PG16、PG17 三项 PASS；其余 PR 检查另行核验）

| 项目 | PG16 | PG17 |
|---|---:|---:|
| Fresh 0001–0037 + isolated 0042 | PASS | PASS |
| Ledger / repeat / checksum drift | PASS | PASS |
| Tables / policies including auth | 98 / 88 | 98 / 88 |
| Acceptance groups | 20/20 | 20/20 |
| Same-backend legacy rebind clears workspace refs | PASS | PASS |
| One-use ticket / cross-flow rejection / expiry / replay | PASS | PASS |
| Separate LOGIN / direct table denial / role escalation denial | PASS | PASS |
| Membership disable / role revoke / logout / identity revoke | PASS | PASS |
| Audit / atomic rollback | PASS | PASS |

Source/backend job：historical source guard、scoped secret scan、backend typecheck/build/tests 全部 PASS。

本轮从候选中删除两个重复临时表，改为复用既有 `auth.context_exchange_tickets` 与 `auth.session_contexts`。正式 0001–0037 未修改。详细结构见对象权限矩阵和 P0 决策记录。

最新修复：删除导致 0042 安装失败的多余 `END IF;`，并使 `STAFF_TEACHER` 被 Staff 项目读取函数显式拒绝。PG16/17 从正式 0037 重新安装，20/20 合成验收通过。见[修复执行报告](CI_FIX_EXECUTION_REPORT_20261120.md)。

## P0｜0043 task handoff review

- 正式 0035 的 `service.transfer_task()` 已有 task row lock、同项目 ACTIVE assignment 检查、任务 assignee 更新、审计及不可变 `TRANSFERRED` 事件；但实际 SQL 未检查 assignment `valid_from`、recipient Principal status 或 assignment role，且授权路径要求 service-management service + Family context。
- 0043 另加的是提议/接受/拒绝/取消/过期/收件箱审批流程；其 Staff/Organization 资格检查更严格，但 accept 函数自行更新 task、插入 `TRANSFERRED` 事件，没有复用正式转移函数。
- 因此 0043 并非纯粹重复。当前没有 Founder 明确要求双边审批，也没有批准 Staff workspace 任务转派扩展，所以不纳入当前 Canonical 升级。若以后需要 Staff 转派，应先扩展/抽取唯一转移 authority，再让审批层调用它。
- PR [#78](https://github.com/yvettfang-netizen/phoenix/pull/78) 已关闭、未合并；PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82) 已直接基于 0042，明确排除 0043。
- 未来如需双边审批，应单独立项，并复用 0035 转移逻辑，不再复制 task mutation/event authority。

## 尚未授权 / 未声称完成

- 真实身份提供方、真实员工目录及客户账户映射：HOLD
- 共享非生产环境安装及可信会话解析器：NOT RUN
- 独立安全/数据库审核人对当前 0042 SHA 的签署：HOLD
- 生产 Migration、真实数据、腾讯云、Push 到 main、Merge、部署：NOT RUN

本轮 PG16/17 均为合成数据和一次性隔离容器测试；不构成生产部署或真实身份接入验收。
