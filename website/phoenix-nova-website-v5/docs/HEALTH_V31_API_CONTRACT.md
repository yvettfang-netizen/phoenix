# Health V3.1｜API 与 OS 交互契约候选

状态：D / review candidate。本文只定义未来可信服务的边界，不代表已上线 API、数据库迁移、RLS、事件 outbox 或 Family OS / Founder OS 接入。

## 1. 当前状态与不可误读事项

Health V3.1 页面仍是前端候选。现有 Health Compass 14 题、六维文字规则、跳题/返回/导出及 `HEALTH_COMPASS_PREVIEW` 受控开关继续复用；页面咨询为本地准备演示。浏览器不保存、上传或发送评估答案，不能由前端创建 `family_id`、`client_id`、`lead_id`、`consultation_id` 或 `service_project_id`。

Canonical 基线采用已审计的 Person 方向。Health Patient 尚未成为独立主档；Health scopes、患者级硬外键、受控医疗文件存储、Finance 权限和全站 outbox 均保持 HOLD。不得把本候选文件当作可执行迁移或授权文件。

## 2. 逻辑操作（不是公开 URL）

| 操作 | 用户意图 | 未来可信服务最小输入 | 当前结果 |
| --- | --- | --- | --- |
| `consultation.request` | 用户主动申请了解服务 | 业务方向、来源渠道、介绍伙伴引用、当前地区、就医目的地、保险渠道、联系方式方式枚举、独立联系同意、幂等键 | HOLD；正式咨询端点、持久化和 outbox 未接通 |
| `contact.authorization` | 允许顾问联系 | consultation 引用、目的、接收范围、有效期、独立授权记录 | HOLD；授权存储未接通 |
| `record.authorization` | 允许访问指定患者资料 | Person/患者引用、资料范围、接收者、目的、有效期、患者级授权 | DENY/HOLD；Patient 语义、RLS 和受控存储未实现 |
| `partner.source.validation` | 核对介绍来源 | source channel、source-qualified referral reference、服务端伙伴核验结果 | CANDIDATE；不能决定佣金或访问 |
| `family.projection.read` | Family OS 查看获准摘要 | 经验证 session、family/person 关系、purpose、当前授权 | HOLD；Health 仍被 Family handoff 保留契约拒绝 |
| `founder.projection.read` | Founder OS 查看经营投影 | 服务端 principal、岗位、法人/项目范围、运营字段白名单 | HOLD；不授予患者原始资料读取权 |
| `partner.workbench.read` | 已授权伙伴查看分配个案 | 服务端伙伴身份、分配客户、项目范围、purpose | HOLD；伙伴工作台未开放 |
| `medical.document.upload` | 上传病历、报告或理赔资料 | 独立患者授权、受控上传通道、RLS、审计及保留策略 | DENY；本页面不收集文件 |
| `finance.write` | 合同、付款、退款、佣金或成本变更 | Canonical 财务权威、审批依据、法人/币种/金额、幂等键 | DENY；前端不触发财务写入 |

页面可以传递用户意图和候选定位符；所有身份、权限、伙伴归属、合同、付款和患者授权必须由服务端重新解析。客户端字段不是授权证据。

## 3. 五个背景维度必须分开

以下字段在咨询准备中分别确认，不能合并为“来源”或互相推断：

| 字段 | 语义 | 禁止推断 |
| --- | --- | --- |
| `source_channel` | 用户从哪里了解入口 | 不等于客户当前地区 |
| `referral_partner_reference` | 介绍伙伴的待核验引用 | 不等于已验证伙伴、佣金或客户所有权 |
| `current_region` | 客户当前所在地区 | 不等于医疗目的地或保险渠道 |
| `care_destination` | 计划了解的香港/大湾区目的地 | 不等于医院接诊或预约确认 |
| `insurance_channel` | 保险或自费背景 | 不等于保障范围、预授权或赔付结果 |

介绍伙伴引用只能作为服务端核验的定位符。URL 中的伙伴 ID、前端角色、UTM 或用户自报身份均不能授予访问、佣金或数据归属。

## 4. 独立授权与咨询交接

咨询申请、允许顾问联系、允许转交评估摘要、允许访问患者资料是四个不同目的。一次授权不能扩展为另一目的，也不能从“完成评估”推导出来。每个授权应记录目的、主体、接收者范围、字段范围、版本、有效期、撤回时间和审计引用。

未来事件候选为：

- `crm.consultation.requested`：用户明确请求并且权威源请求已保存；不包含原始答案或病历。
- `crm.consultation.authorized_for_handoff`：独立授权仍有效，明确接收范围和用途；不自动包含评估报告。
- `compass.assessment.completed` / `compass.report.generated`：只有受控服务保存了可追溯版本和授权引用后才能发布；当前保持 OFF。

浏览器不能直接发布事件。可信服务应在同一权威事务中写源状态和 outbox，使用 `(source, aggregate, operation, idempotency_key)` 去重；同键不同 payload hash 必须拒绝。消费者以 `(consumer_name, event_id)` 去重。当前没有可用的全站 outbox，因此实际 Runtime 保持 OFF。

## 5. Canonical 映射边界

未来交接只能引用已批准对象：`family_id`、`member_id`、`client_id`、`lead_id`、`consultation_id`、`deal_id`、`contract_code`、`service_project_id` 及现有 payment 主键。匿名访客不能由网页创建家庭或客户主档。Health Patient 继续沿 Person 方向设计，不新建第二套 Patient/Family/Client/Partner/Project。

`service_project_id` 只能引用真实 Service Project；不能把 Casework Case、咨询准备项或页面状态冒充服务项目。合同、付款、退款、佣金和成本事件必须遵循现有 Finance 契约，未完成 Canonical 物理映射前全部保持 HOLD。

## 6. 最小投影范围

### Family OS｜凤启家序

只提供经患者/家庭授权的健康服务摘要：健康规划状态、已确认预约引用、协调任务摘要、后续跟进状态和授权引用。Family OS 不自动接收病历、诊断、处方、检查报告、理赔原件或 Health Compass 原始答案。一个家庭中多个患者必须分别授权；撤回后投影和缓存立即失效。

### Founder OS

只提供经营管理所需字段：`lead_id`、来源渠道、介绍伙伴引用、业务域、咨询状态、`service_project_id`、`contract_code`、付款状态、交付状态及对账状态。Founder OS 不因管理角色自动获得患者文件、原始答案或病历权限；医疗信息只可在另行批准的患者级授权和最小汇总中出现。

### 合作伙伴工作台

只面向经服务端核验且已分配范围的伙伴，显示伙伴引用、指定客户、咨询引用、预约协调状态、服务任务摘要和完成状态。未开发或未批准开放时只显示“受控预览”，不得伪造可用客户管理系统。

## 7. 财务与服务事件引用

候选服务事件：`service.project.created`（真实项目创建后）、`service.project.closed`（真实终结事实）。财务候选：`finance.payment.received`、`finance.refund.paid` 等，必须来自可信支付回调/对账及批准的法人、合同和会计期间引用。合同额、应收、已收、已分配、收入、退款、成本和佣金分别记录；不能因前端成功页面或按钮点击发布事实事件。

财务 payload 使用精确十进制字符串、批准 ISO 4217 币种、`legal_entity_id`、`source_reference`、`approval_reference`、`accounting_period` 和幂等键。真实支付、退款、佣金或合作费用在本阶段均关闭；不创建第二套 Payment、Partner 或 Service Project 主数据。

## 8. 受控失败与错误语义

候选服务必须区分 `DENY`（缺少可信身份/授权或危险操作）、`HOLD`（方向可设计但运行时未接通）和 `CANDIDATE`（满足静态契约、仍不能授权）。网页不把“已提交”“已排队”“已核验”显示成“已预约”“已到账”“已交接”。当前所有真实写入、上传、付款和事件发布仍关闭。
