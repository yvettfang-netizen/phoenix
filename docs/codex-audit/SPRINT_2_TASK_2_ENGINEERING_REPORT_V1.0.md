# Phoenix Family OS™ Sprint 2 Task 2 Engineering Report

- Project: Phoenix Family OS™ Mini Program MVP V0.1
- Canonical Project ID: `phoenix-nova/family-os`
- Sprint / Task: Sprint 2 / Task 2｜WeChat Developer Environment Readiness Assessment
- Assessment date: 2026-08-15（Asia/Shanghai）
- Status: **BLOCKED**

## 1. Repository control baseline

| Field | Value |
| --- | --- |
| Repository | `D:\CODEX\PhoenixNova\Phoenix Family OS\phoenix-family-os-mvp` |
| Branch | `codex/phoenix-family-os-v0.1-sprint2` |
| Task 2 starting SHA | `7ba5ed48771e7b51e8ef39a000ba3787b986e15d` |
| Pre-implementation checkpoint | `bb8b3c24b238083539c9f480146cd354ef1faaec` |
| Starting worktree | Clean |
| Functional/configuration changes authorized | None |

## 2. Environment availability inventory

### 2.1 WeChat Developer Tools

Result: **NOT AVAILABLE / BLOCKED**.

Read-only discovery checked:

- the common 32-bit and 64-bit Tencent installation locations;
- current-user LocalAppData program locations;
- Windows uninstall registry entries;
- current-user and all-users Start Menu shortcuts;
- bounded Tencent directory searches for `微信开发者工具.exe`, `cli.bat` and `cli.exe`;
- running processes and PATH command discovery.

No WeChat Developer Tools executable, CLI, uninstall entry or shortcut was found. `Get-Command cli -All` resolves only to the PowerShell `Clear-Item` alias, not to the WeChat CLI. Running `WeChatAppEx` processes belong to the installed WeChat client mini-program runtime and are not evidence of the Developer Tools or its compiler.

The workstation is interactive 64-bit Windows (`Microsoft Windows NT 10.0.26200.0`). `winget` is not installed, so it could not provide an additional installed-package inventory. No installation or download was attempted.

### 2.2 Mini Program AppID

| Item | Current value | Assessment |
| --- | --- | --- |
| Repository AppID | `touristappid` | Present, but it is the repository's tourist/demo identifier rather than evidence of a controlled project AppID |
| Private project configuration | `project.private.config.json` absent | No machine-local AppID or tool setting override is available |
| Authorized Mini Program account | Not provided / not verified | BLOCKED |
| Authorized developer membership | Not provided / not verified | BLOCKED |
| Developer Tools login session | Impossible to verify because the tool is absent | BLOCKED |

The AppID and project settings were not changed. A real AppID must not be inserted into the repository as part of this assessment.

### 2.3 Project configuration

| Setting | Current value | Static assessment |
| --- | --- | --- |
| Project type | `compileType: miniprogram` | Present |
| Project name | `Phoenix-Family-OS-MVP-V0.1` | Present |
| Project root | Repository root (no separate `miniprogramRoot`) | Present |
| Simulator target | `simulatorType: wechat` | Present |
| Configured base library | `libVersion: 3.7.12` | Declared, not loaded or compiled in this environment |
| App manifest | 15 pages, 3-tab tabBar, `style: v2` | Readable; platform parsing not executed |
| Package exclusions | `tests`, `docs`, `node_modules` | Declared; packaging not executed |

Configuration file integrity at assessment time:

- `project.config.json`: `AE540461F1F248724CC60C59498B7BC640E0B5CFB06EA666D96A97CA48337F11`
- `app.json`: `BA54E568CC9DFE34B8A4520AEC9D48315FDC0AA221FDC39AFDDBB84FA75336AA`
- `package.json`: `A4EB6D97FD46F7EC14CC833B8D0356128FCA3B6FDB2989D79DA58845563018B5`
- `pnpm-lock.yaml`: `9747995EE6C20D5990A84006B6353D66070F7A2BB23B92133C1C81E02A1E5693`

### 2.4 Required SDK/runtime information

- The code is a native WeChat Mini Program and depends on the Developer Tools for WXML/WXSS compilation, the JavaScript runtime, the simulator and base-library download/loading.
- The repository requests base library `3.7.12`; actual availability and compatibility cannot be confirmed while the Developer Tools is absent.
- Runtime calls include login, storage, navigation, page scrolling, modal/toast, `getWindowInfo`, `getDeviceInfo`, `getSystemInfoSync` fallback and capsule geometry APIs.
- Node.js/pnpm tests from Task 1 are available but cannot substitute for the WeChat compiler or runtime.
- No DevTools version, simulator engine version, WeChat version or device runtime version can be recorded in the current environment.

## 3. Execution readiness decision

| Validation target | Status | Reason |
| --- | --- | --- |
| Real WeChat compilation | **BLOCKED** | Developer Tools and WeChat CLI are not installed/discoverable; configured base library cannot be loaded |
| WeChat simulator testing | **BLOCKED** | Developer Tools GUI/simulator is unavailable; DEV-01 through DEV-06 cannot be executed |
| Real-device testing | **BLOCKED** | No Developer Tools preview path; no controlled test AppID/developer membership/login evidence; no assigned physical device/test owner evidence |

No compile, simulator or real-device result is represented as PASS.

## 4. Blockers, missing dependencies and ownership

| ID | Blocked capability | Missing dependency/evidence | Required next action | Owner/action needed |
| --- | --- | --- | --- | --- |
| ENV-01 | Compiler and simulator | Approved WeChat Developer Tools installation | Install the current organization-approved stable Windows build from the official WeChat source; record installer source, tool version and installation path | Engineering workstation owner / Windows administrator |
| ENV-02 | CLI evidence | Developer Tools CLI and service port availability | After installation, enable/verify the CLI, record the exact executable path and run a read-only version/help check before project compilation | Engineering Lead with workstation owner |
| ENV-03 | Controlled AppID path | Non-production AppID and authorized project membership are not supplied | Mini Program administrator decides whether Task 3 uses the existing tourist demo mode or a controlled non-production AppID; provide access without committing credentials or silently editing repository configuration | Product owner + Mini Program administrator |
| ENV-04 | Simulator validation | Logged-in tool, base library `3.7.12`, isolated simulator workspace | Import the unchanged repository, confirm the configured base library can be downloaded/selected, then execute DEV-01 through DEV-06 with virtual data only | Engineering/QA owner |
| ENV-05 | Real-device matrix | Preview authorization, logged-in WeChat accounts and assigned devices | Assign at least one iPhone and two Android devices, record model/OS/WeChat version/tester, and execute the approved device matrix | iPhone QA owner + Android QA owner |

No download, installation, login, AppID change, project import, preview, upload, deployment or review submission was performed.

## 5. Commands and actual results

| Check | Actual result |
| --- | --- |
| Git branch/SHA/status checks | Exit 0; expected Sprint 2 branch at `7ba5ed4`; worktree clean |
| Read `project.config.json`, optional private config and `app.json` | Exit 0; public config parsed as text; private config absent |
| Initial Developer Tools discovery probe | Exit 1 before execution because of a PowerShell `foreach |` parser error; no side effect |
| Corrected Developer Tools discovery probe | Exit 0, 1.320 s; no tool/CLI/registry/shortcut found; `cli` is `Clear-Item` |
| Initial bounded supplemental probe | Exit 1 before execution due to the same PowerShell parser rule; no side effect |
| Corrected bounded Tencent search | Wrapper exit 0, 12.317 s; no matching Developer Tools artifacts; inner `winget` check was NOT AVAILABLE and is not counted as PASS |
| Runtime API/config/hash scan | Exit 0, 0.645 s; configuration hashes and `wx.*` usage recorded |
| Official documentation web lookup | No accessible result returned; it is not used as evidence for the local readiness decision |
| WeChat compilation | NOT RUN / BLOCKED |
| Simulator test | NOT RUN / BLOCKED |
| Real-device test | NOT RUN / BLOCKED |

## 6. Change-control and risk

- Business code modified: **No**
- `app.json` or `project.config.json` modified: **No**
- AppID modified: **No**
- Schema, tests, dependencies or assets modified: **No**
- Task 2 documentation added: this report only

Risk classification:

- P0: The existing `touristappid`/demo identity remains unsuitable for Public RC/Production. This task does not change that production gate.
- P1: TD-004 remains BLOCKED because no real WeChat compilation or simulator evidence exists.
- P1: TD-005 remains BLOCKED because no physical-device matrix has been executed.
- P2: Tool installation provenance/version and reproducible CLI setup are not yet recorded.

## 7. Decision, rollback and stop point

Task 2 status: **BLOCKED**. The repository configuration is statically ready to import, but this workstation is not ready to execute real WeChat compile, simulator or device acceptance. This is an environment/access blocker, not a demonstrated source-code failure.

Rollback is documentation-only: revert the single Task 2 report commit with `git revert <Task-2-report-commit>` if removal is required. Do not use `git reset --hard`.

Task 3 has not started. The Engineering Lead must wait for explicit project-owner approval and the ENV-01 through ENV-03 environment decisions before any Task 3 validation or change.
