# 当前数据库与存储清单

**代码资产核查 PASS；未取得运行环境证据的项为NOT RUN/HOLD。** 本轮未读取任何真实数据库、SQLite行、备份、密钥或.env；未连接D1、腾讯、生产PostgreSQL/MySQL。来源索引及Git版本见[接入矩阵](PAGE_CANONICAL_INTEGRATION_MATRIX.md)。

| 资产 | 已实际核验 | 能证明什么 | 不能证明什么/处理 | 状态 |
|---|---|---|---|---|
| main Canonical0001–0035 | 35文件逐项SHA-256及main SHA | 唯一Schema/Migration发布来源 | 不代表某运行集群账本已升级 | PASS |
| 0036候选 | PR41、3de5c99…、独立CI与前后反例证据 | 已测试的独立Forward候选 | 未合并/未安装，不能当main字段 | HOLD（集成门禁） |
| 本机既有PG16/17 Compose | Docker非敏感状态为healthy | 容器存在且健康探针通过 | 本轮未认证查询账本/业务表；版本以实际查询为准，不能填写0035/0036运行证据 | 健康PASS；账本NOT RUN |
| 腾讯隔离库 | 仅历史报告 | 既有资产需要保留 | 本轮禁止连接/升级，当前版本不得继承旧报告 | NOT RUN / HOLD |
| 官网D1身份库 | `db/index.ts`、schema与默认关闭的customerAuthConfig | Drizzle D1适配器；core_auth_users/sessions/limits/audit只负责账号 | 不是Person/Family/Student事实库；CUSTOMER_AUTH_ENABLED或页面登录成功不等于Canonical授权 | 代码PASS；当前绑定/数据NOT RUN |
| Education旧PostgresStore | Node启动按databaseUrl选择PG，否则InMemoryStore；独立migration有users/families/students等 | 旧应用能维护独立实体；现有能力需保留 | 不得将旧DATABASE_URL改指Canonical后运行旧migration；不得双写两套主数据 | 代码PASS；实际库连接NOT RUN |
| Education FileStore | 适配器代码存在 | 代码资产 | 当前index未选择它，不声称在用 | HOLD（运行未证） |
| Family OS demo SQLite | node:sqlite和users/families/students/submission DDL，loopback/demo认证限制 | 本地演示后端确有独立存储 | 不读取真实文件；保留demo，Canonical模式禁止回退到此生成真实主体 | 代码PASS；真实数据NOT RUN |
| ASKWISE SQLite | better-sqlite3；pilot独立路径与认证、source-qualified导出 | 学习任务/attempt/evidence来源库存在 | 未读取或导出试点记录；Canonical映射保留NULL，不能停用/清库 | 代码PASS；迁移HOLD |
| Identity浏览器仓库 | localStorage Mock Feishu + sessionStorage | 演示评估/家庭/Lead存储 | 不是飞书真实写入，也不是Canonical；新模式不能拿浏览器ID自动建档 | 代码PASS；接入HOLD |
| Wealth Map/Mock | IdempotentMemoryRepository与Mock adapters | 基础接口/单元行为 | /api/health的ok与RULES_NOT_LOADED都不能证明DB连接 | 代码PASS；业务BLOCKED |
| 学苑 | 私有main/hardening文档骨架；aoyu分支UI原型 | 有正式工程入口和边界 | 未找到已运行数据库/API证据；不得另建Student/Teacher主数据 | HOLD |
| Founder/Operations D1 | 已命名本机工程e60a164…的schema、读写适配器、经营页面 | 既有经营规则与组织/伙伴/Lead/Deal/Project等实现资产 | 0004未提交，不认定生效；现有D1支付/佣金不是本轮已确认的Canonical Finance权威 | 代码PASS；运行/权威映射HOLD |

保存规则：不删除、不停用、不迁移上述旧存储。新Canonical路径只通过受控API读取唯一主数据，旧库作为受控来源/历史保留；迁移、回填、删除、冻结原件核验另走门禁。旧`006`及Family sandbox不复用到新Canonical命名空间。

原始Docker状态、Founder工作树与dirty文件摘要、私有学苑树/分支、主仓库remote-heads与实际源码响应都留在私有证据包。本轮源代码审计不冒充“全部当前运行数据库已确认”。
