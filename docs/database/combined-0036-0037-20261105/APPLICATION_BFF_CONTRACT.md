# 默认关闭的会话BFF接线合同（本地合成候选）

复用既有Source/ID/FM/Owner及first-party ES256、300秒profile；本文件不批准新身份、Consent、写入用途或真实启用。

| 层 | 允许 | 拒绝/仍HOLD |
|---|---|---|
| 页面 | 独立本地只读preview，family-summary.v2及student-summary.v2最小DTO | 不改原业务表单/DTO，不把新入口加成公开业务导航 |
| BFF | development、loopback、三个flag均开；只取唯一phoenix_family_session opaque cookie，转单独loopback API | 默认/production404；query、跨origin、角色/家庭header、重复cookie、旧JWT cookie或浏览器Authorization拒绝；不回退旧API origin |
| Node入口 | sessionFamilyProjection独立依赖，专用session-projections路由，复用现有AuthService/Store | 不从浏览器接受family/principal/channel或broker JWT；缺依赖404，不回退旧JWT projection |
| Provider composition | 只接显式可信verifier/tokenForSubject；本地验收使用临时签名器/公钥reader | normal index无自动provider，flag开但未配置则503；实际受保护signer/HTTPS JWKS reader与配置注入HOLD |
| 数据库 | 既有binder0023固定source解析、独立LOGIN/pool、one-use ticket、0037受控读取/READ审计 | 无新DML、管理权限、直接读表或自动人员/家庭登记；不改SQL |
| 学生 | 只列当前Canonical授权的学生最小摘要 | 单学生应用ID映射未批准实现；新BFF单学生404，Node受控resolver拒绝，不猜ID |

开关：CANONICAL_FAMILY_PROJECTION_ENABLED、CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED、CANONICAL_BROKER_SESSION_BRIDGE_ENABLED，均须字符串true。BFF使用独立CANONICAL_SESSION_API_ORIGIN，仅允许http loopback root URL；不复用CANONICAL_FAMILY_API_ORIGIN作回退。Node session factory仍仅允许test+loopback+显式注入，真实配置缺失不影响默认关闭启动，但阻止启用。

cookie只是一项由既有AuthService校验的opaque credential，BFF不把它当角色/家庭证明；HttpOnly、SameSite Strict在合成浏览器fixture中设置。真实cookie签发/退出/域策略与正常客户登录接线未实施或验证，不从已有D1登录或聊天Jimson角色推导Canonical principal。没有公开token mint、默认家庭或匿名回退。

共享BFF响应仍限制字节/DTO、no-store、安全header、manual redirect与超时，不转发upstream cookie或身份header，不输出token/JWK/配置值。正常业务用户只看到既有只读预览或通用不可用提示，没有实现细节进入页面流程。

验收将独立Web页面和BFF实际运行在loopback Vite，使用真实Node HTTP、签名验证、Store会话和实际PG16/17受控SQL；数据库名字修改能在页面显示，A/B/A无跨家庭，撤销opaque session后页面无资料。恢复库重复相同链。旧JWT预览的回归也保留，二者凭据及入口明确隔离。

本地PASS不关闭F1–F5。真实issuer归属/TLS/JWKS、分离保护配置与轮换、实际repo/SHA/环境、岗位/关系/用途、撤销与日志备份运维均需当前受控证据；只收引用/脱敏文档摘要，不收密钥、token或逐人ID。原治理Required Checks/CODEOWNERS/管理员门禁及Founder整合发布授权也不由此文件自动生效。
