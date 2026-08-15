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

`User.role` 当前只使用 `family_user / admin`；`partner_expert` 仅为未来角色枚举，不创建账号，也不提供入口。

本地物理表名为代码可读的复数形式：`users`, `families`, `students`, `assessments`, `reports`, `timelineEvents`, `advisorNotes`, `advisorRequests`, `analyticsEvents`, `partners`, `permissions`。

Partner Experience 的内容定义位于 `data/partner-experiences.js`，类型契约位于 `models/partner-experience.d.ts`。V0.1 首个配置为 `yuanchao`，状态为 `preview`；合作页面不把合作方文案硬编码到组件中。
