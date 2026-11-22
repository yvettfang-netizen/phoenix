# Phoenix Nova｜双窗口正式归档与统一交接 V1.0

**整理日期：2026-11-23**  
**原窗口**：《架构审查与产品设计》《核对 GitHub 进度》（又名《核对GitHub进度》）  
**状态：历史窗口达到长度上限；本档案为“可获取历史记录 + 当前 GitHub 实证”整理，不声称读到两段对话的全部逐字内容。**

## 使用与证据等级
- **Founder 决策**：从可恢复历史对话及已合并 PR 的决策记录还原，必要时应以正式审批记录核对。
- **GitHub 实证**：直接核对 `yvettfang-netizen/phoenix` Pull Request 元数据及对应 HEAD 的 GitHub Actions 结果；状态会随时间改变。
- **待复核**：尚无人工执行回执、未逐字恢复的历史内容、部署和生产环境实况。不得将 Draft、CI 通过、候选 SQL 当作已发布/已安装。

---

# A. 《架构审查与产品设计》窗口归档

## 1. 核心目标
尽快将 Phoenix Nova 网站和服务体系投入可用运营，同时保持 Phoenix Core / Canonical PostgreSQL 作为唯一身份与授权来源；逐步连通 Education/Academic Studio、Family OS、ASKWISE、Service Project 和 Phoenix Meta 观澜台，不新建重复身份体系或重复数据库，不让非关键模块推迟官网上线。

## 2. 确认的边界与 Founder 决策
1. **一个 Person / 一个 Canonical Principal**；学生、家长、教师是同一基础身份上的独立、按事实授予的授权能力；仅 Academy Admin / Founder 走受控、可撤销的管理授权。
2. Student 默认进入本人视图；Parent 切换需可信服务端授权，并检查有效家庭成员关系、合法 Guardian Authority、资源范围内 Consent；STAFF / Teacher 等按权限最小化和缺省拒绝执行。必须解决家庭关系到期后“原绑定会话继续读取”的问题。
3. **老师安排 Online / Onsite / Hybrid**，并由有效 LEAD teacher 分配 Hybrid 每位学生的线上或线下方式；学生、家长不能自行更改；Hybrid 同时有线上和线下参与者才成立。
4. 课时包、扣减、补课、退款、教师结算的商业规则 **HOLD**；不得假定已经批准。
5. 六套测评 CAT4、DSE、A-Level、IELTS、JLPT、粤语各自保留原版次、量表、来源、审核与授权，不自动换算/混合总分；测评归学生主体，不强制归属唯一家庭。
6. 全球共享、获得许可的教学材料，与家庭/项目私有文档分开；同一私有文档版本被多项目引用时，各项目必须独立授权、Consent、审核与审计；不得自动继承另一个项目的审批。
7. Phoenix Core 管理身份/授权；Academy 管教学业务与人工审核报告；ASKWISE 管学习引擎推理/证据语义；Family OS 仅展示已发布且当前有权查看的摘要。
8. Canonical 正式迁移基线为 **0001–0037**；不因旧数据库内容已无价值就迁移旧数据。旧代码退役不等于旧服务器/数据库已物理删除。
9. Codex、自动化检查与玄武可完成的工程/审查工作不交给 Jimson；Jimson 仅承接确需人工登录环境执行的任务并提供证据。Founder 独立决定合并门禁、共享环境数据库安装和生产部署；设计批准≠生产批准。

## 3. 恢复的工程历史
- PR #85：Academic Studio V2.1 P0.1 技术与安全证据审查，**Draft/HOLD**。既往隔离 PG16/17 及文档审查发现家庭关系失效后仍可读取、教室/学生排课冲突未被拦截、Student/Parent 默认路由与六类测评契约未就绪。PR 正文记录某一旧 HEAD 的 8/8 CI 通过，不能直接替代当前 HEAD 验收。
- PR #86：Education Data Contract V2 设计审查，**Draft/HOLD**。复用授权、共享材料/私有文档隔离、ASKWISE 职责边界已写入设计；20 项行为/拒绝测试是验收要求，并非已经 PASS。
- PR #88：移除旧 Education 运行脚本与运维路径，**已合并**。明确无需迁移旧库数据；旧环境物理停用/删除仍应以人工回执核对。
- PR #90：Academic Studio V2.1 P0.1 最小 Canonical 架构设计，**已合并，设计获 Founder 批准**，只放行分支候选 SQL 和一次性/隔离 PG16/17 合成测试，不放行真实库安装或生产发布。
- PR #89 / #91：两条家庭关系即时撤权修复候选，**均 Draft**，涉及同一个敏感读取函数，必须核对重复覆盖、避免双重安装。
- PR #92：Package A 身份/Context/STAFF Consent/管理授权候选，**Draft**，含未编号 SQL；当前 HEAD 的 isolated PG smoke 有失败工作流，其余部分工作流仍在执行，不能晋级。
- PR #93：Academy Admin/Founder 最小授权 A1 候选，**Draft**，隔离测试记录成功，不得将此视为主库安装许可。
- PR #94：教师主导排课、共享教室、学生时段冲突 B0 候选，**Draft**，隔离测试记录成功，仍缺生产排课所需的时区/容量/变更/Consent 等端到端门禁。
- PR #95：六类测评 C0 数据契约候选，**Draft**，隔离测试记录成功，未完成报告发布、第三方授权与保留期、角色/Consent 集成。

## 4. 未完成/阻断
- 统一 Principal、Student/Parent/Teacher 独立权限、STAFF Consent、即时撤权、RLS、审计及复用会话测试的完整闭环。
- PR #89/#91 去重以及 #92 当前失败 CI 的根因定位与修复。
- 旧 Education 物理资源清理的具名人工回执；需区分停用、删除和未受影响的正式 Canonical。
- Package B/C 端到端验收；ASKWISE / Family OS / Service Project / 观澜台真实服务接入，均不能从候选 PR 推断已经完成。
- PR 合并、共享数据库安装、正式发布分别独立审批；保持“尽快上线最小可用官网”与“后台系统完全放行”两条不同发布路径。

---
