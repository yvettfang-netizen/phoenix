# Founder 接入门禁与最小实施方案

任务PHOENIX-V7-CANONICAL-PAGE-INTEGRATION-20261103。**只读审计PASS；最小方案已提交；“页面不再各建主数据”的总成功标准仍HOLD。** 不把准备包当作已接通。执行Codex，数据库责任Jimson；既有C-1～C-4责任Founder及批准状态保留。

| 门禁 | 事实/结论 | 状态 |
|---|---|---|
| 唯一权威 | main9355d286…、0001–0035摘要35/35；PR36/37已合并 | PASS |
| 模块真实代码审计 | 八类模块及相关分支/私有学苑/具名Founder工程已核查；分支名/页面成功不当集成证据 | PASS |
| 既有经营成果 | Founder D1代码、dirty0004/测试、旧应用存储原样保留 | PASS（保全）；运行NOT RUN |
| 统一API、字段、角色、合成验收方案 | 见本包分册；是草案，不自动生效 | HOLD（接入合同） |
| 0036 | 复用独立PR41；本包不重复生成、不把它放进main或运行库 | HOLD（独立审核/启用） |
| P0目录读取 | 0035已有受控函数，无新主表/旧数据迁移需求 | 方案PASS；实现NOT RUN |
| 身份/主数据投影与各模块正式写入 | 仍有实际身份、source、字段、scope与保留事实缺口 | BLOCKED |
| 全部新页面合成E2E | 本轮未实现新链路，不能借旧CI填PASS | NOT RUN |
| 腾讯、生产、真实记录/病历、Finance/课时动作、历史删除 | 未获本任务授权 | HOLD |

## 唯一最小下一工程动作

**在既有Node可信后端的隔离分支，先实现默认关闭的P0已发布课程目录读取，并用合成PG16/17完成真实HTTP贯通。** 复用0022现有函数，不要求0036先合并、不新增主数据、不改问卷、不迁移旧库。页面只消费精确目录DTO；首次联调用生成的合成连接/身份，不冒用真实issuer或生产密钥。是否匿名公开及真实部署需另审。

范围：新只读adapter/独立连接引用、一个受控GET路由及页面请求、精确DTO、无demo回退的错误、合成正负例/恢复证据。验收需证明响应来自Canonical，而非只检查授权后返回旧Store。节点源码以正式确认的主仓库版本为锚，6db8db05…专业合同若采用，须明确记录分支整合范围，不静默替换v1.1问卷。

## 必填事实登记（不索取密钥值，不重复既有政策决定）

| 编号 | 所需事实/合同 | 当前记录 | 处理 |
|---|---|---|---|
| PI-F1 | 实际运行后端repo/准确SHA、页面/BFF路由、环境归属 | main源码已核；真实运行版本未形成完整证据集 | HOLD；先用隔离开发副本，不猜部署地址 |
| PI-F2 | 同一环境精确issuer/audience/JWKS及身份登记流程 | 缺真实依据；不得以聊天角色替代 | HOLD；主数据/个体投影默认拒绝 |
| PI-F3 | 受保护reader/app/binder/signing引用及轮换/撤销责任 | 未提供真实引用；本轮不读值 | HOLD；开发仅生成合成凭据 |
| PI-F4 | Student及外部来源映射生命周期、投影字段/敏感分类与适用保留合同 | 通用原则已批准；具体来源/字段事实未齐 | HOLD；不自动建档/猜ID或期限 |
| PI-F5 | 学苑约课/改期/课时权威，Health联系/患者授权，Founder组织/Finance边界 | 已核现有代码；新增正式合同未齐 | HOLD；只保留/映射既有规则，不代签或扩权 |

Founder's C-1～C-4批准不需重新询问；以上是缺失的具体运行事实，不是把已批准政策重新设成待批。未填写事实不影响只读目录的合成准备，但阻止真实身份/敏感/正式写入启用。

交付索引：①[页面矩阵](PAGE_CANONICAL_INTEGRATION_MATRIX.md) ②[存储清单](CURRENT_RUNTIME_DATABASE_INVENTORY.md) ③[统一契约](FOUR_COMPASS_API_CONTRACT.md) ④[P0](EDUCATION_LEARNING_INTEGRATION.md) ⑤[ASKWISE/学苑](ASKWISE_ACADEMY_MAPPING.md) ⑥[Identity/Wealth](IDENTITY_WEALTH_INTEGRATION.md) ⑦[Health](HEALTH_SHENZHEN_INTEGRATION.md) ⑧[双OS投影](FAMILY_FOUNDER_OS_PROJECTION.md) ⑨[Forward分流](CANONICAL_0036_CHANGE_PROPOSAL.md) ⑩[验收事实](SYNTHETIC_E2E_TEST_REPORT.md) ⑪本门禁。补充索引不含口令、真实数据或部署拓扑。
