# Education V3.0 · Founder review candidate

任务：PHOENIX-EDUCATION-PAGE-V3-20261101 + EDUCATION-COMPASS-ADDENDUM-V1。日期：2026-11-01。

## 基线与交付边界

- GitHub main：`b88db04f2a55e0f5ce2c7aa84a99c4303a25dd93`。
- 共享 V3 Header、Footer、字体、Button、Card 与官方 Logo 来自尚未合并的 Draft PR #31，精确基线 `3cbf1cb71c36ad074b18f736dbe1b9f325eb93ae`。
- 独立分支 `codex/education-page-v3`，独立工作区 `_Worktrees/education-page-v3`。此 PR 以 `codex/identity-page-v3` 为 base，形成可单独审查的 Education 增量；#31 获批并合并后才考虑重新核对 main 与调整目标分支。没有修改或合并 #31、#30，没有修改 main。
- 根工作区的 Education / ASKWISE 未提交成果和其他工作区完整保留。此 PR 不修改数据库、认证、原问卷、业务 API、Canonical ID、ASKWISE 引擎或 Family OS。

## 实际实现

| 顺序 | 模块 | 组件及交互 |
|---|---|---|
| 1 | 国际校园 Hero | 单一 H1、真实图片与 HTML 文案、咨询和学苑两个入口 |
| 2 | 五项核心价值 | 全球视野、个性化规划、导师、陪伴、未来 |
| 3 | 四项专业服务 | 香港、海外、学术、成长；独立图片、双语标题、原生可键盘展开详情 |
| 4 | Education Compass | 服务之后、学苑之前；四项展示归纳与正式问卷维度明确区分；未开放评估禁用，咨询独立可用 |
| 5 | Phoenix Academy | 唯一对外教学品牌；四项能力、七项约课运营能力；学员／导师入口待开放 |
| 6 | ASKWISE | 独立产品介绍、七步学习闭环；没有启动任务、访问作业或接通数据 |
| 7 | 全球教育资源 | 六个教育目的地；不暗示院校合作、办公室或录取保证 |
| 8 | 家庭长期成长 | Growth Blueprint 与 Family OS 关系；监护授权和家庭管理员权限边界 |
| 9 | 咨询准备 | 五个业务方向、本地清单、选择／重置／刷新清空；明确尚未发送，无表单提交、网络传输或持久化 |
| 10 | 共享品牌导航 | V3 导航 Education 指向实际新页面；五区生态 Footer；撤下启明堂独立入口 |

### 组件与 Design Tokens

- `EducationLanding`、`EducationConsultation`、`education-content.ts`：本次新增，复用 SiteHeader、SiteFooter、Button、Card。
- Education tokens 在页面 CSS module 内限定作用域，复用全站 `--serif`、品牌 Logo、共享导航和间距。嫩松绿 `#8FAF96`、竹青 `#A8BCA6`、淡绿 `#DCE8DC`、月白 `#F4F5ED`；深绿 `#164D42` 用于可读文字／按钮。金色只作少量细节。
- 不使用整张设计图作为背景；独立图片配合响应式组件。手机服务单列、CTA ≥48px、Footer 五组折叠，支持原生键盘操作与减少动态效果偏好。
- 官方横版资源仍为 `/brand/official/v3/phoenix-nova-header@2x.png`，SHA-256 `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA`。母版及衍生 Logo 均未改动，只在浅色 Header/Footer 使用。

## 路由与开放状态

`{locale}` 只接受 `zh`、`en`，不创建无语言别名或新问卷路由。

| 入口 | 真实页面／目标 | 状态 |
|---|---|---|
| Education | `/{locale}/education` | 本次本地候选页面，noindex；未部署 |
| 四项服务 | `#education-services` | 可用，四项详情可展开 |
| Compass | `#education-compass` | 展示可用，评估尚未开放；不创建 `/education/assessment` 或结果页 |
| 学苑 | `/{locale}/education#academy` | 产品介绍，非登录平台 |
| 约课 | `/{locale}/education#academy-booking` | 能力预览，非可运行预约系统 |
| ASKWISE | `/{locale}/education#askwise` | 产品介绍，不是公开学习引擎入口 |
| 学员／导师 | 无公开链接 | 待开放；不暴露内部运营／教师后台 |
| 咨询 | `/{locale}/education#consultation` | 本地准备演示，非预约提交 |
| 家庭中心 | `/{locale}/family-center` | 复用现有账户开关与受控预览；无新学生数据访问 |
| Identity | `/{locale}/identity` | 来自 #31，保持原页面功能 |
| Wealth | `/{locale}/compass#wealth` | 保留既有真实路径 |
| Health | `/{locale}/health` | 保留现有页面及原 Health gate |
| 首页／关于／洞察 | `/{locale}`、`/{locale}/about`、`/{locale}/insights` | 保留既有页面 |
| 凤启东方 | `/{locale}/oriental` | 保留既有入口，不改独立品牌 |
| NOVA DIGITAL／合作 | 无链接 | 公开入口未核准，继续待开放 |

## API、授权与 Canonical 边界

本次新增 **0 API、0 数据表、0 Migration、0 持久化字段**。Education 咨询只有一个无 `name` 的方向选择器与 `type=button`，不读取问卷结果、不收集联系方式／文件、不使用 cookies、storage、URL 参数或写入请求。刷新清空，未发起咨询或创建客户。

现有 Education Compass、ASKWISE 及 Academy 实际能力见审计附件。存在源码不等于已公开，存在 API 合同不等于已接通。未发现官网 Education 评估开关与获准公开的问卷目标，故没有创造第二个 preview 开关，也没有借用 Health 开关来开启教育评估。

Founder 列出的 `family_id`、`member_id`、`student_id`、`lead_id`、consultation、`service_project_id` 是待既有 Canonical Schema 与应用契约核验的交接语义，**本页不创建字段、生成 ID 或假定这些名字就是实际主键**。实际身份映射与监护人授权须由受信服务端按已批准契约解决。评估结果、咨询授权与后续服务项目转化分别处理，禁止自动向销售传递学生敏感资料。家庭管理员不自动拥有全部学生敏感数据权限。

## 验证与复现

- 本地锁定依赖安装、TypeScript、Build 通过。Lint：0 errors，1 条既有 `customer-center.tsx` 的 `Bell` 未使用 warning。
- Education 浏览器：16/16，通过中英文 × 1440、1024、768、390、320px；服务详情、七步学习闭环、受控评估、独立咨询五个选项、重置／刷新、零请求／存储、Footer、无 JS、替代文字、基本键盘及文字对比度检查。
- Identity 既有浏览器回归：22/22，通过共享导航／Footer 更新后的原功能。
- 原生 Education Compass 既有 `tests/run-tests.js` 与 `tests/validate-ui-contract.js` 在独立 Education worktree 和 D:/ec `6db8db0` 工作副本均通过；只使用内存 mock 和只读合同检查，没有在 D:/ec 或主根脏工作区生成构建产物。两套问卷来源与版本差异详见 `EDUCATION_V3_COMPASS_AUDIT.md`，没有将免费 Web Snapshot 当作原生问卷。
- Windows `workerd` 启动出现既有 `0xc0000005`，导致本机真实 Workers 3 项测试无法启动；不是已通过。隔离 Node 前端适配器用于本地视觉与浏览器验证，不提供认证／数据库运行证据。GitHub Ubuntu CI 对精确 head 执行真正 Workers、原 Health 问卷和开关双状态回归，状态以 PR 检查为准。
- 原问卷／规则、Health、Auth、业务与主数据目录保护证据见 `EDUCATION_V3_SOURCE_INTEGRITY.json`。没有把展示层四项归纳写回问卷。

本地预览：`http://127.0.0.1:4402/zh/education`、`http://127.0.0.1:4402/en/education`。

使用仓库原构建、typecheck、lint；本地 Windows 直接运行 `node node_modules/vinext/dist/cli.js build`，再以 `HEALTH_TEST_PORT=4402` 启动已有 `scripts/health-node-preview.mjs`。Linux CI 使用 `scripts/health-preview-server.mjs`，运行 `node --test tests/education-landing.test.mjs` 与 `tests/education-browser.mjs`。

## 未完成／待批准

1. Founder 对完整中英 PC／手机视觉验收。
2. #31 共享组件依赖的批准及后续目标分支核对；本次不擅自合并。
3. Education Compass 正式公开 URL、权威产品版本、部署及开放控制证据确认后，才可另行接通评估 CTA；本次不修改现有问卷或发布其应用。
4. 正式咨询、学员／导师／ASKWISE 和 Family OS 数据接口需独立授权与技术批准，当前没有上线或接通声明。
5. 当前是本地候选与 Draft PR，不是生产发布；候选 SEO 保持 noindex。任何外部院校、导师及服务资源需另行核验。
