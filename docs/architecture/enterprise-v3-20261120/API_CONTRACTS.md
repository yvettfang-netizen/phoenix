# Enterprise V3｜接口与状态机契约

状态：**DESIGN CONTRACT；除明确列为既有者外，均未实现路由。**  
适用主线：`9db147ac3a5d135d50b90bfea5a7316ce747d90b`。  
目标：新功能沿用 Canonical 身份、CRM/Service 事实、文档版本及审计，不开放任意 SQL 或浏览器自授角色。

## 1. 已有接口与新契约的区分

已有浏览器 `/api/service-workbench/*`、`/api/family-services/summary`、`/api/canonical/*` 及 `/{locale}/my-services` 保持原合约。本轮 Corporate 设计页不调用新 API，纯生命周期模块不被 index/route/worker 导入。

下列 `/v1/...` 是待实施服务端契约；浏览器仍通过各自 BFF 调用，不能把路径存在的设计文档当成可用后端。

| 拟议端点 | 用途 | 可信输入/授权 | 关键响应与拒绝条件 |
|---|---|---|---|
| `GET /v1/me/workspaces` | 列出当前人的可用工作区 | 服务端认证 principal 与有效成员/角色绑定 | 仅自己允许的 binding；不从 query role/org 构造权限 |
| `POST /v1/workspace-contexts` | 切换选定身份上下文 | opaque workspaceBindingId + 已验证 session + CSRF/Origin | 验成员、角色、组织状态及期限，轮换/撤销旧上下文；返回受限上下文摘要，不暴露数据库票据 |
| `GET /v1/company/overview` | 总部经营投影 | 有效总部管理能力、数据用途与授权资源集合 | aggregate/source/asOf；默认不含私档、联系方式与材料链接 |
| `GET /v1/partner/referrals` | 伙伴来源及可见进度 | 当前伙伴 binding、商业归属与披露范围 | 来源摘要和已批准状态；未经授权不返回学生细节 |
| `POST /v1/partner/student-invitations` | 建立待接受邀请 | 邀请者委托范围、机构状态、幂等键 | 有期限/单次 token，审计；不按手机号自动合并 person；发送由已授权渠道处理 |
| `POST /v1/organizations/{id}/memberships` | 入驻或成员邀请 | 同机构管理权限和可委托角色子集 | 不得授予总部/Founder 或超过自己权限的角色；不能创建共享密码 |
| `POST /v1/documents/upload-sessions` | 创建受控上传会话 | 当前 subject/family/resource/purpose 权限 | 受限上传目标、大小/类型/校验要求；不授予读取其他文件能力 |
| `POST /v1/documents/upload-sessions/{id}/complete` | 校验并登记版本 | 会话归属、对象校验和、扫描结果、幂等键 | docs version；重试同请求返回同结果，不同内容同 key 冲突 |
| `POST /v1/projects/{id}/document-links` | 引用已保存版本 | 该版本可读/可用于本项目 + 项目权限 + 保留有效期 | 新项目单独审核状态；不能用 hash 或旧项目批准代替授权 |
| `POST /v1/document-versions/{id}/extractions` | AI 结构化提取入队 | 明确处理用途/供应商允许范围/当前许可 | extraction job；入队不算提取完成；正文不写审计日志 |
| `POST /v1/extractions/{id}/reviews` | 接受、修正或拒绝候选事实 | 人工核验者资格、当前数据权限、expectedRevision | 通过领域 API 追加已核验事实，保存证据版本和审查者 |
| `POST /v1/handoffs` | 发起客户或项目交接 | 当前负责人及可移交范围 | PROPOSED，原负责人保留责任至接受；不给接收人自动额外私档权限 |
| `POST /v1/handoffs/{id}/accept` | 接收交接 | 接收者本人、当前组织/项目资格、expectedRevision | 原子结束旧责任/生效新责任/审计；重复接受不重复分派 |
| `GET /v1/company/lifecycle-candidates` | 总部未来联系列表 | 当前授权的教育/联系用途 | 可按时间筛选的最小字段与下一步，不等于可导出所有学生档案 |
| `POST /v1/lifecycle-occurrences/{id}/assign` | 总部派发跟进 | 总部能力 + 当前接收者组织/成员/资源/联系范围 | 关联既有 CRM follow_up；接收者已失效时返回总部待处理 |
| `POST /v1/follow-ups/{id}/outcomes` | 记录联系结果 | 当前分配者，允许的 outcome 枚举，expectedRevision | 客观联系记录与意向；不自动生成成交/合同/录取 |
| `POST /v1/learning/assignment-events` | 学苑→ASKWISE任务交接 | 服务身份、student/task映射、权益、同意、来源验签/事件校验 | 按 source event/version 幂等；不发明第二 student ID |
| `POST /v1/learning/summary-events` | ASKWISE→学苑摘要 | 已确认 session/evidence、来源/版本和授权 | 新版本追加；旧结果不覆盖新结果；不自动增加成长分数 |

## 2. 通用信封、信任边界和审计

响应建议使用明确的 `contractVersion`、`requestId`、`asOf`、`sourceRevision`、`expiresAt` 和业务 data。面向浏览器只返回其需要的公开 ID；服务内部 FK 仍指向既有 Canonical IDs。

写请求携带 `Idempotency-Key` 和 `expectedRevision`。幂等键作用域至少包括当前 principal/已核验工作区/操作种类；相同 key 不同 payload 摘要拒绝为 409。不能在处理结果返回前标记成功；事务提交后可重试查询同一结果。

身份由可信 provider/broker/session 形成。`role`、`organization_id`、`family_id`、`subject_id` 即使在浏览器请求里出现，也只是待核验目标，不是授权证据。Corporate 汇总不是让浏览器自选任意 family 后使用 SERVICE 凭据；授权条件必须在服务与数据库敏感写入处校验。

常用错误：无认证 401；已知操作不允许 403；资源不存在或不可见统一 404；版本/幂等冲突 409；事实缺失/不适用 422；额度/频率限制 429；依赖服务未接通 503。错误不泄漏别的家庭/机构是否存在。日志使用原因码、主体/资源受控标识、授权版本和 requestId，不记录密码、下载签名或全文材料。

敏感响应 private/no-store；下载单独审计与即时鉴权。短期签名 URL 的撤销能力受对象存储机制限制，因此要求严格撤权的材料应通过鉴权代理流式下载，或由能力服务使旧链接失效，不能仅承诺“URL 很短所以立即撤权”。

对列出/读取/下载/导出分别控制权限。授权撤回应清除缓存并拒绝旧上下文/票据/后台任务的新读取；数据库 audit 保留合法必要的历史，授权撤回不等于删除全部审计。

## 3. 生命周期纯计算候选的实际契约

源码：`Phoenix Compass/education compass/server/src/domain/student-lifecycle/planner.ts`。  
标记：`STUDENT_LIFECYCLE_RUNTIME_STATUS = PLAN_ONLY_NOT_CONNECTED`。

输入由未来执行器从已授权 Canonical 快照构造，不直接接受未经验证的浏览器 JSON。包含：

- `StudyEnrollmentSnapshot`：既有 student/family/client 引用、拟议 study enrollment、不可变 journeyCycleId、真实入学与预计毕业、国家/校历/明确学年日期、来源 revision。
- `LifecycleRule`：稳定 key、数值 version、ACTUAL_ENTRY / EXPECTED_GRADUATION / ACADEMIC_MILESTONE 锚点、整数月/日偏移、适用国家/校历。
- `ContactPermissionSnapshot`：student/family/purpose、状态、依据 ref、起止时间、退订与允许渠道；此快照不能替代实际发送时重新取授权。
- `ExistingLifecycleOccurrence`：稳定自然键、occurrence ID/revision、终态/待办状态、原日期、原 CRM/service 路由和原计划依据。
- 可选 `ExistingSuccessorProject`：已存在、主体匹配、ACTIVE、有已核验合同与开通引用的后续项目。
- 显式 `evaluatedAt` 和 `planningTimeZone`，保证可回放；不读取系统时钟。

输出 `student-lifecycle-plan.v1` 的 decisions：

| action | 含义 | 执行器责任 |
|---|---|---|
| CREATE_PROPOSAL | 没有该稳定 occurrence，提出总部审核候选 | 先核验实时授权；unique key + transaction 创建唯一 occurrence/任务/outbox |
| RESCHEDULE_PROPOSAL | 同一待办的计划日期变化 | expectedOccurrenceRevision 检查；更改未完成任务，保留历史日期和原因 |
| KEEP | 日期或终态无需新建 | 如 basisRefreshRequired 则核验/记录新依据；不隐式重复发信 |
| SUPPRESS | 退订、许可无效、规则不适用等 | 使用返回的旧 occurrence ID/revision 停止未派发消息并记原因；不删除已完成历史 |
| REVIEW | 缺失/矛盾/过期来源、重复记录、路由变化等 | 总部人工处理或补齐权威事实，不猜测后继续写入 |

自然键实际格式：`lifecycle.v1:{studyEnrollmentId}:{journeyCycleId}:{ruleKey}`。UUID 引用小写归一化，key 不含 dueDate、expectedGraduation 或规则版本。日期改变不会制造新业务轮次；明确新一轮申请由新 journeyCycleId 表示。

`journeyCycleId` 必须由服务端建立或核验，并绑定在读关系和真实申请轮次；不能接受客户端任意换 ID 来绕过去重。规则停用或从当前规则列表移除时，执行器仍须查询并核对其已存在的未完成 occurrence，停止不再适用的待办/待发消息，不能因计算输入不再包含该规则而留下继续派发的旧任务。

`routing.queue` 始终 HQ_REVIEW。售前输出 CRM_FOLLOW_UP 且指向已存在 crmClientId；具备合格新项目才提议 SERVICE_TASK。旧 CRM 记录变为服务任务返回 WORK_ITEM_ROUTING_CHANGED，执行器先结束/交接原联系责任，不自动保留两条并行联系任务。

`dispatchRequiresFreshAuthorization` 始终 true。规则/在读数值旧版本被拒绝；不透明的 academicCalendarRevision 仍需执行器比较当前权威快照。日期偏移按民用日历计算，不表示院校官方截止时间。

## 4. 持久化执行器需要另行实现的事务

以下伪流程是实现契约，不是已运行 worker：

1. 读取当前授权及版本；同一在读关系/周期聚合锁或以稳定 unique key 原子插入/重试。
2. 读取已有 occurrence、当前规则/校历、client/project 状态及授权版本，调用纯计算器。
3. 对需执行的 proposal 比较 expectedRevision；冲突重新取数据再计算，不能强行覆盖。
4. 创建/修订**既有** CRM follow_up 或 service task，将该真实 ID 写入 occurrence。总部队列没有接收人时不强行违反 follow_up 非空负责人约束。
5. 同事务写唯一 outbox event；业务事务失败时不可残留发送消息。
6. worker 取得有限租约，实际发送/展示前再校验同意、退订、当前成员与具体资源许可；失效则 SUPPRESS。
7. 重试采用有限次数和可观测死信；相同业务事件重复送达时幂等消费。外部消息服务的结果未知时先查询/对账，不盲目重发。

不宣称外部网络消息绝对 exactly-once。数据库层保证一个被接受的 occurrence/任务关联，传输层用至少一次投递及收件端幂等、回执和对账缩小重复。

## 5. AI 提取状态机与人工批准

建议 job 状态：QUEUED→PROCESSING→REVIEW_REQUIRED→APPROVED/PARTIAL/REJECTED；异常另有 RETRYABLE_FAILED、PERMANENT_FAILED、CANCELLED_AUTH。状态记录与原文版本、授权 epoch、model/parser/prompt/schema 版本绑定。

AI 待审事实保存：字段名、值/类型、来源 document_version_id、页码/片段、提取时间、证据校验和、可解释的置信标记。VERIFIED_FACT 只能由既有已核验档案或获授权人工核验产生；模型自评高置信不等于已核验。

批准动作按字段、expectedRevision 和 reviewer 执行；修正保留原提取值及修正原因。已存在已核验事实有冲突时生成差异审查，不直接覆盖。学术记录通过已有受审计 API 追加；线索需求必须由人确认，不能把模型推断变成客户自己陈述。

材料内的链接、命令或“系统指令”都是文档内容，不能改变处理目的、选择其他家庭数据、发送外部消息或执行数据库命令。AI 执行身份无任意 SQL、任意文件路径或跨客户向量检索权限。

## 6. 交接与发布事件

交接提案中记录当前责任人、拟接收人、组织、客户/项目、允许动作、过期时间、理由、expectedRevision。接收动作重新验证双方资格与范围；责任改变和审计事件同事务。任务撤回/拒绝/过期回原负责人或总部，不静默无人负责。

内部备注与可发布客户进度分开。Family OS 只消费显式 CLIENT/FAMILY audience 的批准事件；Partner 使用更窄的 projection。通知不能自动复制内部批注、金额或文件链接。

大学申请状态和真实官方事实分开：上传/审核/内部 READY 不是已向院校 SUBMITTED；递交状态需绑定本次 submission manifest/确切文档版本和认可的官方提交依据，offer/decision 必须保留外部来源。不得因完成内部任务自动制造录取事实。

## 7. 接口验收矩阵

| 维度 | 正向用例 | 必须拒绝或正确处理的用例 |
|---|---|---|
| 身份 | 同人有效员工/伙伴/家庭工作区各自访问 | 旧身份缓存、浏览器自报 role、过期成员、教师未完成 provider 映射 |
| 机构 | 受权成员邀请允许角色 | 子机构升总部、不同伙伴学生列表/下载/导出、组织树传递私档权限 |
| 家庭 | 本人/有效监护人授权资料 | 成人子女无授权、payer 被当成资料 owner、撤权后缓存读取 |
| 文件 | 同一版本跨项目受控引用 | 旧审核自动继承、跨家庭 hash 探测、过期/撤销下载链接 |
| 生命周期 | 稳定键改期、总部派发、签约后衔接 | 日期改年重复、两 worker 重复创建、终态重开、退订后发信、未知结果盲目重试 |
| AI | 有来源待审事实、人确认追加 | 文档注入、无处理依据、入队后撤权、旧版本结果覆盖、新旧 consent 混用 |
| 学习 | 既有任务恢复、Evidence 幂等摘要 | 重新注册学生、过期权益读取、重复庆祝、旧摘要覆盖、SQLite 停用冒充迁移 |

这些验收是后续 PR 必须实现的业务约束；当前纯函数和页面测试覆盖范围以 VALIDATION 的实际记录为准。
