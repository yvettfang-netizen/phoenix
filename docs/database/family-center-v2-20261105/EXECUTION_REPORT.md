# 家庭中心 V2.0 执行报告

2026-11-05。**前端与最小Canonical摘要候选 = PASS；完整业务接入/发布验收 = HOLD；本机全站测试门禁 = FAIL（依赖环境不匹配）。**

## 实际交付

- 独立分支 `codex/family-center-v2-20261105`，基于PR55固定5414c18…，PR55本身未改。
- 原家庭中心路由内默认关闭的新React候选；官方Logo浅色页头、海军蓝五项导航、暖金Hero/麒麟原站插画、四领域卡片、家庭/主体、日期、成长蓝图、报告及HARMONY区域。
- 中文/English及四屏宽；明确合成演示A–F，多家庭/主体选择只缩小范围；pin在当前演示生效，刷新重置；loading/empty/no-permission/unavailable/stale/error/ready各有展示。新客户可独立咨询，无须先创建家庭。
- 复用既有opaque-session BFF与0037受控摘要，不加客户端数据库凭据或后端路由。真实D1账户未映射Canonical，仍显示安全空状态并复用原账户/退出控件。
- Schema/API映射、候选摘要DTO、最小偏好Forward设计、开关/回滚和验收边界文档；未生成新SQL，0001–0037无字节改动。

## 本轮实际测试

| 项目 | 结果 | 证据/命令 |
|---|---|---|
| TypeScript / 定向ESLint | PASS | 网站既有tsc --noEmit；ESLint新组件/模型/fixture/测试/原路由 |
| 新视图模型与原BFF定向测试 | PASS，8/8 | `node --import ./tests/register-typescript.mjs --test tests/family-center-v2.test.mjs tests/canonical-session-projection.test.mjs tests/canonical-family-projection.test.mjs` |
| 标准build脚本 | PASS，经Git Bash运行原scripts/build-verified.sh | 默认npm脚本先调用不可用WSL失败，随后使用本机已有Git Bash原脚本成功；失败输出也保留；未改构建脚本 |
| 中英浏览器1440/1024/768/390 | PASS | 实际浏览器、8张截图、无水平溢出、五导航/四卡、A–F/多家庭/成员/pin重置/报告弹窗/Escape/焦点/真实账户无demo；各模块状态演示不保留旧资料 |
| PG16与PG17 | PASS | `node database/canonical/verification/v0037/projection-e2e.mjs 16 --family-center-v2`，17同命令；新建自有标记的一次性集群，未重建现有常设库 |
| Fresh / Upgrade / Repeat / Drift / Atomicity | PASS，两版 | 0001–0037；0035→0036→0037保留合成主数据；双forward漂移拒绝、账本原子回滚；各自实测37/93/83 |
| 分离LOGIN / 一次性票据 / RLS / 监护 / 撤权 / 清理 / 审计故障 | PASS，两版 | 原安全负例全部保留；binder/app真实分离连接，LATE-1返回前撤权、READ INSERT/COMMIT故障无DTO、clear/discard与角色越权拒绝 |
| 新页面→BFF→broker→binder/app→PG | PASS，两版fresh及restore | 实际/en/family-center呈现A/B授权家庭/学生；不伪造服务；blur清除及刷新重验；撤销会话后无资料；原JWT预览回归仍保留 |
| 专用backup / 摘要篡改 / fresh-cluster restore | PASS，两版 | 恢复后37账本/93表/83策略，并重新执行新页面与原安全回归；manifest未签名，仅完整性 |
| SQL源校验 | PASS | 原verify-source.mjs；历史SQL和两候选byte-exact |
| 网站全量Node测试 | FAIL：107项，95 PASS / 8 FAIL / 4 SKIP | 7个Worker测试文件因已安装Miniflare缺convertV4MiniflareOptions导出而无法加载；1项Satori缺harfbuzzjs/hb.wasm。没有删减/跳过断言来变绿 |
| 新提交远端CI | NOT RUN（本报告签入时） | 工作流已加入新定向测试和--family-center-v2；后续以准确提交的GitHub检查为准，旧PR55的20PASS不继承 |
| 正常真实账号→Canonical→私人报告→偏好持久化 | HOLD / NOT RUN | D1身份映射/provider及业务summary合同未齐；不把合成opaque session演练当真实客户登录证据 |
| 患者级医疗Consent撤回、真实HARMONY Gateway | HOLD / NOT RUN | 普通页面无医疗/银行原始字段或专项入口，无LLM调用/操作权限 |

本机已安装包与锁文件不一致：Vite8.0.13 vs8.3.5、Miniflare4.20260515.0 vs5.20261101.0-beta、Next16.2.6 vs16.4.5。未覆盖共享node_modules或改锁文件；Linux CI需按原npm ci清洁安装复验。该事实限制本机构建的可发布性结论，但不把8项失败归为本功能PASS。原Worker fixture和运行时依赖测试未改。

首次PG16扩展测试因浏览器测试挂载方式影响原页面hydration停滞；只终止本轮自有测试浏览器使runner进入finally，容器/卷/合成配置正常清理。随后改为等待页面稳定、附加独立挂载点，并限定操作超时；另修正测试中隐藏背景导致Dialog portal不可见的问题。最终两版完整运行通过，首次失败保留为pg16-attempt1.txt，无修改业务权限绕过失败。

## 门禁及下一步

| 门禁 | 状态 |
|---|---|
| 页面候选、合成个性化、最小摘要链 | PASS |
| 锁定依赖的全站CI与真实独立复审 | HOLD |
| Founder视觉/业务最终签收 | HOLD，待本人实际验收 |
| 新服务/日期/报告摘要与偏好持久化合同 | DEPENDENCY_HOLD / 设计已交付 |
| F1–F5、真实多家庭/单学生映射、患者授权及Agent | HOLD |
| main合并、腾讯升级、真实资料/病历导入、生产切换 | HOLD，均未执行 |

唯一下一步：审查此独立候选及准确SHA的CI，并按PROJECTED_API_CONTRACT.md核定下一批客户服务/报告/日期摘要字段。新SQL必须另审Forward，不重建家庭主数据。

本轮合成证据与截图归档到既有私有证据分支；源码/分支/PR/私有提交链接由完成后的同步收据和Notion记录，避免自引用SHA。本报告不是Jimson、玄武、麒麟或Founder的独立签署。所有自有测试容器/卷、临时配置已清理；历史数据库/卷/分支均保留。
