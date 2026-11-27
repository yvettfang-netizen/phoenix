# Education Compass 统一实施｜复用映射

本包增量进入 PR #74。规格 [#117 固定 SHA](https://github.com/yvettfang-netizen/phoenix/blob/685aa35201a632428956c0738c6f9396708d7131/docs/education/PHOENIX_EDUCATION_COMPASS_FREE_ASSESSMENT_V1.0_FROZEN.md) 与 Founder P1 决议共同约束边界。

| 现有能力 | 实施选择 |
| --- | --- |
| 原生 `pages/compass`、`pages/welcome`、微信小程序包 | 复用入口、原生控件与构建，增量匿名模式，旧鉴权路径继续使用原逻辑 |
| 原 `models/questionnaire-schema.js` 与服务器 registry/validator、草稿 | 沿用版本、枚举、纯规则及复验模式。新匿名题库和页面内草稿使用同一共享模块，保护历史题版 |
| 23 题、Education Profile、报告、PDF、订单/退款、支付 | 继续沿用原功能，匿名快照没有访问这些持久化服务的依赖 |
| Website V5 Education landing | 复用导航、品牌和现有页面结构，增量匿名入口与服务端校验 |
| #74 0041、#116 归因与发布 | 既有受保护评估、授权、联系和原生引用均通过现有权威；匿名计算无副作用。真实接线与法定文案缺失时四项授权保持独立关闭 |
| Family OS / ASKWISE | 原功能保持原有身份、业务及访问边界 |

## 合并来源与逐文件核对

| 来源 | 固定 SHA | #74 保留方式 |
| --- | --- | --- |
| main | `e5d72abfda656da695cc05e90054d90632353c89` | 同步为祖先，保留已生效的旧数据库退役。 |
| #74 | `1366b53f662082098c2f2673e9ee4be6f433b261` | 原分支历史为祖先。保留现有 Assessment、Family/Student 投影、原题库、报告、PDF、支付、订单和 0041 候选。 |
| #102 | `bb2201a0f7b2bdcc2312ddbdde61a64f045da39f` | 完整提交树为祖先，保留网站接收、Canonical CRM 和自动化测试。 |
| #114 | `6758500df2a31dec9a6e2e1b28cc3f079e3aa1cb` | 交接说明及公开页面回归逐字节导入。隐私和咨询两个路由及两个组件使用已纳入 #116 的集成版本，共四个文件。 |
| #116 | `3ae183fdc0dab0d26863a2ee7bf09fa801e81e51` | 完整提交树为祖先，保留归因、CRM 双人核验、原生发布、角色工作台、隐私、删除及恢复。 |
| #117 | `685aa35201a632428956c0738c6f9396708d7131` | 冻结原件完整纳入，SHA-256 `1dc149a33388934b2f11dacf601e5ccd273718949fccaaef1234de9cc4f213f0`。 |

0037 正式账本保留 37 项。正式 Migration 的 Git blobs 与 main 逐一比对。0041 候选及其 Manifest 与原 #74 逐字节一致。0041 SQL 的 LF SHA-256 为 `c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6`。CRM 验证从当前 checkout 读取同一候选及其固定摘要，无需独立检出另一个 PR。

原生小程序的开发展示入口和官网预览分开控制。两端共用同一题库和确定性规则。任一已选阶段下可跳过全部非必答题。E9 仅在 Q6 明确填写唯一地区时沿用该选项及其原始证据。两个地区或尚未确定仍单独询问。匿名快照仅在页面内存中存在。保存、联系、CRM 分享及学生参与仍分别缺业务接线或已验证同意登记，候选默认拒绝。

## 验收与发布范围

- 官网与 Mini Program 合成一致性由 `website/phoenix-nova-website-v5/tests/free-education-assessment.test.mjs` 验证。两端从相同请求生成相同四卡结果。
- CI 在本 PR 精确 HEAD 上验证网站、CRM、PG16/17 Education 候选、原小程序结构和 UI 契约。退役数据库测试覆盖实际启动拒绝和仅 Canonical 的工作路径。
- 微信开发者工具、真机和授权支付沙箱都须有各自回执。结构回归、测试支付及合成浏览器可提前验收。生产接收、合法授权、真实机构身份绑定和真实 Health/Wealth 发布继续 HOLD。
- 来源 Draft #116、#117 保留至逐文件确认及所需验收齐全。#74 为唯一实施候选，生产上线与共享库安装继续 HOLD。
