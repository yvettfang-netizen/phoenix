# ASKWISE／凤启学苑／启明堂映射

**源代码核验PASS；正式映射/导入HOLD；新增端到端NOT RUN。** 公众真人教学服务为凤启学苑，内部学习空间为启明堂，AI学习产品为ASKWISE™｜问思；名称不产生第二法人/学生/教师/课程主数据，也不把学苑变成所有学生的必经步骤。

ASKWISE独立试点源644fab93ccfdd7557c432c57363873c7f62ed9be：SQLite、pilot鉴权、`/api/pilot/v1/[...path]`、source-qualified导出、Mock Compass handoff/writeback已核验。`canonical_student_id`为NULL占位；mock环境/fixture诊断不证明访问Canonical。main仍是另一份SQLite学习原型，不能混用版本。

私有phoenix-academic-studio：main c32534fc…与hardening13e1418d…是契约/骨架；aoyu-companion-gate1 f08dad49…有课程/课次/任务/学生/导师UI及mock-data原型，未发现Canonical持久化适配器。其旧草案的“Core owns orders/payments”不自动成为本轮Finance权威批准。

| 来源对象 | 目标/复用 | 规则 |
|---|---|---|
| ASKWISE students.id | source-qualified外部引用→已有Student/person | 不覆盖来源ID，不按姓名/相似邮箱匹配，不通过解析stu_获得权限 |
| daily_tasks / learning_sessions | 来源任务/会话，关联合法Student与学习对象 | 不映射为商业service.tasks；保留task/session/experiment归属 |
| attempts / diagnoses / hints / retry / evidence / reflection | 来源不可变证据引用、实际可用版本与时间 | 不伪造历史rule/model revision、timezone、Consent或更新时间；不复制原始照片/反思正文到Timeline |
| 学苑program/course/version | learning.course与course_version的显式交叉表 | 不把大学education.program、课程包和学习课程当同一种主键 |
| tutor / student / enrollment / class | 既有Person/Teacher/Student、learning.enrollment/class/teacher_assignment | 学苑独立认证与重复主表禁止；UI mock ID没有权威 |
| lesson / schedule / attendance / card | learning.schedule_slot、attendance_record/correction、after_class_card/publication | 复用既有发布/撤回，不以出勤自动扣款或扣课时 |

现有integration.legacy_id_mappings支持STUDENT_PROFILE语义，但0024/0025受控Family映射API限定PHOENIX_FAMILY_OS/FAMILY，不能直接当ASKWISE学生登记函数。没有已核实的integration.external_id_map。先审source/Student映射的登记、独立复核、有效期/撤销和冲突修正，再拟必要的窄Forward函数；禁止绕过权限直接INSERT或新建Student表。

拟议API：受控学生映射查询、已批准学习证据元数据接收、已发布学习摘要读取。字段最少包含source system/table/row/version、existing student reference、evidence reference/hash、occurredAt及明确时区、规则版本（仅真实有值）、payload hash/幂等键。字段缺失或source key冲突拒绝/待审，不生成猜测值。

权限：学生/合法监护、有效班级教师、获批主管分别按0022边界；伙伴/普通顾问不得读取学习证据；SERVICE不能代表学生作出同意。测试清单：跨学生/家庭、未映射/改绑、Consent撤回、教师过期、重复事件、异payload重放、源撤回、发布时间/时区、未发布卡、AI无来源结论、无课时/财务副作用。全部仅合成记录。

本轮未打开任何试点DB、上传图片、学生页面或真实记录，未修改私有学苑工程、旧SQLite与Founder经营资产。P0先课程目录，P3再接学习证据，不能以“接通ASKWISE”为由跳过映射与治理。
