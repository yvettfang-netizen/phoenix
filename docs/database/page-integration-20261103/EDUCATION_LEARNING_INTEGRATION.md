# P0｜Education + Learning + 凤启学苑最小接入

**只读字段核查PASS；接口实现/页面接通NOT RUN；正式写入HOLD。**

代码：SOURCE_INDEX的edu-node-main/edu-http-main/edu-pg-adapter/edu-contract-main/learning-sql。main Node合同v1.1；6db8db05…的v1.2问卷/Pathway Fit属于另一分支，不能把旧桥接试验标作v1.2联通。保留现有问卷、规则、支付/AI默认关闭及Feishu只投影边界，不重写产品闭环。

| 当前字段/流程 | 唯一权威/适配方向 | 缺口与处理 |
|---|---|---|
| 旧family.id、userId、familyName、parentName、phone/location/goal | 既有Family/Principal及验证过的public ID；familyName可映射明确displayName合同 | Canonical0035不承诺旧DTO全部字段。不得按名称/手机号建主体，parentName不推断监护；额外profile字段HOLD |
| 旧student.id、familyId、name、age、school、grade等 | Student=既有Person+student_profile，合法Family关系和授权映射 | 未映射/歧义拒绝；age等不自动推导或写入不相干表；保持问卷版本，不把birthDate等虚构出来 |
| 评估/答卷/六模块报告/PDF | 原专业评估合同，逐项审查持久化/发布/撤回/版本 | 0035不是通用问卷存储；不塞进external_facts/任意JSON，不把收费报告等同Application |
| Course / Course Version / Teacher / Class | learning.course、course_version、teacher、class | Teacher复用Person/Principal，不新建独立教师身份；大学education.program不是学苑课程包 |
| Enrollment / Schedule / Attendance | learning.enrollment、schedule_slot、attendance_record/correction | 自助约课、改期谱系、取消时限、课时扣减尚缺业务合同，不能以改旧行或出勤反推课时余额 |
| 发布课后卡/阶段报告 | learning.after_class_card/publication/stage_report及现有受控read_* | 只读已发布且授权的摘要；遵守LEARNING_RECORD/LEARNING同意，不沿用Education Case同意替代 |

## 第一小步：只读课程目录，不做主数据写入

1. 在现有Node后端的独立开发分支增加默认关闭的`GET /v1/learning/catalog`，独立Canonical只读连接引用；不改旧DATABASE_URL，不跑旧migration到Canonical。
2. 精确调用已有learning.list_published_courses()，只输出courseRef/versionRef/courseCode/title/versionNo；空目录返回真实空数组，不放入生产示例课程或教师资料。
3. 官网学苑目录由可信API读取；不把UI状态或本地缓存当持久化。开发联调仅用生成的合成凭据/已发布合成课程，未知真实配置返回不可用。
4. PG16/17验证Draft/Retired/未来版本不可见、课程与版本引用准确、DB权限最小化、断连/错误无demo回退、日志无凭据/PII、页面请求确实命中受控函数。

这一小步复用0035，不需要0036或新增Person/Family/Student。**本轮只提交方案，没有实现或执行该新链路。**

第二小步才做合法Family/Student最小投影及已发布学习摘要；须先补真实身份/映射和字段版本合同。主数据与Projection必须同一授权事务/上下文，不可只查RLS后再把旧Store全量对象直接返回。进一步评估/报名写入、未成年人授权、课时/财务及外部事件协议分别保持HOLD。
