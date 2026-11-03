# P2｜深圳 Global Health 非敏感咨询

**代码审计PASS；新链路NOT RUN；真实咨询/临床写入HOLD。** main有Health页面；PR33/34的V3.1、Global/GBA、GEO与APEC仍为候选。源码`health-integration-contract.ts`是纯readiness函数，结果始终authorized=false、canPersist=false，不能被前端布尔值升级成授权。

第一范围仅为深圳首发的非敏感服务咨询准备：语言、当前地区、就医目的地区域、公开服务方向、已验证来源与合法联系许可。所有字段为拟议白名单，不因为“非敏感”名称就免于隐私/合同审批。不得请求/存储诊断、检查结果、病历、影像、证件、保险理赔、患者文件或实际预约。

| 语义 | 目标/边界 |
|---|---|
| 客户/家庭身份 | 复用Person/Family/Client，患者与咨询人可能不是同一人；不得自动把Student/家庭成员变成Patient |
| entry/channel/GEO/APEC | 引用真实可验发布版本；APEC只作内容来源，不造会议合作/政府背书或合作实体 |
| region/destination/language/context | 保持独立维度；地区不是身份，保险渠道不是权益，渠道URL不是Partner权威 |
| 明确HEALTH需求 | 在0036合同、可信actor与已批准接收范围下追加事件；无临床结论 |
| intake/consultation/project | 复用CRM及通用Service Project，具体subject关系须授权；不建Health专属客户/家庭主库 |
| contact / handoff / medical-record consent | 三种不同事实；联系许可不等于转介或患者医疗授权；真实患者范围独立Gate |

拟议服务端接口：GET获批公开服务/流程说明；POST经批准的非敏感intake；GET授权的最小咨询进度。patient scope、医院转介、文件上传、保险/支付、正式医疗预约保持默认拒绝。Founder经营权限、监护关系、普通顾问和渠道伙伴均不自动获得患者资料权限。

合成验收矩阵：非法字段拒绝（病历/证件/自由文本临床内容）、来源失效、无联系许可、伪造partnerId/role、跨家庭/subject、联系撤回、不向Family Timeline/Founder汇总泄漏敏感内容、无真实网络转介/上传/支付副作用。Ready/CANDIDATE文案不能算E2E PASS。保留条款、数据分类、来源发布与许可撤回SLA须真实批准后才能启用。
