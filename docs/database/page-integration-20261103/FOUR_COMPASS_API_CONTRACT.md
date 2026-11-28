# 四领域统一服务端接口契约草案

**设计核对PASS；新增接口生效/实现HOLD。** 仅开发环境及合成数据准备。沿用既有C-1～C-4批准，不重开已冻结政策；本文件不填造真实issuer、部署地址、角色或密钥。

## 唯一对象权威

| 逻辑对象 | 0001–0035实际对象/规则 |
|---|---|
| Person / Family / Student | core.people / core.families / core.student_profiles（person_id主外键）；不创建Patient/ASKWISE Student副本 |
| Member | 家庭关系对应core.family_memberships；付费会员/订阅是另一业务语义，不能把成员关系当购买权益或新增member主表 |
| Principal / 身份绑定 | auth.principals、auth.external_identities与已批准的Family映射/一次性票据；当前Notion操作角色不产生DB主体 |
| Client / Partner | crm.clients及client_parties、crm.partner_relationships，引用既有Person/Organization/Family；渠道链接不是授权 |
| Lead / Consultation / Deal | crm.leads / crm.consultations / crm.deals及deal_items；不得把Deal预计金额记为Finance收入 |
| Service Project | service.projects、project_subjects、project_domains、project_assignments；不替代Education Application、Identity Case或Learning Task |

用户原始入口、明确专业需求、最终服务分别保存；专业领域EDUCATION/IDENTITY/WEALTH/HEALTH；CHILD_COMPASS保留教育专项含义，FAMILY_COMPASS保留跨领域含义，不推导WEALTH。GEO内容引用不是用户选择。0036候选提供必要的新来源/需求表达，但尚不属于main。

## 统一边界

`Page → same-origin BFF（若需要）→ 已确认Node可信API → Canonical专用连接/受控函数 → 最小授权投影`。

- 浏览器不持数据库凭据/DSN，不提交可信principal/role/family UUID，不直接连Postgres；不得把edge/D1运行时自动当可用Node PG后端。
- 真实身份由精确issuer/subject及获批受众/JWKS解析到既有主体，再解析Family/subject。app/binder使用分离连接和短期一次性票据；连接归还前clear/discard，未知或清理失败丢弃连接。
- 只读目录与敏感个体数据分开。默认拒绝未批准的路由/角色/字段；不存在合法映射时403/不可用，绝不回退到demo/旧库创建主数据。
- 业务写入只调用准确获准函数，不给浏览器/普通app表DML。幂等键来自服务端验证的来源事件与payload摘要；同键同内容重试稳定，同键异内容拒绝；重试不能重复建主体/扣课时/生成财务记录。
- 响应记录schemaVersion、requestId及必要source/version，错误不泄露对象存在性；发布、撤回、有效期及授权变更需要在真实事务/连接池环境复验。不得拿旧Store字段冒充Canonical投影。
- 多库双写/Outbox不是既有默认能力；如需要，另审原子性、投递、重放、撤销及保留协议。

## 最小拟议接口与字段

| 拟议服务端接口 | 最小响应/输入 | 物理依据与门禁 |
|---|---|---|
| GET /v1/learning/catalog | items[{courseRef,versionRef,courseCode,title,versionNo}] | learning.list_published_courses()已存在；ref先作为不可授权的opaque locator。开放匿名访问未批准，先用开发合成认证；不返回教师/学生/价格 |
| GET /v1/canonical/projections/family-summary | familyRef、displayName、获准成员/学生引用 | 只从core及已验证public-ID映射构造；不返回旧Store独有phone/goal等为Canonical事实；版本合同待批准 |
| GET /v1/canonical/learning/cards/:ref | 获准studentRef、summary、publishedAt | learning.read_published_card；学习同意/监护/教师班级范围；不能把任意cardRef当授权 |
| POST /v1/canonical/intake | 经验证entryRef/revision、显式needs、可选受控partnerRef、幂等键 | 0036及正式来源/人类断言合同先过审；无原始答卷、证件、病历或自动建Family |
| GET /v1/canonical/projects/:ref/summary | projectRef、领域、状态、获准里程碑摘要/nextAction | subject/assignment/Consent逐项校验；默认不带原始文件/金额 |

上述为**待实现草案**，不声称路由存在。既有GET /v1/me/family、students等DTO不能静默改字段或换数据源；新投影完成合成比对并批准版本后再做受控切换，禁止双主数据写入。

| 角色/上下文 | 可准备的读取/操作 | 默认拒绝 |
|---|---|---|
| 未认证 | 已批准公开内容；新目录匿名权待发布合同确认 | 家庭/学生/个体项目/正式写入 |
| FAMILY本人/核验监护 | 自身或合法监护范围内经发布且获准的数据 | 同家庭不等于所有人敏感数据；未验证监护/过期/撤回 |
| TEACHER / SUPERVISOR（STAFF） | learning现有班级分配、有效期和LEARNING_RECORD/LEARNING同意限定 | 别班/别学生/未经发布；不由前端角色产生权限 |
| ADVISOR / PARTNER | 有效案件/对象分配、Consent或渠道对象授权内的最小数据 | 整个家庭、跨对象、越期/撤销；URL partnerId当授权 |
| SERVICE | 精确标签/用途、受控函数与审计 | 替人断言已确认、任意主数据DML、财务或临床扩权 |
| Founder经营用户 | 经正式员工/组织映射授权的非敏感汇总 | Notion中的Founder角色自动成为DB管理员；患者/学生明细与HR/Finance无限访问 |

各模块补充的字段、权限及测试在后续分册；真实配置和新增路由启用仍HOLD。
