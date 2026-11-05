# Phoenix Meta × Canonical Integration V2.0

任务 PHOENIX-META-CANONICAL-INTEGRATION-20261105；审查日期 2026-11-05（Asia/Shanghai）。状态：LOCAL CANDIDATE / HOLD，非生产验收。

## 数据权威与状态

唯一Schema/Migration发布来源为phoenix/main database/canonical；本轮固定b9bf574，0001–0035不修改。主README仍含pre-merge措辞，不能据此否定实际已合并代码；现有PR39处理权威文档，不在此重复创建数据库。

0036为[PR41](https://github.com/yvettfang-netizen/phoenix/pull/41)，0037为[PR48](https://github.com/yvettfang-netizen/phoenix/pull/48)，本轮查询均OPEN，不能视为已安装。无新迁移文件或号码预留。

详细物理对象证据在本文件后续补充。逻辑Actor/Spirit/Task/Decision不得按名字猜物理表。Meta不可另建Person/Family/Student/Service主表。

## 最小Forward设计候选（不执行）

1. 复用auth.principals及service principal机制；增加受控Spirit registry/capability映射前先确认现有principal约束。Spirit正式code固定九项，Phoenix唯一orchestrator；不得一Spirit一客户库。
2. 企业工作与协作元数据只引用既有org/client/family/person/service/learning ID，强FK与作用域一致性；业务内容仍由原模块负责。service task可用于交付任务，不把所有跨灵咨询强塞为service task。
3. Founder decision/gate应有proposal version、source evidence、human approver、F等级、对象范围、状态、approved_at/expires_at、expected version；append-only决策事件及不可复用执行授权。具体表名待Jimson审查。
4. Collaboration session记录Phoenix request/parent、最少Spirit集合、assignment、handoff和synthesis引用；tool invocation记录服务身份/人类身份、对象scope、结果与audit reference。禁止保存原始医疗资料或无价值长对话。
5. READ审计优先复用经审查0037候选，若未合并需独立确认最小方案；不能复用事务内普通审计冒充不可回滚审计。证据引用必须有源版本、核验时间、许可范围、生命周期。

交付数据字典至少含字段类型、NULL语义、FK、unique、状态转换、RLS策略、App/Binder grants、审计、幂等、过期与撤销。所有新增SQL待Schema gap确认后独立Forward PR，编号在创建时重新核对远端，不占用0036/0037。

## 已复核物理映射（0001–0035）

下列路径均相对database/canonical/migrations，行号基于b9bf574；已抽读principal、service assignment、Learning RLS/grants复核。

| 逻辑对象 | 实际对象 / 关键字段 | 代码位置 | 判定 |
|---|---|---|---|
| 人 / 家庭 / 学生 / Consent | core.people/families、student profiles、guardian authority、consent.grants | 0003:26–136 | 复用唯一主数据，学生不是Agent的私有实体 |
| Principal | auth.principals: principal_id/person_id/principal_kind/status；SERVICE服务标签且person_id NULL | 0003:65；0012:3–24；0022:8–10 | SERVICE可复用，但无AGENT种类、Spirit registry/capability模型 |
| Agent注册 | auth.install_service_principal | 0013:17 | 只是SERVICE安装能力，不能当Spirit授权完成 |
| 项目任务 / assignment | service.projects/tasks/task_events/project_assignments；principal_id/assignment_role/valid_from/valid_until | 0028:11–173，85–97 | 项目任务可复用；跨灵协作/F等级需补充 |
| 其他assignment | casework.advisor_assignments；learning.teacher_assignment；crm.sales_assignments | 0004:15；0022:99；0033:76–87 | 不可假扮ADVISOR或TEACHER获取Spirit权限 |
| 企业客户 / CRM | core.organizations、crm.clients、leads/consultations/deals/follow_ups | 0026:73–115；0027:5–237 | 复用，服务边界以0031–0035后续治理为准 |
| 上下文 | auth.session_contexts:backend_pid/principal_id/actor_person_id/family_id/request_nonce/expires_at | 0003:72；0012:13–24 | INTERNAL通道actor=NULL，故Meta人类initiator必须额外关联，不能声称现成双身份审计完整 |
| 一次票据 | auth.context_exchange_tickets，intended-principal，60秒上限；issue/redeem | 0007:74–144、232–293 | 复用并进行重放、过期、错身份负例 |
| Family身份解析 | auth.issue_application_family_context_ticket，binder-only | 0023:7–89 | 外部身份+FamilyOS映射，不等于企业Agent binder |
| 清理 | auth.cleanup_stale_contexts / cleanup_ephemeral_state | 0007:54–72；0008:151–183 | 不能代替每次归还池连接清理与验证 |
| 审计 | audit.access_events、record_access_event、record_write_decision；attempt_id/LOG、request_nonce | 0003:136–274；0009:78–93；0014:3–32；0017:86–125 | 具基础审计，尚无专门tool invocation；READ保护需独立契约 |
| 证据 | 各领域evidence_ref/evidence_sha256/verified_at | 0011:4–12；0013:11–15；0025:7–18 | 域内字段非通用Meta证据注册表 |
| Founder Decision/Gate | 没有专门物理对象/F0–F3状态机；crm.lead_merge_decisions仅Lead合并记录 | 全量35迁移对象搜索 | EVIDENCE_MISSING，不强行映射 |
| Collaboration/Tool | 没有专门session/invocation/capability对象 | 全量35迁移对象搜索 | Forward差额，不能以日志自由文本充当完整模型 |

## 权限关键缺口

CRM及Service表使用FORCE RLS及phoenix_canonical_app策略（0027:527–576；0028:395–472），不能因为reader能读core就给Meta全表读取。Learning 0022:920–961强制USING(false)并撤销直接表权限，仅给予list_published_courses/read_published_card/read_published_stage_report等审计函数执行权限；ASKWISE必须沿用这些许可。

新Meta只读projection至少需要：来源对象/版本/核验、企业与Spirit scope、非敏感字段allowlist、可持久关联的读取审计，以及最小EXECUTE grants。未有此层之前，default-off适配不可启用。Schema文件存在不证明任何生产集群账本达到0035。

## 独立数据字典：Forward差额候选

以下均为逻辑记录定义，未声明已有物理表或分配Migration编号。所有记录ID建议沿用Canonical uuid-v7；引用必须强FK，不能用自由文本代替对象授权。

| 逻辑记录 | 必要字段 / 候选类型 | NULL、唯一及作用域约束 |
|---|---|---|
| SpiritBinding | binding_id uuid；spirit_code text；principal_id uuid FK auth.principals；status text；version bigint；valid_from/valid_until timestamptz | code限正式九项；有效binding唯一；principal必须ACTIVE SERVICE；until可NULL表示未结束；不自提升权限 |
| CapabilityGrant | grant_id uuid；binding_id uuid FK；capability text；organization_id uuid FK；resource_kind text；resource_id uuid；purpose text；valid_until timestamptz；revoked_at timestamptz | 首期read-only，必须明确scope，revoked_at可NULL；不同resource kind使用独立FK/关联表，禁止无法验证的多态FK |
| Collaboration | session_id uuid；phoenix_binding_id uuid FK；parent_session_id uuid；request_nonce uuid；status text；source_version bigint；opened_at/closed_at timestamptz | Phoenix必须01，参与者独立assignment关联；parent/closed可NULL；跨scope摘要重新鉴权 |
| EvidenceLink | evidence_id uuid；source_system text；source_object_reference text；source_version text；verified_at timestamptz；permission_policy_reference text；status text；owner_principal_id uuid FK | 未核验项verified_at可NULL且不可进入VERIFIED投影；不存原件/患者资料；授权后解析引用 |
| FounderGate | gate_id uuid；proposal_reference text；proposal_version bigint；level text；state text；human_approver_principal_id uuid FK；approved_at/expires_at timestamptz；evidence_id uuid FK | level F0-F3；PENDING无approver/approved_at；APPROVED必须有可核实人类Founder和exact scope/version；版本变更使旧approval失效 |
| ToolInvocation | invocation_id uuid；request_nonce uuid；binding_id uuid FK；initiator_principal_id uuid FK；capability_grant_id uuid FK；gate_id uuid FK nullable；action text；object_scope_reference text；result text；audit_reference text；started_at/finished_at timestamptz | 禁止payload原文敏感信息；F3动作必须gate；审计缺失拒绝成功；timeout也必须有结果事件 |

既有service.tasks/project_assignments承载真实交付任务；Meta只补充协作映射，不创建第二服务项目或客户主库。新记录写API本期无授权，字典不是可执行SQL。

Forward实施顺序：审查既有0037候选→确认Agent绑定模型→先最小只读projection与audit→synthetic PG16/17权限矩阵→独立Founder审查。新表全部FORCE RLS，角色仅授特定SECURITY DEFINER函数EXECUTE，固定search_path、撤销PUBLIC、拒绝任意动态SQL；事务、审计、并发幂等与回滚契约须在独立PR给出。禁止仅靠UI按钮或等级字段授权。
