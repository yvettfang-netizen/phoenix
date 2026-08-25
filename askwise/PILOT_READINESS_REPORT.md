# ASKWISE V0.1 Pilot Readiness Report

Date: 2026-08-22

## A. Engineering Summary

ASKWISE V0.1 remains a minimal, non-production CLI prototype on the existing repository and has been extended with acceptance-oriented coverage rather than UI or platform features.

已完成的关键点：

1. 结构化诊断模块：
   - `student_model.py`
   - `diagnosis_engine.py`
   - `learning_engine.py`
   - `agent_policy.py`
   - `session_log.py`
2. CLI 演示/脚本化交互：
   - `demo.py`
3. 验收覆盖：
   - Politics P1–P5
   - Math K1–K7
   - 5 类学习模式
   - Hint 0–5
   - 提示信息不泄漏完整答案
   - 5 类脚本化场景
   - session_log 字段契约

## B. Repository

- 项目路径：`D:\CODEX\PhoenixNova\askwise`
- 主要实现文件：根目录 Python 文件与 `tests/`

## C. Run Command

在可用 Python 环境下运行：

- `python -m pytest -q`
- `python demo.py --flow politics`
- `python demo.py --flow math`
- `python demo.py --flow both`

## D. URL

本轮为 V0.1 CLI 原型，无 Web URL。

## E. Implemented

- Error taxonomy：
  - Politics: P1–P5
  - Math: K1–K7
- 学习模式选择：
  - Teaching / Recall / Transfer / Thinking / Debug
- Hint 机制：0~5 档位（0=No hint）
- 会话日志 JSON 持久化：
  - 字段：`timestamp`, `subject`, `topic`, `student_input`, `diagnosis`, `error_type`, `learning_mode`, `hint_level`, `first_step_time`, `outcome`
- 课程画像（`StudentProfile`）与 `first_step_time` 记录
- 脚本化测试助手：`run_scripted_demo`

## F. Not Implemented

- 未接入 UI、LLM/API、认证、数据库外持久化（按你的“V0.1 不做复杂功能”约束）
- `askwise-learning-engine/` 下的 Next.js 历史草案未纳入本次冻结范围
- `demo.py` 的真实交互流（CLI）未在当前环境实际执行

## G. Test Result

### Acceptance Criteria coverage

- Politics P1–P5: 已有测试
- Math K1–K7: 已有测试
- 5 模式选择: 已有测试
- Hint 0–5 与递进: 已有测试（含 Level 0 无提示约束）
- Early hint 不泄漏完整答案: 已有测试
- 脚本场景 5 类: 已有测试
- Session log 必须字段: 已有测试

### Execution status

- 无法在当前环境执行：`python`、`pytest` 均不可用，导致自动化结果未出。

## H. Screenshots / Evidence

V0.1 为 CLI 版本，当前不产出截图。

Evidence 以文件输出为主：

- `askwise_session_log.json`（每次 CLI/脚本化跑通后追加）
- `tests/` 目录中的验收用例定义

## I. Next Recommended Step

1. 在本机完成 Python 运行环境准备。
2. 执行 Section C 命令并确认全部通过。
3. 交付冻结版本前附上两条 CLI 运行产物（politics/math）与日志。
