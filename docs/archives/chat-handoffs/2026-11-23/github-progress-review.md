# Phoenix Nova｜双窗口正式归档与统一交接 V1.0

**整理日期：2026-11-23**  
**原窗口**：《架构审查与产品设计》《核对 GitHub 进度》（又名《核对GitHub进度》）  
**状态：历史窗口达到长度上限；本档案为“可获取历史记录 + 当前 GitHub 实证”整理，不声称读到两段对话的全部逐字内容。**

## 使用与证据等级
- **Founder 决策**：从可恢复历史对话及已合并 PR 的决策记录还原，必要时应以正式审批记录核对。
- **GitHub 实证**：直接核对 `yvettfang-netizen/phoenix` Pull Request 元数据及对应 HEAD 的 GitHub Actions 结果；状态会随时间改变。
- **待复核**：尚无人工执行回执、未逐字恢复的历史内容、部署和生产环境实况。不得将 Draft、CI 通过、候选 SQL 当作已发布/已安装。

---

# B. 《核对 GitHub 进度》窗口归档

## 1. 窗口职责
复核工程话术与 GitHub 真实状态是否一致：仓库、PR/HEAD SHA、代码与文档变更、CI/PG16/17、权限及撤权负向测试、独立审查、批准、合并、安装、部署证据。禁止把 Draft 当作合并、把 CI 绿色当作安全验收、把代码退役当作物理资源清除。

## 2. 截至 2026-11-23 当前可核对 PR 状态
| PR | 功能 | GitHub 状态 | 本轮核对信息 |
|---|---|---|---|
| [#85](https://github.com/yvettfang-netizen/phoenix/pull/85) | P0.1 技术审查 | Draft，未合并 | 已知历史安全缺口，维持 HOLD |
| [#86](https://github.com/yvettfang-netizen/phoenix/pull/86) | 教育数据契约审查 | Draft，未合并 | 设计边界明确，未运行目标 SQL 的正式验收 |
| [#88](https://github.com/yvettfang-netizen/phoenix/pull/88) | 旧 Education 运行路径退役 | **Merged** | Merge SHA `5b7777e1e4b4…` |
| [#89](https://github.com/yvettfang-netizen/phoenix/pull/89) | 撤权修复 0045 | Draft，未合并 | HEAD 相关工作流显示 success；与 #91 存重叠 |
| [#90](https://github.com/yvettfang-netizen/phoenix/pull/90) | 学苑 P0.1 最小架构 | **Merged** | Merge SHA `291032fef622…`；仅设计授权 |
| [#91](https://github.com/yvettfang-netizen/phoenix/pull/91) | 撤权修复 A0 | Draft，未合并 | HEAD 相关工作流显示 success；与 #89 重叠 |
| [#92](https://github.com/yvettfang-netizen/phoenix/pull/92) | Package A 身份授权候选 | Draft，未合并 | 当前 HEAD `3c57395a…`：独立 PG smoke **failure**，部分工作流 **in progress** |
| [#93](https://github.com/yvettfang-netizen/phoenix/pull/93) | A1 管理授权候选 | Draft，未合并 | HEAD 对应所列工作流 success |
| [#94](https://github.com/yvettfang-netizen/phoenix/pull/94) | B0 老师排课候选 | Draft，未合并 | HEAD 对应所列工作流 success，生产性门禁未完 |
| [#95](https://github.com/yvettfang-netizen/phoenix/pull/95) | C0 六类测评候选 | Draft，未合并 | HEAD 对应所列工作流 success，端到端门禁未完 |
| [#96](https://github.com/yvettfang-netizen/phoenix/pull/96) | 聊天窗口归档索引 | Draft，未合并 | 文档候选；只见部分工作流 success，不等于已归档这两个满额窗口 |

> CI 记录来自本次直接读取对应 commit 的 GitHub Actions 工作流。#85 的旧 SHA 成功结果不可自动用于现时 HEAD；#96 未取得全量通过证据。本表不是合并授权或生产验收报告。

## 3. 历史结论与窗口合并决策
历史核查已确认 #88、#90 合并，#89/#91/#92/#93 当时为 Draft。随后出现新的 #94–#96，本次补入。用户明确要求将 GitHub 核对职能合并至架构主工程窗口：**先核查、后修改、再验收**；同一问题不得在两个窗口独立开 PR 或重复跑并行迁移。

## 4. 安全门禁
每轮至少给出：**repo / PR / HEAD SHA / state / CI 结果与时间 / PG16/17 具体范围 / 审查缺口 / Founder 批准范围 / 安装部署实际状态 / 人工动作及回执**。没有证据写“未核验”；不要用旧 HEAD 检查取代新 HEAD 检查。生产继续以单独明确授权为前提。

---
