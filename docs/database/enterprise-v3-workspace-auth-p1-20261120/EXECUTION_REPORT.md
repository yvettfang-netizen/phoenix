# Enterprise V3 P0/P1 执行报告

核验日期：2026-11-20（Asia/Shanghai）

## P0｜PR #76

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 固定 HEAD | PASS | `78f3716f31403907b6ab254a86cf6df888e5ebfe` |
| 六项主导航 | PASS | 首页、教育、身份、健康、财富、洞察；中英文、桌面与移动断言均更新 |
| “关于我们”页脚入口 | PASS | 中英文页脚断言保留 |
| `/corporate-os` 与 `/company-os` | PASS | 默认关闭均 404；显式开启时 canonical 200、legacy 307 精确跳转 |
| 本地网站 Node 测试 | PASS | 157：153 pass / 4 skip / 0 fail |
| 本地 Playwright Edge | PASS | off 44/44；on 45/45 |
| GitHub Checks | PASS | 24/24；[PR #76](https://github.com/yvettfang-netizen/phoenix/pull/76) 仍为 Draft |
| 关键 Actions | PASS | [Health](https://github.com/yvettfang-netizen/phoenix/actions/runs/44661837777)、[网站矩阵](https://github.com/yvettfang-netizen/phoenix/actions/runs/44661838135)、[整合基线](https://github.com/yvettfang-netizen/phoenix/actions/runs/44661838254) |

## P1｜0042 隔离候选

| 项目 | PG16 | PG17 |
| --- | --- | --- |
| Fresh 0001–0037 + 0042 | PASS | PASS |
| 重复执行 | PASS | PASS |
| SHA 漂移拒绝 | PASS | PASS |
| 原子回滚 | PASS | PASS |
| 机构种类/邀请/接受/角色 | PASS | PASS |
| 一人多工作区 | PASS | PASS |
| 两个伙伴机构隔离 | PASS | PASS |
| 浏览器角色/机构伪造拒绝 | PASS | PASS |
| app/binder 分离 LOGIN | PASS | PASS |
| 一次性票据、重放、过期 | PASS | PASS |
| 成员停用、角色撤权、退出、登录撤销 | PASS | PASS |
| 审计伪造与角色升级拒绝 | PASS | PASS |
| 旧 Family OS 上下文兼容 | PASS | PASS |
| 清理临时上下文/票据 | PASS | PASS |

实测版本：PostgreSQL `16.15`、`17.11`。每个版本执行 20 个验收组、34 个 HTTP 请求；只使用合成数据和一次性本地容器。容器与私有临时目录均在验收后删除。

现有后端 `typecheck`、`build` 和 148/148 自动化回归通过；新路由的默认关闭与显式注入测试 2/2 通过。固定镜像 Gitleaks 对候选 SQL、验收代码、API、文档和工作流的范围扫描为 `PASS / no leaks found`。

## 尚未声称完成

- 真实身份提供方、真实员工目录及客户账户映射：`HOLD`
- 新组件正常启动组合和功能开关启用：`HOLD`
- 共享非生产环境应用 0042：`NOT RUN`
- 生产 Migration、真实数据、腾讯云、Push 到 main、Merge：`NOT RUN`
- 独立安全/数据库审核人对固定 P1 SHA 的签署：`HOLD`
