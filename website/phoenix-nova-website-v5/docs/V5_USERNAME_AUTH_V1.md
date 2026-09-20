# V5 原站用户名登录实施交接 V1.0

日期：2026-09-06。范围：现有 V5 的自有用户名/密码认证受控候选。根据 Founder 最新要求直接实施，取代账户方案 V1.1 中必须先选择外部认证服务的前置依赖。

## 已实现与入口

- 原站中英双语 `/{locale}/account`，沿用 V5 页头、品牌色与导航。
- 规范化且唯一的用户名、密码注册与校验、服务器持久会话、退出及退出全部设备。
- 当前密码重新验证后改密或轮换恢复码；改密、恢复和轮换均撤销所有会话。
- 注册后只显示一次随机恢复码；可以由用户主动下载。服务器只保存摘要。恢复后必须重新登录，旧码不能重放。
- 开启认证后，`/{locale}/family-center` 在服务器校验会话；未登录跳回原站账户页。
- 已登录只显示本人账户和“家庭资料尚未接入”，不把原有虚构家庭当作该账号的资料。

这不是手机验证码、邮箱验证或客户业务主库。没有自动发送短信、邮件或提醒，也不创建家庭、Member、Student、授权或业务报告。原 V5 公开模块及原有受控 Health Gate 保留。

## 数据与可迁移身份

| 表 | 职责 |
| --- | --- |
| core_auth_users | 随机 UUID 用户编号、规范化用户名、版本化密码哈希、恢复码摘要、账户状态、创建时间 |
| core_auth_sessions | 随机会话令牌的摘要、用户关联、创建/最近活动/绝对失效时间 |
| core_auth_limits | 带时段的限流键、次数、失效时间；不保存原始 IP 或用户名作为键 |
| core_auth_audit | 账户操作事件、操作者编号、时间；不保存密码、恢复码或令牌正文 |

该 D1/SQLite 存储是最小认证持久化，四表均由 Drizzle 定义并生成迁移；不建立另一个客户业务库。远端 DB 尚未创建/迁移；本次迁移只运行于测试数据库。

后续 Jimson 接入共享 SQL 时，保留 `core_auth_users.id` 作为已建立账户的 `user_id`。迁移工具需要保留用户名规范、密码哈希版本和状态；凭据只能在受控系统间转移，不能进入飞书或普通文档。测试账户不转成真实客户。正式切换先备份、对账、停旧写入、验证新库，再启用单一写入方；撤销旧会话，用户沿用原用户名和密码重新登录。

如果 Core 已有真实认证主体，先确认权威来源并建立经核验的一对一映射，不按姓名或联系电话自动合并。以后增加手机号、邮箱等方式时验证当前账号及新方式，并复用同一 user_id。成年 Identity 申请主体关联 Member，不能接入教育 assessments.student_id。

## 认证实现参数

- 使用 Workers `node:crypto` 原生 scrypt；`N=32768,r=8,p=3`，随机 16 字节盐、32 字节输出、48 MiB 最大内存。凭据格式带算法和参数版本。每 isolate 同时执行一个哈希，繁忙时返回可重试错误。
- 新密码最低 15 个 Unicode 码点，上限 128 个 UTF-16 单元/512 字节；支持粘贴和密码管理器。已有基本弱密码拦截，完整泄露密码筛查仍待接入。
- 32 字节随机会话令牌；只通过 host-only HttpOnly Cookie 传递，HTTPS 下为 `__Host-`、Secure、SameSite=Lax。数据库保存 SHA-256 摘要。空闲 30 分钟、最长 12 小时，每次请求检查账户状态。
- 32 字节随机恢复码，数据库只保存摘要，使用后原子轮换。凭据重设不自动登录。
- 变更接口要求配置中的精确 Origin、JSON 请求体和非 cross-site 请求；请求体最大 4096 字节。认证 API 返回 no-store，错误不返回数据库细节。
- 持久限流按 15 分钟窗口：每平台来源 IP 30 次、每用户名 10 次、全站 300 次；重新验证当前密码按用户另限 10 次。退出不受尝试限流阻断。只有 Cloudflare 受控边缘的 `cf-connecting-ip` 可作为来源；其他部署必须由可信入口设置/覆盖，不能信任外部自带头。
- 失败登录不区分用户不存在、密码错误或停用。注册用户名唯一性错误只说明该名称不可用。

参数依据：[OWASP 密码存储](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)、[Cloudflare node:crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)、[OWASP 会话管理](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。这些依据和本地通过不等于生产安全认证。

## 环境开关与启用顺序

| 名称 | 候选行为 |
| --- | --- |
| DB | Sites 逻辑 D1 绑定，由版本化迁移建立四表 |
| CUSTOMER_AUTH_ENABLED | 严格等于 `1` 时启用真实认证及家庭中心保护；未启用保留标明虚构的原预览 |
| CUSTOMER_AUTH_REGISTRATION_ENABLED | 严格等于 `1` 才接受新测试账号；关闭不影响已有账号登录 |
| CUSTOMER_AUTH_ORIGIN | 网站精确 HTTPS origin，无路径/结尾斜线；本地测试才允许 loopback HTTP |

开关启用但 DB/Origin 缺失或数据库失败时安全失败，不回退为演示身份。环境值通过受控配置管理，不能写进前端。运行测试自行创建隔离数据库和测试配置，不使用线上用户或生产配置。

本轮未部署或设置线上开关。受控发布时先确认企业拥有的域名、迁移备份与运行时容量，再部署同一 V5 的已保存版本并显式启用；注册仍需确认专用测试账户。发布前检查站点受众及应用认证能否在该入口正常工作。已有公开客户不得被误导认为目前已接入私人档案。

## 验证与下一阶段

本地结果：TypeScript PASS；Sites build PASS；全部 33 项 Node 测试 PASS（包含 10 项认证/实际 Worker 测试）；lint 为 0 errors，保留原 customer-center 中未使用 Bell 的 1 条 warning。远端 CI 需按本次最终 GitHub SHA 单独核验。

`tests/customer-auth.test.mjs`：使用实际 SQLite 文件与生成的迁移，验证重开数据库的持久性、盐/哈希不泄露、会话归属、错误凭据、停用/过期、退出、改密、恢复重放、请求来源、限流与失败关闭。

`tests/customer-auth-worker.test.mjs`：启动实际构建 Worker 和 Miniflare D1，验证账户路由、注册、密码登录、会话、家庭中心拒绝未登录、登录后不展示虚构家庭、退出后旧会话失效。测试不连接真实环境。原有 Health 开关及页面响应测试改为同样的 Workers 测试环境，保留全部业务断言；Node 无法直接导入新使用的 cloudflare:workers 运行时。常规工程门禁继续运行 TypeScript、lint、Sites build 和全部 Node tests；浏览器视觉、手机设备和生产容量未验收。

正式接客户前需完成：部署环境的哈希 CPU/内存和并发预算、监控/备份恢复及审计留存；完整弱密码筛查；真实联系方式验证和可靠账户恢复；适用于敏感操作的 MFA；Core Member/Guardian/Consent、逐请求家庭隔离、文件授权和审计。未完成部分保持 HOLD，不能用账号登录成功代替业务权限通过。

当前交付：真实用户名认证代码可在受控环境验证。下一步为同一 V5 的受控启用验收；Jimson 下半月复用该主体接入共享 SQL。未合并 GitHub main、未部署、未声称 Compass 已完成 Family OS 数据集成。
