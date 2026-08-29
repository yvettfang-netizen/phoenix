# Phoenix Family OS™ Engineering Memory Setup Report V1.0

- Lesson: 4｜Engineering Memory Setup
- Setup date: 2026-08-15（Asia/Shanghai）
- Repository: `Phoenix Family OS/phoenix-family-os-mvp`
- Branch: `codex/phoenix-family-os-v0.1-closeout`
- Memory source baseline: `bb972f030994a35a1e81bd0d38ff502410127b84`
- Setup scope: documentation only
- Business code changes: 0

## 1. 完成内容

建立 `docs/engineering-memory/` 长期工程记忆目录，并创建四个职责分离的记忆文件：

| 文件 | 记忆职责 |
| --- | --- |
| `PROJECT_CONTEXT.md` | 项目目标、产品定位、版本、技术范围和禁止事项 |
| `ARCHITECTURE_MEMORY.md` | 当前真实架构、页面、数据模型、数据流、权限和扩展边界 |
| `ENGINEERING_DECISION_LOG.md` | 已确认工程决策的 append-only 记录 |
| `CHANGE_MANAGEMENT_RULES.md` | 修改、checkpoint、测试、发布和回退流程 |

本报告作为 Setup 证据和后续维护入口。

## 2. 信息来源

- Repository root `AGENTS.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SCHEMA.md`
- `docs/codex-audit/CURRENT_BASELINE.md`
- `docs/codex-audit/DEVELOPMENT_READINESS_REPORT_V1.0.md`
- `docs/codex-audit/SPRINT_1_PLAN.md`
- `docs/codex-audit/SPRINT_1_ENGINEERING_REPORT_V1.0.md`
- `docs/codex-audit/ACCEPTANCE_TEST_PLAN_V1.0.md`
- `docs/codex-audit/ENGINEERING_HANDOVER_REPORT_V0.1.md`
- `docs/codex-audit/FAMILY_GROWTH_CORE_ENGINEERING_INSPECTION_V1.0.md`
- 当前真实代码、配置、schema、services、pages 和 tests inspection 结果

## 3. 记忆体系设计

```text
AGENTS.md
└─ Engineering governance
   └─ docs/engineering-memory/
      ├─ PROJECT_CONTEXT.md
      ├─ ARCHITECTURE_MEMORY.md
      ├─ ENGINEERING_DECISION_LOG.md
      ├─ CHANGE_MANAGEMENT_RULES.md
      └─ ENGINEERING_MEMORY_SETUP_REPORT_V1.0.md
```

设计原则：

- Context 与 Architecture 分离，避免产品目标和实现事实混写。
- Decision Log append-only，保留为什么这样设计。
- Change Rules 独立维护，便于企业流程审计。
- 当前实现与目标架构明确分开，未实现内容不写成完成。
- Memory 只存长期有效事实；一次性命令日志保留在 QA/Engineering Report。

## 4. 已固化的关键记忆

- 当前 MVP 核心闭环和产品边界。
- 原生微信小程序、本地 Repository/Store 和规则 AI 架构。
- 15 个页面、13 个本地逻辑表、Brand Mark 和权限现状。
- 当前真实身份、数据、API、RBAC、Consent/Audit 限制。
- 非破坏性数据 normalization、安全区、品牌允许清单等已确认决定。
- Sprint 1 后默认进入受控 Acceptance Testing。
- Public RC 和 Family Growth Agent™ 当前均保持 HOLD/NO-GO。
- 七阶段开发流程、checkpoint、测试证据和发布授权要求。

## 5. 未改变内容

- 未修改任何 `.js`、`.json`、`.wxml`、`.wxss` 或 `.d.ts`。
- 未修改 schema、Storage、用户数据或 migration。
- 未修改页面、路由、服务、AI 规则或测试。
- 未修改、替换或生成 Logo/品牌资产。
- 未配置 remote、未 push、未 deploy、未上传或提交微信审核。

## 6. 验证方式

本次属于 C0 文档/记忆变更，验证范围：

- Git 差异只允许位于 `docs/engineering-memory/`；
- 五个 Markdown 文件存在；
- 必需标题和章节完整；
- `git diff --check` 无空白错误；
- Business code test：NOT RUN，因为业务代码和配置未改变。

## 7. 风险

### P0 / P1

- 本次文档变更未引入新的 P0/P1 工程风险。
- 项目既有生产身份、数据权限和微信验收阻断保持不变，并已写入记忆。

### P2

- 长期记忆可能随代码演进过期。缓解措施：每个架构/范围决策的 Definition of Done 包含相应 Memory review。

### P3

- 后续可在团队工具中增加自动文档 freshness 检查，但不在本轮实施。

## 8. 回退

本次只新增文档。提交后可用单一 documentation-only `git revert <memory-setup-commit>` 回退，不影响业务实现或用户数据。

## 9. 下一步唯一建议

下一次任何工程任务开始时，先按顺序读取：

1. `AGENTS.md`
2. `docs/engineering-memory/PROJECT_CONTEXT.md`
3. `docs/engineering-memory/ARCHITECTURE_MEMORY.md`
4. `docs/engineering-memory/ENGINEERING_DECISION_LOG.md`
5. `docs/engineering-memory/CHANGE_MANAGEMENT_RULES.md`

随后再进入 Phase 1｜Understand，并记录本次任务的 repository、branch、SHA 和实际证据。
