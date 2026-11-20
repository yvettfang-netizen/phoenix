# Phoenix Family OS™

凤启家庭 OS 的现有微信小程序与 2026 模块化架构基础。

状态：旧 SQLite 后端及 WeChat 本地业务持久化已退役；此目录仅保留 UI/业务测试模块和 Canonical 网关接口候选。缺少可信 Canonical 身份与数据 API 时，正式小程序禁止读写。
本项目位于 phoenix 单仓的 Phoenix Family OS/phoenix-family-os-mvp；本次不改仓库名称或现有入口。

## 开发入口

在本目录执行（Node.js 24，现有 TypeScript 5.9.3）：

~~~sh
pnpm install --frozen-lockfile --ignore-scripts
node scripts/check-architecture.cjs
npm test
npm run typecheck
npm run build
~~~

微信开发者工具仍导入本目录的 project.config.json；apps/mini-program 暂为迁移说明。
npm run build 仅执行现有静态验证，不是微信编译或上传。项目尚未配置 lint。
后端 npm run backend:start 仅用于本机合成数据演示；实际配置见 [.env.example](.env.example)。

## 目录

| 目录 | 本阶段用途 |
| --- | --- |
| apps/ | 四个应用的预留边界；小程序仍从原目录运行 |
| packages/ | family-core、timeline-engine、permissions、auth、ui、types、utils 职责 |
| database/ | Canonical 数据权威说明；此目录不再拥有独立业务 Schema/Migration |
| ai/ | agents、context、memory、prompts、evaluation 设计预留 |
| docs/ | 架构、产品、决策、安全、API、路线与治理 |
| infrastructure/ | 容器、云、部署、监控、安全的职责预留 |
| tests/ | 现有回归测试，以及分类目录说明 |
| scripts/ | 不依赖第三方包的架构检查 |
| app.*、pages/、backend/、services/、models/ | 历史 UI/测试及待接入的 Canonical 网关，旧本地数据源不能用于生产 |

详见 [系统架构](docs/architecture/system-overview.md)、[差异审计](docs/architecture/repository-audit-2026-09-08.md)、[迁移计划](docs/roadmap/structure-migration.md)。
GitHub 检查文件位于 Git 仓库根目录的 .github/workflows/family-os-foundation.yml。
