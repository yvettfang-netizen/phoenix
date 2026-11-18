# P1｜Identity + Wealth 接入准备

**代码/字段审计PASS；新API实现NOT RUN；业务持久化HOLD。** 见SOURCE_INDEX的identity-geo-*、identity-persist/mock/ui、wealth-health/mem。本轮没有核验任何国家法律/金融产品是否当前有效；这里只核验代码与数据边界。

## Identity

main的Identity V3官网已通过PR31合并；V3.1 GEO PR35为3e0d1957…的独立未合并候选。国家、比较和import-review页面读取TypeScript记录与纯预览结果；schema明确区分legal_status、operational_status、application_status、passport_issuance_status，不能合成一个“可办理/获批”状态。限既有四国KN/AR/VU/ST，不扩成全球护照库。

独立Identity Compass不是Canonical后端：浏览器创建usr_/fam_/assessment引用，`persistCompletedIdentityAssessment`调用Mock仓库upsert Lead/Profile/Family。新Canonical模式不得继续把这些ID/前端角色当权威，不能把页面“已保存”视为真实飞书或数据库成功。

| 页面字段 | 拟议服务端映射 | 门禁 |
|---|---|---|
| country/programme/policy/source/version | 独立内容/政策修订合同；现有identity.cases仍只管真实个案 | 不把公共资料当客户Case，不在0036塞政策库；发布/审核状态独立 |
| selected need=IDENTITY | 0036明确的人类需求事件 | PR41过审、真实来源/actor绑定后才写；不伪装FAMILY_COMPASS |
| consultation/Case | crm.consultations + identity.cases + casework.cases已有主键 | 客户/家庭/subject精确匹配、有效分配与Consent；不自动建Person/Family |
| import preview | 当前纯函数结果/批次候选 | 不是数据库事务、发布或回滚已执行；真实导入另审 |

拟议接口：只读已批准资料目录；认证的intake（复用统一契约）；授权case summary。保持录入/审查/发布分离，无国别资格或获批预测。负例：浏览器伪造family/role、未映射subject、跨对象case、过期分配/Consent、未审核政策发布、导入重放/异payload。新链路均NOT RUN。

## Wealth

main独立Wealth基础与只读`/api/health`、Map幂等仓库已核实，但官方问卷与评分/路由规则缺失，当前RULES_NOT_LOADED。不能因为接口health=ok就声称客户/Lead保存成功，也不能编造personas/评分。

| 字段/行为 | 处理 |
|---|---|
| 原始入口/显式WEALTH需求 | 来源与需求分开；保留FAMILY/CHILD历史含义；新需求写入依赖0036 |
| family/client/partner | 仅使用受控映射和Canonical既有主体；Mock CRM ID不授权 |
| Lead/Consultation/Deal | 复用CRM，estimated pipeline明确标记预计，不等于付款/收入 |
| 保单、佣金、退款、结算、资产明细 | Finance/隐私/专业规则权威未确认，HOLD；不从Founder旧D1表或Education支付自动推导 |

拟议接口先读规则加载状态与获准服务目录；正式评估仍BLOCKED。顾问/伙伴只能在有效对象授权内读最小字段。合成验收须验证规则缺失拒绝、渠道跨主体拒绝、无自动Family→Wealth、重复intake不重复建Lead、所有金融写入默认拒绝。本轮不实现新财务表或金融动作。
