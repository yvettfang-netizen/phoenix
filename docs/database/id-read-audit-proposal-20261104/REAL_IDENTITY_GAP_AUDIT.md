> 时点更新（2026-11-04）：下文为PR47方案阶段的历史快照。I-7已由PR48实现并完成授权技术复审；历史issuer/JWKS及保护引用已找到并预填私有证据包；旧family mapping API缺口已由0024/0025取代。当前有效性及真实接入仍HOLD。请以[最新受控事实证据索引](../identity-evidence-packet-20261104/README.md)为当前状态；保留下文作为历史记录。

# 真实身份接入缺口核对（不登记真实身份）

2026-11-04，Jimson 本人授权及回写，Codex 执行。**事实核查 PASS；真实启用 HOLD。** 本次核查代码、既有决策与证据，不探测真实身份提供方、不连接腾讯或生产、不读取密钥/客户资料。

## 已确认的决定与实现，不再重复索要

- 数据库权威、UUIDv7 与公开前缀、Person/Student关系、FM-1～FM-8、C-1～C-4：沿用既有决策，详见[溯源](ID_DECISION_TRACEABILITY.md)。这些决定不是本轮重新批准。
- 当前操作对象为 Jimson 本人，Notion 回写视为 Jimson 授权与回写；不据此创建或推断 Jimson 的数据库 principal、员工权限或 GitHub 独立审核。
- [已有身份门禁材料](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/APPLICATION_IDENTITY_CONTRACT_FOUNDER_GATE_V1.0.md)已将 Founder 记录为 application / binder / principal-resolution / audit-event / incident-response 责任人。**责任人并非重新待选。** 实际员工身份及执行账号授权证据仍未提供。
- [Option A 批准](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/evidence/approved/FOUNDER_APPLICATION_IDENTITY_OPTION_A_APPROVAL.md)与[broker技术选型记录](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/7b0e42362e1a639c286835840133596a2e39861f/canonical-db/phase2-gate/evidence/approved/FOUNDER_OIDC_BROKER_TECHNICAL_SELECTION_V1.0.md)已有依据：first-party broker、ES256、正式候选audience `phoenix-canonical-postgresql`、300秒上限及受保护引用的技术方向。不再询问“选哪家broker”；但记录明确不证明真实HTTPS origin、DNS/TLS、密钥或服务已存在。
- PR46 的 verifier **刻意只接受**合成 `.invalid` issuer、`family-projection-synthetic` audience、60秒fixture。它不是上述正式broker适配，不可直接把真实参数填入并宣称已联通。真实broker验证器及运行接线仍须独立受控实现与复审。
- 0017/0023–0025已有外部身份、来源限定家庭解析和受控mapping生命周期；PR46已证明合成分离LOGIN、票据、清理、下一请求撤权，未证明真实provider注销/撤销传播。

## 只填写非敏感事实与证据引用

下面的空栏不是业务规则重新待决，也不是索要任何口令、token、真实subject、openid、身份证明或客户记录。由已确认责任人提供**私有受控证据位置及核验摘要**；证据内容不复制到公开Git或Notion。

| 编号 | 必填事实/证据 | 已知边界 | 目前结果/可填写处 |
|---|---|---|---|
| I-1 | 正式非生产PUBLIC_BASE_URL、精确iss、JWKS/discovery URL的发布归属、DNS/TLS和访问控制证明 | broker技术选型已定；不能从微信端点或旧服务器地址拼造issuer | HOLD；填写私有配置登记记录版本/SHA、核验人、核验时间；不填凭据 |
| I-2 | 签名key的受保护引用、kid/公钥发布、轮换与撤销流程；独立app/binder账号配置引用与权限核验 | 三者分离；真实私钥、密码不入Git/Notion/命令行；技术引用名不等于文件已存在 | HOLD；填写secret/config登记条目引用及ACL/rotation验证结果，不填值 |
| I-3 | 实际应用和可信后端repo、branch、准确SHA、已批准隔离环境；从现有会话到broker的校验链 | GitHub中有应用不等于该版本已运行或与Canonical联通 | HOLD；填写运行版本证明和设计/合成E2E报告链接，不提供生产访问 |
| I-4 | 外部subject到唯一principal/Person的核验流程、登记审批、撤销与重复主体冲突处理证据 | 不从姓名/邮箱/手机号自动匹配，不以当前Jimson会话当作员工身份事实 | HOLD；填写受控流程及审批记录引用；实际标识只留私有登记系统，当前不登记 |
| I-5 | PHOENIX_FAMILY_OS真实来源归属、家庭成员关系、FM核定证据；Student授权关系证据 | FM规则已批准；source不待重新决定。新真实VERIFIED记录须相应管理审批 | HOLD；填写source ownership与关系核验材料引用；不贴真实mapping行 |
| I-6 | 最小真实字段/用途、适用的监护与Consent依据、首次登记的管理复核 | 当前合成仅家庭名称/学生显示名，保守本人/核验监护子集；不扩展业务档案或医疗资料 | HOLD；填写范围批准引用、数据治理复核；无新增用途不自动覆盖学习/医疗数据 |
| I-7 | 正式public-ID翻译及受控read-audit机制的实施、独立审查、PG16/17证据 | 本轮仅[Forward方案](FORWARD_MIGRATION_PROPOSAL.md)；已批准前缀不等于接口已实现 | NOT RUN；待独立合成实现，不需要先提供真实客户身份 |
| I-8 | 实际provider注销/密钥撤销/身份或家庭mapping撤销的传播SLA、池复用证据 | 现有合成只保证下一请求重新签票时拒绝；不保证中途取消已读响应 | HOLD；填写经批准的实际生命周期契约及隔离验证报告 |
| I-9 | 受保护DB/服务端日志的存取、既有留存政策适用性、D-9对账/恢复与故障告警证据 | 不发明新保留期限或日志目的地；审计ALLOW是决策尝试，不是客户交付凭证 | HOLD；填写私有运维政策引用及实际验证；不得将原始日志公开 |
| I-10 | 后续真实身份登记/应用启用/发布授权 | 本次授权限方案准备及合成工程，不授予真实登记或部署 | HOLD；独立申请，不由本轮Notion回写代签 |

## 源码差异与限制

当前PR46仍使用reader表SELECT、内部UUID定位符、只读事务和应用结果日志。[新方案](FORWARD_MIGRATION_PROPOSAL.md)要求改为专用无直读权限角色、public ID v2 DTO、内部审计及普通短事务。缺少I-1～I-6、I-8～I-10时，真实身份启动应持续默认拒绝；不能把“.invalid被替换”视为安全接入完成。

旧R1学生映射草案的未成年人/Consent提案不被提升为生效合同，也不据此放宽现有权限。现有已批准边界如与未来正式接入范围发生具体冲突，列入独立差异审查；本轮只做不扩大权限的窄投影设计。

**工程可自主继续：** 将I-7按最小方案实现到一次性本地合成集群、补永久回归及恢复验收。**事实必须补证：** I-1～I-6、I-8～I-10，保持HOLD；不以授权性“继续”推导真实域名、员工身份或已创建的secret。
