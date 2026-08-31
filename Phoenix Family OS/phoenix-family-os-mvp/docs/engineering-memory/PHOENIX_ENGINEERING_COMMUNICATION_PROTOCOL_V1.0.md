# Phoenix Engineering Communication Protocol V1.0

- Organization: Phoenix Nova™
- Protocol owner: Phoenix Nova™ AI Engineering Lead
- Version: 1.0
- Effective date: 2026-08-15（Asia/Shanghai）
- Status: Active engineering communication protocol
- Scope: Phoenix Nova™ engineering projects, subject to each repository's `AGENTS.md`, approved product contract and release rules
- Parent governance: repository `AGENTS.md`, Phoenix Sprint Execution Protocol and project Change Management Rules

## 1. Purpose

本 Protocol 定义同一工程事实如何面向 CEO、Product Owner、Engineering、QA 和接手人员进行准确、可执行、可追踪的表达。

沟通目标不是增加报告数量，而是保证：

- 不同角色获得与其决策职责匹配的信息；
- 所有结论来自同一真实 repository、branch、SHA、测试和风险底座；
- 风险、阻断、范围变化和所需决策不会被技术细节或乐观措辞掩盖；
- 未运行、未配置或被阻断的检查不会被写成 PASS；
- 任何接收者都能明确知道当前状态、责任人和下一步。

## 2. Communication principles

### 2.1 One source of engineering truth

每份正式工程沟通必须先确认：

- Project Name 和 Canonical Project ID；
- Repository 绝对路径或远程标识；
- Branch；
- Commit SHA；
- Current Version；
- Worktree status；
- 报告时间与时区；
- 当前开发/测试/发布阶段。

不得跨项目复用状态。Phoenix Family OS、Phoenix Website、AI Lab、Knowledge System 或其他项目必须分别引用自己的 repository、规则、CHANGELOG 和 Release Gate。

### 2.2 Outcome first

所有报告先写结论，再写证据：

```text
Outcome / Status
→ Impact
→ Risk / Blocker
→ Evidence
→ Decision or Next Action
```

不得用长篇过程描述延迟暴露 P0/P1、范围偏移、测试失败或决策缺口。

### 2.3 Evidence before confidence

- `PASS` 必须有实际执行的测试、检查或已签字人工验收证据。
- 命令必须记录 exit code、关键输出、覆盖范围和证据位置。
- 静态 validator 不得描述为平台编译；模拟器不得描述为真机；客户端 guard 不得描述为生产 RBAC。
- 文档设计、未来计划或模型名称不等于已实现功能。
- 推断必须标记为 `INFERENCE`，并说明依据和待验证项。
- 不得删除或改写失败记录来制造连续成功的表象。

### 2.4 Scope fidelity

报告必须区分：

- `Implemented`：代码或配置已经实现；
- `Verified`：实现已经在明确环境和范围内验证；
- `Documented`：仅形成文档或决策记录；
- `Partial`：部分实现或部分验收；
- `Deferred`：经批准延期；
- `Blocked`：因依赖、权限、环境或未决事项无法继续；
- `Out of Scope`：本任务明确不处理。

Technical Debt、建议或未来扩展不能因为出现在报告中就自动变成已批准 Scope。

### 2.5 Actionable ownership

每个阻断项和决策项必须包含：

- Owner role；
- 需要执行的具体动作；
- 所需输入或权限；
- 目标时间或决策截止时间（如已确认）；
- 不行动的影响；
- 解除阻断的可观察条件。

未知责任人写 `OWNER REQUIRED`，不得留空后仍把问题描述为已交接。

### 2.6 Safety and confidentiality

- 不在报告中写入密钥、Token、密码、OpenID、真实家庭/儿童数据或其他敏感信息。
- 使用虚构、脱敏或聚合测试数据。
- 外部沟通只提供完成决策所需的最小信息。
- 未经授权不附带生产日志、数据库导出、私有下载链接或可执行凭据。

## 3. Common status vocabulary

所有报告使用统一状态，不用“应该没问题”“基本完成”等模糊措辞。

| Status | Definition | Evidence requirement |
| --- | --- | --- |
| PASS | 实际结果完全符合定义的预期 | 命令/步骤、环境、结果和证据均存在 |
| FAIL | 已执行，但实际结果不符合预期 | 失败步骤、实际结果、复现和缺陷 ID |
| BLOCKED | 因依赖、权限、环境或决策缺失无法执行/完成 | 阻断原因、Owner、解除条件和下一动作 |
| NOT RUN | 本轮未执行 | 说明原因，不得推定结果 |
| NOT CONFIGURED | 仓库或环境没有该能力 | 缺失配置/工具和补齐条件 |
| NEEDS HUMAN REVIEW | 工程证据不能代替产品、品牌、安全或法律判断 | 指定评审角色和签字内容 |
| N/A | 按批准 Scope 确认不适用 | 写明不适用依据 |

项目/任务总状态使用：

- `COMPLETE`：批准范围已完成且验收条件满足；
- `PARTIAL`：有明确完成项和未完成项；
- `BLOCKED`：关键目标因外部或未决条件无法继续；
- `FAILED`：目标已执行但验收失败；
- `CANCELLED`：负责人明确取消；
- `SUPERSEDED`：由新批准版本替代。

## 4. Shared report header

五类报告都必须以相同事实头开始：

```text
Report Type:
Project Name / Canonical Project ID:
Version / Sprint / Task:
Repository:
Branch:
Baseline SHA:
Current/Final SHA:
Worktree Status:
Environment:
Report Date / Timezone:
Owner:
Overall Status:
Current Release Gate:
```

如果某项不可得，写 `UNKNOWN` 或 `NOT AVAILABLE` 并解释，不能省略后让读者误以为已确认。

## 5. CEO Report

### 5.1 Audience and focus

CEO Report 用于业务优先级、风险承担、资源和发布决策，重点只有：

- Business impact；
- Risk；
- Decision needed。

默认长度一页以内。代码文件、完整日志和逐条测试放在链接的 Engineering/QA Report，不在正文展开。

### 5.2 Required sections

1. Executive outcome：当前结果和阶段。
2. Business impact：对用户、时间、成本、可信度、合规或发布窗口的影响。
3. Risk summary：仅突出 P0/P1 和重大不确定性。
4. Decision needed：CEO 需要选择什么、何时决定、不决定的后果。
5. Recommendation：Engineering Lead 的单一建议及依据。
6. Evidence links：指向 Engineering、QA、ADR 或 Handover 的可追踪链接。

### 5.3 CEO Report template

```text
# <Project> CEO Engineering Report

Overall Status: GREEN / AMBER / RED / BLOCKED
Release Gate:

## Executive Outcome
- 用 2–3 句说明是否达到本阶段目标。

## Business Impact
- Customer/User impact:
- Timeline impact:
- Cost/Resource impact:
- Brand/Compliance impact:

## Top Risks
| Priority | Risk | Business consequence | Mitigation/Owner |

## Decision Needed
| Decision ID | Decision | Options | Recommendation | Needed by | If delayed |

## Evidence
- Engineering Report:
- QA Report:
- ADR/Approval:
```

### 5.4 CEO communication rules

- GREEN 不能覆盖仍开放的 P0/P1 Release blocker。
- 风险必须翻译为业务后果，不只写技术名词。
- 决策项必须真实需要 CEO 权限；普通工程执行不得上推为 CEO 决策。
- 不承诺未经 Engineering/QA 证据支持的交付日期。

## 6. Product Owner Report

### 6.1 Audience and focus

Product Owner Report 用于确认产品范围和可验收结果，重点是：

- Feature status；
- Scope change；
- Acceptance criteria。

### 6.2 Required sections

1. Product objective / approved contract。
2. Feature status：Implemented / Partial / Missing / Deferred / Blocked。
3. Scope delta：与批准 Proposal/PRD 相比新增、删除、替代或未交付内容。
4. Acceptance Criteria：逐条 PASS/FAIL/BLOCKED 与证据。
5. Product decisions：文案、规则、输入边界、品牌或延期接受。
6. Out of Scope：避免建议被误解为承诺。

### 6.3 Product Owner Report template

```text
# <Project> Product Owner Report

Approved Product Contract / Proposal:
Overall Feature Status:

## Objective
- 本阶段用户可获得的可观察结果。

## Feature Status
| Feature/User Flow | Implemented/Partial/Missing | User-visible result | Evidence |

## Scope Delta
| Change ID | Baseline scope | Proposed/actual change | Reason | Impact | Approval status |

## Acceptance Criteria
| AC | Expected result | PASS/FAIL/BLOCKED | Evidence | Owner |

## Product Decisions Needed
| Decision | Options | Engineering impact | Needed by |

## Out of Scope / Deferred
- 明确本轮不交付内容及批准依据。
```

### 6.4 Product communication rules

- UI 可见不等于完整用户闭环；必须按实际路径和状态保持验收。
- Scope change 未获批准时标记 `PENDING APPROVAL`，不得实施后补签。
- 技术债不应混写为产品功能缺失；但影响用户验收时必须说明。
- Acceptance Criteria 必须可观察、可复现，避免“体验更好”“运行正常”。

## 7. Engineering Report

### 7.1 Audience and focus

Engineering Report 面向工程师、Tech Lead、架构和安全评审，重点是：

- Files；
- Code changes；
- Tests；
- Technical risks。

### 7.2 Required sections

1. Repository baseline 和 checkpoint。
2. Completed：Implemented / Verified / Documented / Deferred / Blocked。
3. Modified files：全部 Create/Modify/Delete，原因、影响、commit。
4. Code/config/data changes：调用链、数据流、schema/migration、权限和兼容性。
5. Tests：真实命令、exit code、时长、输出、覆盖限制和证据。
6. Technical risks：P0/P1/P2/P3、Release Gate 和未验证项。
7. Rollback：commit 顺序、数据影响和回退后验证。
8. Next recommendation：只写一个最高价值下一步。

### 7.3 Engineering Report template

```text
# <Project> Engineering Report

Repository / Branch / Baseline / Final SHA:
Checkpoint:
Scope / Approval:
Overall Status:

## Completed
- Implemented:
- Verified:
- Documented:
- Deferred:
- Blocked:

## Modified Files
| File | C/M/D | Change | Technical reason | Impact | Commit |

## Technical Change
- Entry/call chain:
- Data/schema/migration:
- Auth/RBAC/Consent/Audit:
- Configuration/dependencies/assets:
- Compatibility:

## Tests
| Command/Step | Exit/Status | Duration | Key result | Coverage limitation | Evidence |

## Risks
| P0/P1/P2/P3 | Risk | State | Gate impact | Owner/mitigation |

## Rollback
- Target commits/checkpoint:
- Reverse order:
- Data impact:
- Post-rollback verification:

## Next Recommendation
- 一个动作及启动条件。
```

### 7.4 Engineering communication rules

- 修改文件清单必须来自 Git diff，不依赖记忆。
- “代码修改：0”必须在文档任务或只读检查中明确写出。
- 每个测试结论只覆盖实际命令触达的范围。
- 失败诊断命令和重试应保留；成功重跑不能抹去首次失败。
- 未获授权的 push、deploy、upload、生产操作必须为 0。

## 8. QA Report

### 8.1 Audience and focus

QA Report 面向测试、产品验收和 Release Gate，重点是：

- Test cases；
- PASS / FAIL / BLOCKED；
- Evidence。

### 8.2 Required sections

1. Test scope 和明确非范围。
2. Environment matrix：build/SHA、工具、基础库、OS、设备、App/微信版本。
3. Test case result：前置条件、步骤、预期、实际、状态、证据。
4. Defects：级别、复现、影响、Owner 和修复版本。
5. Blocked/Not Run：缺失依赖和解除条件。
6. Regression summary 和 Release recommendation。

### 8.3 QA Report template

```text
# <Project> QA Report

Build/Commit:
Test Scope:
Overall Status: PASS / FAIL / BLOCKED

## Environment Matrix
| Environment/Device | Tool/Base library | OS/App version | Tester | Status |

## Test Cases
| Case ID | Preconditions | Steps | Expected | Actual | PASS/FAIL/BLOCKED | Evidence |

## Defects
| Defect ID | Priority | Summary | Reproduction | Owner | Target/Status | Evidence |

## Not Run / Blocked
| Item | Reason | Missing dependency | Owner | Unblock condition |

## Regression and Gate
- Automated:
- Platform/simulator:
- Real device:
- Brand/Product/Security review:
- Release recommendation:
```

### 8.4 QA evidence rules

- Evidence 可以是日志、截图、录屏、测试输出或可重放记录，并必须标明路径/链接和时间。
- 截图不能单独证明数据一致性、权限隔离或恢复行为。
- 测试数据必须虚构/脱敏；证据中出现敏感信息时必须先受控脱敏。
- BLOCKED 用例不得计入 PASS rate；NOT RUN 不等于 BLOCKED，必须分别统计。
- 缺陷修复后必须记录原失败证据、修复 commit 和回归证据。

## 9. Handover Report

### 9.1 Audience and focus

Handover Report 让下一位工程师、QA 或负责人无需依赖聊天和口头背景即可接手，重点是：

- Current state；
- Next action；
- Dependencies。

### 9.2 Required sections

1. Exact current state：repository、branch、SHA、worktree、版本、阶段、Release Gate。
2. Completed / In progress / Blocked / Deferred。
3. Modified files 和 commits。
4. Test baseline 和未执行项。
5. Dependencies：工具、账号、AppID、环境、数据、人工签字与 Owner。
6. Safe restart runbook：接手后第一组只读命令和必读文件。
7. Next action：唯一动作、前置条件和验收标准。
8. Risk/rollback：不得依赖破坏性恢复。

### 9.3 Handover Report template

```text
# <Project> Engineering Handover Report

Repository / Branch / SHA / Worktree:
Version / Stage / Release Gate:
Outgoing owner / Incoming owner:

## Current State
- Completed:
- In progress:
- Blocked:
- Deferred/Out of Scope:

## Changes and Evidence
| Commit/File | Purpose | Test evidence | Rollback |

## Dependencies
| Dependency | Current status | Required action | Owner | Access/safety note |

## Restart Runbook
1. 读取 AGENTS、Baseline、Changelog、Debt 和最新 Report。
2. 运行 Git identity/status 命令。
3. 运行批准的基线检查。
4. 核对未提交差异、环境和阻断项。

## Risks and Rollback
- P0/P1/P2/P3:
- Checkpoint/commit:
- Recovery and verification:

## Next Action
- 唯一动作：
- Preconditions：
- Acceptance：
```

### 9.4 Handover communication rules

- `Current state` 必须反映交接当时真实 HEAD，不引用过期 baseline 代替。
- 任何进行中的操作必须说明能否安全中断、是否有临时数据或外部状态。
- 依赖项必须区分“已安装/已授权/已验证”，不能只写“已有”。
- 下一动作需要新权限或外部资源时，明确写明等待谁、等待什么。

## 10. Report relationship and escalation

同一工程事件可生成不同受众报告，但不得产生不同事实版本：

```text
Engineering Evidence + QA Evidence
→ Product Owner Acceptance View
→ CEO Business Decision View
→ Handover Current-State View
```

- Engineering Report 是代码、命令、风险和回退事实源。
- QA Report 是用例、环境、结果和缺陷事实源。
- Product Owner Report 引用上述证据判断 Feature/Scope/Acceptance。
- CEO Report只汇总业务影响、重大风险和需授权决策。
- Handover Report 固化交接时点状态并链接所有事实源。

出现以下情况必须立即升级，不等待常规周报：

- P0 数据丢失、越权、隐私、secret 或生产安全事件；
- 核心闭环或发布目标被 P0/P1 阻断；
- 发现未批准 Scope/架构/数据契约变化；
- Checkpoint 或 rollback 不可靠；
- 测试证据与已发布结论冲突；
- 需要 CEO/Product Owner/品牌/安全/法律的新决策。

升级消息格式：

```text
SEVERITY / STATUS:
WHAT HAPPENED:
IMPACT NOW:
CONTAINMENT:
EVIDENCE:
DECISION/OWNER NEEDED:
DEADLINE OR NEXT UPDATE:
```

## 11. Quality checklist

发送正式报告前确认：

- [ ] Project / repository / branch / SHA / version 正确且未混用。
- [ ] 结论置顶，受众重点明确。
- [ ] Scope、完成状态和未完成状态分开。
- [ ] PASS/FAIL/BLOCKED 与真实证据一致。
- [ ] 命令、exit code、环境和覆盖限制已记录。
- [ ] P0/P1 与 Release Gate 影响没有被弱化。
- [ ] 每个 blocker/decision 有 Owner、动作和解除条件。
- [ ] 没有密钥或真实敏感数据。
- [ ] 修改文件、commit 和 rollback 可追踪。
- [ ] 只提供一个最高价值下一步，或明确列出需并行决策的责任边界。

## 12. Protocol maintenance

- 本 Protocol 的修改必须由 Phoenix Nova™ 项目负责人明确批准并升级版本。
- 新版本必须记录变更原因、影响范围和替代关系，不静默覆盖 V1.0。
- 项目级 Product Contract、法律/安全要求、`AGENTS.md` 和用户明确指令优先。
- 具体项目可以新增字段，但不得删除 repository/SHA、真实测试状态、风险、Owner 或回退等强制证据。
