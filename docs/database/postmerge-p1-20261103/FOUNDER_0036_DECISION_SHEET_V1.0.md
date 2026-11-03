# 0036 入口、需求与可信操作者确认表 V1.0

日期：2026-11-03。记录归属：Jimson；由 Jimson 本人授权 Codex 操作。**工程事实已核对；业务选项为预填建议，Founder 决定仍为 PENDING。** 当前声明仅确认 Notion 回写授权与工程准备，不自动构成数据库权限、业务合同签署或 Migration 开工批准。

本表承接 [0036 设计](CANONICAL_0036_DESIGN_DECISION.md)。不重复审查 PR #36，不修改0001–0035，不创建第二套主数据。精确源码锚点见 [入口与权限来源清单](CANONICAL_0036_VERIFIED_SOURCES.json)。源码存在、内容已批准发布、真实入口已部署、真实请求已获授权，是四项不同事实。

## A｜已核实的入口来源

核验 main `9355d28667ee9cf4761b4abcdaf959f0ad154820`，以及当前未合并的 Education #38、Identity #35、Health #34 候选。没有发现本轮新增的0036生效决定。

| 领域 / 事实 | main 中实际位置 | 已确认 | 仍不能据此推导 |
|---|---|---|---|
| Education 说明入口 | `/{locale}/education`；`app/[locale]/education/page.tsx` | 已有真实页面代码，并非只存在于待合并分支 | 正式问卷、真实咨询POST、用户选择已写入Canonical |
| Identity 说明入口 | `/{locale}/identity`；`app/[locale]/identity/page.tsx` | 真实页面代码及目录引用存在 | 新国家政策候选已批准；Identity意图等于Family入口 |
| Health 说明入口 | `/{locale}/health`；`app/[locale]/health/page.tsx` | 真实页面代码及目录引用存在 | 患者资料授权、医疗预约、真实数据库写入 |
| Wealth 当前目录入口 | `/{locale}/compass#wealth`；`lib/site-directory.ts`，页面由`app/[locale]/[page]/page.tsx`承接 | 当前目录指向Compass页面的Wealth锚点，不是独立`/wealth`路由的证明 | Wealth问卷已开放、规则已加载、Finance权威已就绪 |
| 当前 Education 咨询准备组件 | `components/education-consultation.tsx` | 页面内存选择/本地清单；刷新清空；未发送咨询 | 浏览器本地选择已经成为服务端认证的需求事实 |
| GEO 内容 | 既有 Notion GEO Hub，见原字段审计 | Content ID、来源、审核/发布状态等字段存在 | Last Edited能够代替不可变发布修订号/内容摘要 |

`#wealth` 是客户端片段，不会成为发送给服务器的HTTP路径。未来归因必须携带可信、版本化且服务端重新核验的入口引用；不能仅凭`/compass`请求推导Wealth，更不能把该片段当用户已确认的专业需求。上述页面路径是源码观察，不是新批准的产品代码。CHILD_COMPASS/FAMILY_COMPASS保留已冻结含义，不为它们猜测新的路由。

**C-1 待补的精确值：** 已批准的入口来源登记方式、运行时`source_system`、入口版本/引用、来源发布责任人、GEO发布版本/摘要生成责任人。建议直接引用既有发布流程导出的、可验真的版本清单；不新建CMS，也不虚构 `IDENTITY_COMPASS` / `WEALTH_COMPASS` 旧枚举值。Jimson可确认本表的代码事实；来源发布授权仍须由相应负责人/Founder确认。

## B｜需求变更规则：可直接选择或修改的建议

下列推荐均未生效。修改只作用于新追加的需求事实，不重写First Touch，不倒填历史用户选择。

| 决策 | 预填建议 | Founder填写：接受 / 修改 |
|---|---|---|
| C-2a 同一Lead能否有多个专业需求 | 允许EDUCATION/IDENTITY/WEALTH/HEALTH并存，每条事实单独记录领域、来源、操作者和时间；没有自动“唯一主需求” | PENDING |
| C-2b 如何修正、撤回或替代需求 | 追加明确的修订/撤回事实，引用被更正事件；同Lead/同领域且授权匹配；不UPDATE/DELETE历史，不按“最后写入”静默覆盖 | PENDING |
| C-2c 用户自选与顾问确认的关系 | 两种证据分别保留；顾问确认不自动抹掉用户自选，不把顾问意见伪装为本人选择 | PENDING |
| C-2d Consultation/Deal如何关联需求 | 首批保留既有Lead链接；新流程可显式引用经接受的需求事件；不强制补齐旧记录，不自动创建Deal或项目 | PENDING |

如果Founder选择单一有效需求、不同的撤回权或强制事件FK，应先修改本表，再生成对应DDL/回归。不能在代码中替Founder选定。

## C｜可信操作者：已有能力与缺失事实

| 层 | 已核实的能力 | 下一步必须证明 |
|---|---|---|
| 当前CRM记录人 | `crm.is_crm_service()`要求有效、personless SERVICE，且`service_label='canonical_crm_v2'`；归因RLS仍校验家庭上下文 | 新入口API仍使用受控CRM服务，不能给所有ADVISOR或普通app直接表写权限 |
| 当前事件记录 | `crm.record_lead_event`取执行连接的`auth.current_principal_id()`作为actor | 它不自动证明“是哪位用户自选/哪位顾问确认”。新增asserting actor必须与记录SERVICE分开且能验真 |
| 当前身份解析 | `auth.external_identities`以issuer+subject映射到现有principal；未登记/已停用身份拒绝；binder解析及一次性票据已有机制 | 精确issuer/audience/JWKS、有效应用仓库/路由、身份登记证据和真实角色归属，不能由当前Notion操作身份代替 |
| 当前Family绑定 | 既有Family受控映射与票据；无自动建档 | 请求主体、Lead所属家庭与授权范围须一致；不从浏览器参数推导所有权 |

**C-3a 推荐边界：** 用户只证明自己的选择；顾问确认必须附有效的顾问分配和按既有合同所需的Consent；SERVICE可以记录，但不能自行断言别人已经确认。此处提议复用既有身份/票据证据链，具体断言格式、校验责任和scope仍待批准；尚未宣称存在“需求确认票据”函数。

**C-3b 必填事实表：** 下表只列待核实项目，不在这个公开候选文件填写实际身份配置、运行拓扑或受保护密钥定位符。真实`iss`/`aud`/JWKS配置证据、运行责任人及app/binder/signing引用填写私有来源仓库的`canonical-db/integration/postmerge-p1/0036_PRIVATE_REQUIRED_FACTS_V1.0.md`；公开副本仅保留无敏感定位符的证据编号/状态。两个位置都禁止粘贴密钥值、密码、真实客户资料或学生记录。

| 字段 | 当前值 / 所需资料 |
|---|---|
| 身份来源及对应证据链接 | PENDING；提供已采用身份源的正式配置/决议链接，不用测试issuer代替 |
| 精确`iss`、`aud`、JWKS URI及版本依据 | PENDING；必须能对应同一已批准环境 |
| 应用仓库、准确提交及可信API路由 | 既有历史三路由源码已知；0036真实写入路由/运行版本 PENDING |
| 验证用户自选的证据链 | PENDING；主体从认证映射解析，不能仅提交`asserted_by_principal_id` |
| 验证顾问确认的证据链 | PENDING；分配、家庭/对象scope、Consent、撤销和有效期证据 |
| app / binder / signing 的分离引用 | PENDING；只提供受保护文件/密钥管理引用及责任人，不提供值 |
| 实际运行和撤销处理负责人 | 数据库工程负责人Jimson已知；来源身份/发布/运行责任人分别填写，不混为一个身份 |

不收集这些主体的真实数据来完成草案；未知项保持空缺并默认拒绝。当前会话“Jimson本人”确认的是授权的Notion记录人，不会自动创建`auth.principals`、Staff、顾问或客户身份。

## D｜权限、保留与发布决定

**C-4 预填建议：** 仅受控新函数获得精确EXECUTE；PUBLIC/普通app直接表写保持拒绝；强制RLS与现有家庭/source边界保持；用户和顾问断言无法验证、同幂等键不同payload、过期或跨家庭/学生/伙伴请求一律拒绝并留非敏感审计。保留/删除期限沿用已生效合同的精确条款；不能确定覆盖时保持HOLD，不能默认为永久保留。

Founder/治理审核填写：新增事实的分类与接收范围、确切保留/撤销规则、必要的读写角色、0036版本化Migration Manifest/测试框架升级批准。**状态：PENDING。** 不因0035旧夹具PASS而自动通过0036；新的SQL、目录数量、账本、表/策略数量、0035→0036升级及恢复断言须一起审核。

## E｜本轮已执行与待执行

已执行：远端main/PR39及并行候选核验；上表页面和SQL能力的代码级确认；原35项Manifest核对；预填决策表及证据索引；按Jimson授权的Notion回写。新PR HEAD的受保护CI以实际检查结果为准，不能继承旧SHA的PASS。

未执行：0036 Migration生成/应用、现有库变更、腾讯连接、真实身份登记和业务数据写入。新的四领域写入/浏览器联通仍为BLOCKED。

**下一步交接：** Jimson完成工程事实登记；Founder/相应责任人在C-1至C-4填入决定与证据，并对最终文件SHA作明确批准。届时由Codex生成独立Forward候选及PG16/17合成验收，不触碰现有常设库。Founder签署人、日期、批准依据、最终文件SHA：**均留空，未代填。**
