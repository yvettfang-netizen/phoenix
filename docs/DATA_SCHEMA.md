# Data Schema V0.1

| Model | Core relation | MVP use |
| --- | --- | --- |
| User | `id`, `wechat_id`, `role` | 家庭用户 / 顾问身份 |
| Family | `user_id` | 家庭关系主档案 |
| Student | `family_id` | 孩子成长档案 |
| Compass_Assessment | `student_id`, `type` | Education Compass 回答 |
| Compass_Report | `assessment_id` | 成长洞察与行动建议 |
| Timeline_Event | `family_id` | 家庭关系历史 |
| Advisor_Note | `family_id`, `advisor_id` | 内部备注和跟进状态 |
| Advisor_Request | `family_id`, `user_id` | 家庭主动请求人工联系 |
| Partner_Exploration | `family_id`, `student_id`, `partner_experience_id` | 音乐探索回答与“探索起点”结果 |
| Partner_Application | `family_id`, `user_id`, `partner_experience_id` | 联合体验申请与隐私授权记录 |
| Analytics_Event | `user_id`, `family_id` | 激活、Compass、联系与 7/30 日回访指标 |
| Partner | — | 空模型，未来专家身份占位 |
| Permission | `family_id`, `partner_id` | 空模型，未来家庭授权占位 |

`Compass_Assessment.type` 当前只写入 `education`；枚举已保留 `culture / health / identity / wealth`，但没有任何对应页面或功能。

新提交的 Education Compass assessment 可包含 `sync_requested_at`，表示用户本次提交已产生后端同步意图。该字段用于在 outbox 写入中断后恢复任务；没有该字段的历史 assessment 不会自动上传。

`User.role` 当前只使用 `family_user / admin`；`partner_expert` 仅为未来角色枚举，不创建账号，也不提供入口。

本地物理表名为代码可读的复数形式：`users`, `families`, `students`, `assessments`, `reports`, `timelineEvents`, `advisorNotes`, `advisorRequests`, `analyticsEvents`, `partners`, `permissions`。

Partner Experience 的内容定义位于 `data/partner-experiences.js`，类型契约位于 `models/partner-experience.d.ts`。V0.1 首个配置为 `yuanchao`，状态为 `preview`；合作页面不把合作方文案硬编码到组件中。

## Controlled Local Demo backend schema

`backend/migrations/001_questionnaire_submissions.sql` 增加一套独立的本地 SQLite 接收层，不替代上述 `PFS_DB_V01`：

| Backend table | Core relation | Local Demo use |
| --- | --- | --- |
| `users` | unique `(auth_provider, provider_subject)` | 安装级 Local Demo user，不是微信身份 |
| `demo_sessions` | `user_id`, hashed bearer token, expiry | 短期本地会话；数据库不保存明文 token |
| `families` | `user_id` | synthetic family ref 的 session ownership |
| `students` | `family_id` | synthetic student ref 的 family ownership |
| `questionnaire_submissions` | user/family/student FK; unique `(user_id, client_submission_id)` | Education Compass answers、来源与接收时间 |
| `audit_log` | actor/resource/family/time | 元数据级 create/duplicate/session 事件，不包含答案正文 |
| `schema_migrations` | migration name | 已应用迁移 ledger |

问卷答案以 JSON 存储，但服务端只允许当前 10 个 Education Compass key，并限制字段长度、列表大小和整体请求体。该 SQLite schema 没有生产级 Consent、retention、export、deletion、encryption 或正式 RBAC，因此禁止真实家庭和未成年人数据。
