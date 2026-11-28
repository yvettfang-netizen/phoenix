# P3｜Family OS / Founder OS 授权投影

**既有代码核对PASS；新Canonical投影实现NOT RUN；真实接入HOLD。**

## Family OS

官网family-dashboard-preview是固定示意数据；客户账户D1只处理账号，不把登录用户附着到虚构家庭。原生Family OS真实本地demo后端使用SQLite并创建独立家庭/学生；其loopback演示身份不得进入Canonical正式身份映射。保留demo与历史记录，不删除/停用。

历史48bb6c3…桥接以app/binder分离、票据和RLS证明三条既有读路由的授权兼容，**并不证明DTO字段全部由Canonical读取**。当前main路由仍调用ProfileService/旧Store。新模式必须让授权与被返回数据同源，不能通过RLS后再返回旧Store任意对象。

| 投影 | 最小候选字段 | 必要授权/排除 |
|---|---|---|
| 家庭/学生摘要 | 已验证public reference、displayName、获准关系/状态 | 映射、合法成员/监护/subject；不猜parentName/age/phone，不返回其他家庭数据 |
| 服务进度 | 项目ref、专业领域、状态、已批准里程碑摘要、nextAction及版本时间 | 项目subject/有效assignment/Consent；不把Family成员关系当整家敏感权限 |
| 学习摘要 | 已发布课后卡/阶段报告最小字段 | 0022的LEARNING_RECORD/LEARNING、监护/本人/班级教师/主管边界；不复制原始attempt/reflection |
| 健康咨询 | 获准非敏感进度 | 不含患者病历、文件、保险或医疗结论；单独授权，不自动进Timeline |

接口草案见统一契约。正/负合成E2E应实际覆盖页面→BFF→trusted API→binder/app→RLS→projection及连接复用清理，而不仅是单独SQL或前端snapshot。

## Founder / Operations OS

已从用户指定资产保全报告定位既有本机经营工程，当前HEAD=`e60a16477581e286c8c75b421e95dbc531c9af77`。确有Operations页面、D1/Drizzle表、经营状态机、组织/员工/伙伴作用域快照读取。既有0004及组织scope测试有未提交改动：仅记录摘要，原样保留；没有进行部署、D1查询、重建或迁移。原Freeze依据不完整的部分仍HOLD。

这份工程不能与Digital World的/founder导航/品牌工作台混为一谈，也不能用当前聊天Founder角色替代运行时Operations actor。平台ChatGPT/SIWC登录不自动等于Canonical客户/员工身份。

| 既有资产 | 最小适配方向 | 本轮不做 |
|---|---|---|
| Lead/Deal/Project经营状态与权限逻辑 | 保留已完成规则、角色裁剪与接口语义，逐字段比对Canonical CRM/Service，准备read adapter | 不重写经营模块、不批量拷贝D1表，不将dirty0004认定为生效 |
| 经营汇总 | 仅经批准组织范围内的非敏感Lead/Consultation/Deal/Project状态统计 | 预计pipeline不得叫已收收入；不自动显示HR/患者/学生明细 |
| Operations entitlement | 继续独立权威的受控引用/撤销机制 | 不当作Guardian/Consent或Finance账本 |
| Contract/Payment/Commission/Settlement | 保留源资产和规则，独立确认Finance权威及正式合同 | 不从旧表存在推导Canonical已覆盖，不发起真实财务动作 |

拟议Founder API只提供版本化、作用域明确的汇总；汇总粒度、小样本披露与字段许可未批准前默认关闭，不能自行选隐私阈值。审批/责任与实际运行身份各自留证。负例：伪造组织/Founder身份、跨组织/伙伴、撤权后读取、敏感字段混入汇总、把预计Deal当收入、重复事件导致统计翻倍。新投影E2E为NOT RUN，旧D1当前部署/数据状态也为NOT RUN。
