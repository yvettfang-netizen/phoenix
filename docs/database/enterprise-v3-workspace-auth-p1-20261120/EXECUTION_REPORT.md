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
- Current commit：`5af10a0f9d22dc1810b3b46e1576c8902887800f`
- Candidate SQL SHA-256：`bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`
- GitHub Actions：[44702823335](https://github.com/yvettfang-netizen/phoenix/actions/runs/44702823335)

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

## P0｜0043 task handoff review

- 正式 0035 已有 `service.transfer_task()`，包含 task row lock、同项目 active assignment 检查、任务 assignee 更新、审计及不可变 `TRANSFERRED` 事件。
- 0043 另加的是提议/接受/拒绝/取消/过期/收件箱审批流程，并在 accept 函数中自行更新 task、插入 `TRANSFERRED` 事件，没有复用正式转移函数。
- 0043 不是纯粹重复：它增加双边审批语义及更严格的 Staff/Organization 资格检查。但目前没有 Founder 明确要求此审批流程，因此不纳入当前 Canonical 升级。
- PR [#78](https://github.com/yvettfang-netizen/phoenix/pull/78) 已关闭、未合并；PR [#82](https://github.com/yvettfang-netizen/phoenix/pull/82) 已直接基于 0042，明确排除 0043。
- 未来如需双边审批，应单独立项，并复用 0035 转移逻辑，不再复制 task mutation/event authority。

## 尚未授权 / 未声称完成

- 真实身份提供方、真实员工目录及客户账户映射：HOLD
- 共享非生产环境安装及可信会话解析器：NOT RUN
- 独立安全/数据库审核人对当前 0042 SHA 的签署：HOLD
- 生产 Migration、真实数据、腾讯云、Push 到 main、Merge、部署：NOT RUN

本轮 PG16/17 均为合成数据和一次性隔离容器测试；不构成生产部署或真实身份接入验收。
