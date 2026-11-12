# 现有页面与Canonical差异审计

## 页面及身份基线

| 现有件 | 核验结果 | 本轮处理 |
|---|---|---|
| family-center/page.tsx | D1用户名认证启用时服务器readCustomerSession验证；无会话跳account；认证失败不展示虚构家庭 | 保留；已登录V2显示账户接入空状态及原CustomerAccount退出/安全控件 |
| customer-center / family-demo-provider / family-demo | 旧合成家庭、证件与升学演示，内存状态 | 保留供旧页面回滚；V2不把旧状态关联到真实用户 |
| customer-auth API/db | 只维护凭据/会话，未证明与Canonical principal相连 | 不改表，不拿D1 user_id或聊天Jimson身份充当Canonical主体 |
| PR46→52→55 | 受控family/students摘要、broker、binder、app专用角色、一次性票据、0037READ审计 | 复用session-projections BFF；新增前端只解析v2最小DTO，无新后端路由 |
| 多家庭/成员选择 | 当前bridge只解析唯一当前应用家庭，单学生映射拒绝；无多家庭授权列表接口 | 合成场景G支持切换；Canonical当前家庭禁用切换，学生仅本地缩小已授权集合，不发任意family/subject到后端 |

## 字段与接口矩阵

所有真实投影都必须重新核验principal、家庭、主体、用途、Consent/Guardian/Assignment及有效期，服务端按版本过滤并提交受保护读取审计。客户端筛选只能缩小已经授权的集合。

| 逻辑能力 | 物理来源 / 现有能力 | 判定 | 当前页面行为 |
|---|---|---|---|
| Family Overview | core.families；0037 core.read_family_summary() | EXISTING_SCHEMA_SUFFICIENT（候选） | 复用GET /api/canonical/session-projections/family；family-summary.v2只含familyRef/displayName |
| Family Members | core.people/family_memberships/student_profiles；0037 core.list_student_summaries() | EXISTING_SCHEMA_SUFFICIENT（学生最小摘要）；其他成员DEPENDENCY_HOLD | 复用students；student-summary.v2只含studentRef/displayName；不虚构亲属、年龄、监护或管理员角色 |
| My Services | service.projects/project_subjects/project_domains/project_assignments；0034 project_subject_authorizations | EXISTING_SCHEMA_SUFFICIENT（主记录）；用户summary API DEPENDENCY_HOLD | 只有显式合成场景显示进度；真实模式只显示探索入口，不显示虚构项目 |
| My Reports | learning.publication/stage_report/after_class_card；learning.read_published_stage_report/read_published_card；service.deliverables及docs.document_versions | DEPENDENCY_HOLD（授权report locator/版本DTO未接入） | 合成摘要对话框；真实无报告文件入口，不能以公开课程API替代私人报告 |
| Key Dates | service.project_milestones.target_at / deliverables.due_at；learning.schedule_slot；docs元数据 | DEPENDENCY_HOLD（来源核验、适用目的和summary契约） | 合成日期显示来源；未核验不计倒计时，真实日期不推算 |
| Learning Summary | learning.enrollment/attendance_record/publication | EXISTING_SCHEMA_SUFFICIENT；API DEPENDENCY_HOLD | 探索教育入口；不宣称已同步ASKWISE或学苑权益 |
| Family Permissions | consent.grants/core.guardian_authorities/assignment有效关系 | EXISTING_SCHEMA_SUFFICIENT；客户可见权限DTO DEPENDENCY_HOLD | 展示授权边界说明，写入关闭 |
| Dashboard Preferences/default domain/pin | 未找到适用的个人首页偏好权威字段 | ADDITIVE_MIGRATION_REQUIRED（若需服务端持久化） | 仅合成内存pin，刷新重置；不写localStorage或新DB |
| Family/Subject Context Selection | 0023解析与0024/25审核映射 | DEPENDENCY_HOLD（真实多家庭/单学生契约） | 不从选择器生成principal、Context或票据 |
| Assistant Task/Context | 既有service.tasks，不等于Phoenix Meta工具授权 | DEPENDENCY_HOLD | HARMONY默认关闭；显式demo仅确定性只读建议，不调用LLM，不执行任务 |
| Notifications/Health secure entry | 未发现已批准的客户通知/患者敏感资料投影接线 | DEPENDENCY_HOLD | 通知空状态；无医疗文件、支付/合同操作或共享写入 |

## 最小Forward方案（设计，未编号，未生成SQL）

1. 先完成服务、日期、报告locator及权限摘要的客户只读契约：精确字段、来源/更新时间、对象/用途、审计、撤销及分页上限。沿用Person/Family/Student/Principal和既有public ID，不增第二套主数据。
2. 偏好若批准持久化，可提独立user preference对象：principal FK、经授权family scope FK、可空domain及project FK，唯一(principal,scope)，updated_at和并发version；domain受既有分类约束，project/family一致性触发器；只准当前主体写自己偏好，不能凭pin授予业务权限，受控函数写审计。跨设备保留、注销删除及审计期限待Founder明确。当前未批准，故无DDL或新编号。
3. 先核验0036/0037最终合并状态与编号，再为真正批准的增量提交独立Forward候选；不改0001–0037。
4. 真实身份仍需F1–F5：现有冻结参数沿用，缺实际环境/TLS/JWKS、受保护配置、运行SHA、账户映射/关系/用途和撤销运维事实。页面完成不关闭这些门禁。
