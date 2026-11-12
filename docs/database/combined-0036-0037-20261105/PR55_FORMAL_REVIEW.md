# PR55 固定提交技术复审

2026-11-05；Jimson本人授权的技术复审与回写，Codex执行。该报告是代码和实测技术结论，不冒充独立审核人、GitHub Approve或Founder最终签署。

**修复后本地技术复审：PASS；真实身份、正式独立Review、合并与部署：HOLD。** 原始提交存在以下LOW缺陷，不能将原提交直接视为本轮无缺陷通过。

## 来源与范围

- 原始复审对象：[PR55](https://github.com/yvettfang-netizen/phoenix/pull/55)，固定SHA `d1dd6e3b579bee90bce8dd25b97f0374c21ebb28`。只读核验时OPEN/Draft、20项CI成功、reviews为空、REVIEW_REQUIRED。既有CI不替代本轮新增反例。
- 基准main：`9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`。0001–0035已合并，0036/0037仍为隔离候选，常驻库/腾讯版本没有查询或升级。
- 复审范围：37项源摘要与组合迁移、受控SQL与ACL、broker/session/Store ownership、分离LOGIN和一次性票据、READ审计提交/故障、BFF及预览状态、备份恢复、候选安全扫描和治理现状。
- 修复仅限预览组件状态、永久浏览器回归与其CI扫描覆盖；不改任何SQL、业务语义、依赖、真实登录或远端规则。修复提交完整SHA及其准确HEAD CI由PR55和私有同步收据绑定，报告不伪造自引用SHA。

## 发现与处理

| 编号 | 严重性/原始结果 | 证据与处理 | 修复状态 |
|---|---|---|---|
| R55-UI1 | LOW / FAIL | 同一预览组件由legacy切到session模式，两个新请求尚待授权时，旧family/student DTO仍可显示；原始实际浏览器反例记录oldNameVisibleBeforeNewAuthorization=1。默认关闭开发预览的状态生命周期缺陷；没有证据表明越过数据库RLS或泄露另一家庭数据 | 修复PASS；两版fresh/restore共4次oldNameVisibleBeforeNewAuthorization=0 |
| R55-UI2 | 相关回归 | 拒绝态返回legacy模式时也应重新开始；不得沿用上一模式failed状态吞掉已授权响应 | 永久回归PASS；两版fresh/restore共4次 |

修复将预览状态放入以模式区分身份的子组件，同时忽略已取消请求的成功回调。模式切换立即清除旧资料和失败状态，无需等待新网络响应。不同key重建状态的依据见[React官方状态生命周期说明](https://react.dev/learn/preserving-and-resetting-state)；实际效果以原始反例及修复后浏览器输出为证。

当前两个开发预览页面分别传固定模式，本轮反例显式复用同一组件并切换该prop；没有证明现有生产页面存在这种切换路径。因此不将此LOW组件缺陷描述为已发生的跨家庭或生产资料泄露。

`ui-state-review-regression.mjs`独立导入实际组件、以明确合成Mock延迟两个新请求并返回401。它仅证明组件状态行为，不冒充Canonical读取。永久接入现有组合runner，在PG16/17各自fresh与restore执行；真实浏览器→BFF→broker/binder→Canonical测试另行运行。

## 权限和审计复核

| 控制 | 核验方式 | 结论范围 |
|---|---|---|
| SQL来源/唯一主线 | verify-source及源提交逐字节比较；combined manifest连续37文件 | 原0001–0037字节不变；无0038业务Migration或第二套主数据 |
| projection reader能力 | 实际LOGIN、ACL查询、直接表/映射/审计/写入/DDL/SET ROLE负例 | 仅三个受控投影wrapper可执行；private helper、binder和旧app无权执行，固定search_path；高权限成员/CREATE误配拒绝 |
| binder/app隔离 | 分离LOGIN/连接、票据wrong-principal/伪造/过期/重放与context清理 | binder不能读投影；app不能签发上下文；清理失败不返回DTO |
| 授权和ID翻译 | 当前principal/family membership、verified guardian、期限、映射完整性及跨家庭负例 | family/students最小字段；缺映射或歧义拒绝，无UUID/旧ID回退或自动修补 |
| 内部broker与会话 | 精确profile/ES256、JWKS限制、subject绑定、现有AuthService/Store ownership、撤销和归属变化负例 | 客户端不能断言家庭；缺provider默认拒绝，不回退旧JWT；只使用合成验证器/会话 |
| READ审计 | 实际提交后查nonce，INSERT/延迟COMMIT/DTO故障及LATE-1 | DB审计成功提交并清理后才返回；晚撤销HTTP401无DTO可与DB READ/ALLOW及gateway DENY关联，不能把DB允许当交付证明 |
| BFF/页面 | 默认关闭、local-only、独立opaque cookie/后端路径、重复cookie/伪造header/query/redirect/DTO负例 | 新旧入口分离；A/B/A、DB改名与会话撤销浏览器链；不证明真实登录已接通 |

上述静态审查未发现另一个需修改SQL的已证实缺陷；不代表未覆盖攻击面已被证明安全。权限矩阵和具体断言原始输出保存在新私有证据包，不把设计或旧报告当本次实测。

## 本轮执行与原始证据

以下本地结果来自本轮实际运行。准确修复提交SHA及其远端CI在推送后另记，不把原d1dd的CI沿用到新提交。

| 实际入口/范围 | 状态 | 原始文件 |
|---|---|---|
| 原固定SHA组件反例 | FAIL（已复现） | original-ui.txt、ORIGINAL_PROBE_RECEIPT.json；--original模式断言缺陷存在，退出0不表示验收通过 |
| 修复后组件反例及反向恢复 | PASS | fixed-ui.txt及两版pg日志；永久回归各4次 |
| 现有后端typecheck/build、完整测试 | PASS | backend-typecheck/build/tests及receipt；146/146 |
| 现有website typecheck、定向eslint和三个BFF测试入口 | PASS | website-typecheck/lint、bff-tests及receipt；8/8 |
| verify-source | PASS | source.txt及receipt；37文件 |
| PG16完整组合fresh/upgrade/repeat/drift/atomicity、ACL与审计、浏览器、fresh restore | PASS | pg16.txt及receipt；fresh/restore实测37账本/93表/83策略 |
| PG17相同完整范围 | PASS | pg17.txt及receipt；fresh/restore实测37账本/93表/83策略 |
| 限定候选扫描、工作树/Git字节及SQL摘要、YAML、清理 | PASS | 推送前随包CANDIDATE_VALIDATION.json、VALIDATION_COMMANDS.json；无扫描例外 |
| 修复准确HEAD远端CI | NOT RUN | 推送后单独FINAL_EXECUTION_RECEIPT.json，不沿用d1dd的20项结果 |

可复验入口沿用项目既有命令：

```text
node database/canonical/verification/v0037/verify-source.mjs
# backend目录，使用已安装的锁定依赖：
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
# 仓库根目录：
node "Phoenix Compass/education compass/scripts/run-server-tests.js"
# website目录：
node node_modules/typescript/bin/tsc --noEmit
node --test tests/canonical-family-projection.test.mjs tests/canonical-session-projection.test.mjs tests/canonical-learning-catalog.test.mjs
node node_modules/eslint/bin/eslint.js lib/canonical-family-projection.ts components/canonical-family-preview.tsx app/[locale]/canonical-session-preview/page.tsx app/api/canonical/session-projections/[...path]/route.ts
# 仓库根目录，PLAYWRIGHT_MODULE指向现有固定1.62.1工具；两版依次执行：
node database/canonical/verification/v0037/projection-e2e.mjs 16
node database/canonical/verification/v0037/projection-e2e.mjs 17
```

每个入口的实际命令、cwd、开始/结束时间、退出码和完整合成输出单独归档；只在既有私有证据分支新增`canonical-db/evidence/pr55-formal-review-20261105/`。不归档env、密钥、pgpass、dump/globals或真实资料。清单摘要未签名，只用于完整性，不替代身份认证或批准。

PG16/17均通过fresh、35→36→37升级、repeat、两个forward漂移拒绝、失败迁移原子回滚、原0036合成业务/边界及0037权限/审计/票据、两个浏览器链、专用backup导出/摘要篡改拒绝和fresh-cluster restore。每版fresh和restore均执行新增R55-UI1/2及LATE-1。本轮测试均退出0；自有容器/卷、保护fixture和预览配置已清理。旧报告中的首次PG16工具目录失败仍保留在原私有包，不改写历史。

## HOLD和下一步

- 本次重新查询的main保护仍有strict、1 Review、Code Owner和last-push要求、禁force/delete；但enforce_admins=false、Ruleset/有效规则为空、新0037任务非Required、关键新增auth代码不在现有CODEOWNERS覆盖内。只读留证，不擅改规则。
- 真实provider/HTTPS JWKS transport与受保护signer/只读app/binder配置、正常登录及cookie签发/退出、单学生正式映射、原F1–F5当前事实继续HOLD。历史参数和既有责任人/决策沿用，不因本地测试造出事实。
- 正式GitHub独立Review、最终整合签收与后续合并许可继续HOLD；Codex技术报告不等于他人独立签署。没有新建PR、Approve、合并、部署、腾讯/生产连接、真实身份登记或资料导入。

唯一下一动作：既定责任人在[原私有F1–F5表](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/9c1867755b24f71c902f0020af213d43f27acb83/canonical-db/integration/identity-facts-20261104/OWNER_RESPONSE_FORM.md)补当前受控证据引用、版本/文档摘要、观察时间和核验岗位；不要提供密钥、token或真实逐人ID。缺失仍拒绝，不通过反复重做工程复审来替代外部事实。
