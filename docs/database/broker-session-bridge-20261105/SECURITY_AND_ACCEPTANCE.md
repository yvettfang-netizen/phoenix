# 权限与合成验收范围

Jimson授权的Codex工程核对，不是独立安全审核人签署。

| 边界 | 正例/反例 | 证据入口 |
|---|---|---|
| JWT | 正确ES256、错误签名/iss/aud/array aud、none/HS*/未选择RS256、过期/未来/超长寿命/时间小数、缺claim/重复键、超大串、jku、非法sub/jti、额外family/role/个人字段 | server/tests/broker-session-bridge.test.ts |
| JWKS | 并发单次读、有效缓存、30秒未知kid节流、轮换、过期缓存+上游故障拒绝、超时、私钥/重复kid/错误key_ops/用途/坐标/超量key拒绝 | 同上；reader只用精确配置URI，实际HTTPS transport NOT RUN |
| 服务端会话 | 用真实AuthService+InMemoryStore的合成记录；无效、撤销、过期、deleted、admin、无家庭、多家庭、JWT主体不等于已认证用户、签发过程中撤权及归属变化拒绝 | 同上；不是生产身份或持久化Store核验 |
| HTTP与家庭归属 | family、students的A/B/A成功且不串家庭；查询和header伪造、POST、直接学生ID拒绝；broker错误无敏感细节；退出/ownership变更后拒绝 | broker-session-regression.mjs，fresh及restore均执行 |
| 数据库 | 分离LOGIN，binder0023，app专用受控投影，nonce与READ事件关联；成功/拒绝清理后上下文与票据为0 | 同一新回归及原有read-audit-regression.mjs |
| 历史安全回归 | Fresh、0035→0037、Repeat/Drift/Atomicity、跨家庭/监护/ACL负例、loader脱敏、超权限拒绝、审计INSERT/COMMIT/DTO故障、清理与浏览器合成预览 | 原projection-e2e.mjs及review-regression.mjs |
| 灾备 | 专用backup导出、摘要篡改拒绝、全新集群恢复，再运行新bridge回归和既有数据库/浏览器回归 | projection-e2e.mjs；manifest未签名，不等于来源真实性证明 |

新工厂只允许注入的本地test场景；正常index仍使用原默认关闭的合成预览入口，不因新flag变更而开始读取真实会话。没有生产token、真实JWKS、真实员工账号、真实逐人身份或家庭记录进入测试。临时签名器、公钥reader、应用Store及凭据只在测试进程/受保护fixture文件中，清理与隔离沿用自有标签校验。

本轮不把PR48原有的“浏览器→合成JWT预览”冒充成新“真实opaque session→broker”的网站联调。新桥接测试走实际loopback HTTP服务端；原有浏览器链也独立重跑。两者的真实网站登录/BFF统一仍HOLD。

真实接入下一步仍是F1–F5受控补证；后续才可准备受保护元数据读取、实际HTTPS reader及signer注入、获批应用会话接线和独立复审。不改变既定owner、公开ID或授权用途，不用“全部允许”替代事实。
