# Phoenix Nova｜双窗口正式归档与统一交接 V1.0

**整理日期：2026-11-23**  
**原窗口**：《架构审查与产品设计》《核对 GitHub 进度》（又名《核对GitHub进度》）  
**状态：历史窗口达到长度上限；本档案为“可获取历史记录 + 当前 GitHub 实证”整理，不声称读到两段对话的全部逐字内容。**

## 使用与证据等级
- **Founder 决策**：从可恢复历史对话及已合并 PR 的决策记录还原，必要时应以正式审批记录核对。
- **GitHub 实证**：直接核对 `yvettfang-netizen/phoenix` Pull Request 元数据及对应 HEAD 的 GitHub Actions 结果；状态会随时间改变。
- **待复核**：尚无人工执行回执、未逐字恢复的历史内容、部署和生产环境实况。不得将 Draft、CI 通过、候选 SQL 当作已发布/已安装。

---

# C. 两窗口合并后的新聊天交接基线

**建议新窗口名**：`Phoenix Core｜架构与 GitHub 统一执行 03`  
**唯一工程执行底线**：先读取当前 GitHub 真值，以已合并 #88/#90 为已审计基础；#85/#86/#89/#91/#92/#93/#94/#95/#96 都视为未合并候选，不重复新建相同功能。

## 下一步三件事
1. **先消除冲突及失败证据**：定位 PR #92 当前 HEAD 的 PG smoke failure，检查 #89/#91 的撤权逻辑重叠及与 #92 的结合，选择单一有效实现路径，不允许重复安装。
2. **闭合 Package A 安全验收**：在隔离 PG16/17 下验证 Student 默认、Parent 可信切换、全局 STAFF Consent、Teacher/Admin 权限、到期/主动撤权、跨家庭默认拒绝、RLS/ACL、审计、复用 session 和回滚；补清楚旧 Education 物理退役的具名人工回执。
3. **保留 B/C 独立候选，并推动最小网站上线审查**：#94/#95 先独立验证和安全复审；ASKWISE、Family OS、观澜台仅按已证明的接口和权限分阶段接入。另列官网最小上线阻断清单，不因尚未批准的后台商业/测评完整功能拖延网站发布。

## 人力与审批
- Codex：代码、测试、文档、GitHub 可自动完成的工作；玄武负责独立安全复审（模型复审不得冒充人工签名）。
- Jimson：仅执行经许可、必须人工操作的指定非生产环境只读/清理核验，提交时间与证据回执。
- Founder：批准策略、合并、共享环境安装、生产变更及发布；先前同意候选开发不自动扩大授权。

## 资料源
- GitHub 主仓库：https://github.com/yvettfang-netizen/phoenix
- 关键已合并设计：https://github.com/yvettfang-netizen/phoenix/pull/90
- 旧环境代码退役：https://github.com/yvettfang-netizen/phoenix/pull/88
- 仍待解决的身份候选：https://github.com/yvettfang-netizen/phoenix/pull/92
- 聊天归档候选：https://github.com/yvettfang-netizen/phoenix/pull/96

**局限**：尚未逐字读取这两个完整旧窗口；以上为可靠历史片段与实际 GitHub 状态汇编，未证实的旧窗口讨论不做补写。亦未检查任何生产环境或真实数据库实例，因此生产安装/部署一律视作“本轮未核验”，不是凭此断言绝对没有发生。