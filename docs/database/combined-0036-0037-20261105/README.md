# 0036/0037 隔离兼容候选与默认关闭的会话BFF

2026-11-05（客户端Asia/Shanghai）。Jimson本人授权，Codex执行。范围仅本地合成兼容/接线准备，不合并、不部署、不连接腾讯/生产、不读取现存密钥或真实身份/业务数据。

## 来源和唯一权威

- 从本轮核验的main `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc` 创建 `codex/canonical-combined-bff-20261105`；没有git merge、PR merge、clone或覆盖原分支。
- 原有0001–0035仍逐字节核对35项历史Manifest。唯一已合并工程权威是phoenix/main的 `database/canonical/`，私有库保留来源证据，不产生第二条Migration主线。
- PR41 `3de5c99fcc1974ca542db587fcb01494ffe3dc58` 的0036、独立manifest和原验收脚本按Git原字节引入；C-1～C-4沿用已有Founder批准及来源SHA，不重问、不补签。
- PR54 `c1b2f30ea8d85aa402c9c3b0c2ac23421b55b44e` 的0037/受控读取/broker/session等候选通过可追溯本地patch引入，保留main最新Wealth/Health等内容。Education两处真实冲突保留main的出版元数据与阶段入口，只重加默认关闭的课程目录导入/prop/render；冲突快照保留私有证据。

| SQL | 原始SHA-256 | 本轮处理 |
|---|---|---|
| 0036 | 2c977cb44e3ec01f7ad00d4c0d8f32c5e2cd8e8fd2fed796340a919dfd0b7719 | 完全相同，不改字段、约束或函数 |
| 0037 | 29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2 | 完全相同，不改权限/审计语义 |

新[combined manifest](../../../database/canonical/migration-manifests/combined-0036-0037-candidate.json)定义连续0001–0037、37文件，预期93表/83策略；运行时fresh与restore分别实际查询并断言这些值。旧0036/0037独立manifest与报告是来源快照，不能把原36行/92表当作当前组合结果。没有生成0038+业务Migration；原子回滚测试的0038仅在自有临时容器中注入并清除，不进入仓库。

## 已准备的应用链

新路径 `/{locale}/canonical-session-preview` → `/api/canonical/session-projections/{family|students}` → `/v1/canonical/session-projections/{family|students}` → 现有AuthService opaque session → Store ownership → 内部subject-only broker assertion → 0023 binder/一次性票据 → 专用app受控0037投影及审计。

本地合成浏览器使用HttpOnly opaque cookie，不使用旧合成JWT cookie；A/B/A隔离、数据库变更可见、会话撤销后不显示资料均在fresh及restore重复验收。没有创建公开broker签发路由、真实登录会话或真实映射。

新增应用composition seam复用同一factory。默认关闭；normal index不推断broker，也不自动读取signing/JWKS配置。启用新模式但没有显式可信provider注入时503拒绝；新模式不回退旧JWT入口。正常网站D1客户登录、真实WeChat/OpenID与Canonical身份登记没有因此接通，继续HOLD。

## 复验入口

- 现有backend typecheck/build/test；website typecheck、相关eslint及现有BFF测试加新session BFF测试。
- `node database/canonical/verification/v0037/verify-source.mjs`：连续37文件、35项历史及两个forward摘要、0036原验收脚本摘要和LF验证。
- `node database/canonical/verification/v0037/projection-e2e.mjs 16` / `17`：fresh、35→36→37、两个forward漂移拒绝、repeat/atomicity、0036原acceptance+boundary、0037受控读审计与LOGIN/票据负例、新旧浏览器链及fresh restore。使用现有固定Playwright1.62.1工具。

0036原smoke/verify/restore等脚本保持来源字节，针对其独立36文件快照；不将其直接用于组合37文件验收。组合runner复用未改的0036业务/边界测试，并在新建/恢复库使用不同合成fixture base36000/46000。

当前main运行库不升级。F1–F5、真实provider/TLS/JWKS与保护配置、单学生正式映射、实际登录/BFF上线、治理规则和最终审批保持HOLD。详细[应用契约](APPLICATION_BFF_CONTRACT.md)及[执行报告](EXECUTION_REPORT.md)分别记录准备能力和未执行事项。

后续固定PR55/d1dd6e3…的[技术复审与修复报告](PR55_FORMAL_REVIEW.md)记录新增的预览状态反例、最小修复、永久回归及本轮复验；正式GitHub独立Review与真实身份门禁不由该报告替代。
