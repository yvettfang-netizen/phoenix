# 最小 Forward Migration 设计（未实现）

**DESIGN ONLY / NOT RUN**。不放入 Migration 执行目录，不修改 0001–0035 或 PR41 的 0036。编号协调点：当前最早候选 0037，非编号预留。沿用 [ID 决策](ID_DECISION_TRACEABILITY.md) 与 PR46 的保守字段及关系范围，不把本设计标为 APPROVED / EFFECTIVE。

## 变更面与数据库接口

建议一份 Forward Migration：一个专用 NOLOGIN 权限角色、三个受控读取函数和一个私有翻译 helper。**零新业务表、零人员/家庭/学生迁移、零现有写入接口变更、零新 Consent 用途。** 不建立通用 public-ID / UUID 查询端点。

| 新对象（建议名称） | 签名/返回 | 调用权限 |
|---|---|---|
| phoenix_canonical_projection_reader | NOLOGIN NOINHERIT，NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS | 不成为 reader/app/binder/migrator 的成员 |
| core.read_family_summary() | jsonb envelope，唯一当前家庭；无 family_id 参数 | 仅专用角色 EXECUTE |
| core.list_student_summaries() | jsonb envelope，最多100项；内部查询101项检测超限 | 仅专用角色 EXECUTE |
| core.read_student_summary(p_public_id text) | jsonb envelope；只接受 stu_ + 32 小写hex | 仅专用角色 EXECUTE |
| integration.lookup_projection_public_id(p_kind text,p_id uuid) | text 或 NULL；只允许 FAMILY/STUDENT_PROFILE | 无运行时 EXECUTE；仅上述函数内部调用 |

三个入口为 `VOLATILE SECURITY DEFINER`，固定 `search_path=pg_catalog,auth,core,integration,audit,pg_temp`，所有对象限定 schema、无动态 SQL、无调用者提供关系名/字段名。pg_temp 放最后避免临时对象抢先解析。创建同一事务内显式 `REVOKE ALL ... FROM PUBLIC`，再定向 GRANT；helper 也撤销 PUBLIC。权限核验包括默认权限和角色闭包，不只看直接 GRANT。函数 owner 使用受控迁移所有者，运行角色不拥有 schema / 函数，不能替换实现。

SECURITY DEFINER 的所有者可能绕过 RLS，**不得假设 owner 查询自动受到调用者 RLS 保护**。入口必须显式执行下述完整授权谓词；合成测试须证明不会超出原 RLS 与 PR46 子集。旧 reader 及其策略维持不变，但新正式投影 LOGIN 不能再属于它，否则可绕过受控函数直接读表而不留审计。

## 精确授权与 ID 翻译算法

1. 仅有效、PID + backend_start 绑定的未过期上下文；nonce 非空；channel=FAMILY；principal 仍 ACTIVE 且 kind=FAMILY，person_id 与上下文 actor 一致；当前 actor 在当前家庭的 membership 在实时时钟下有效。无 GUC/client-header 身份替代。数据库 context 不保存原 issuer/subject/mapping 行，故不能声称函数本身重新核验了这些来源事实；每次请求仍须先经0023重新解析并签票。
2. family 只能取当前家庭，无任意家庭输入。student 必须 join people + student_profiles + 当前家庭有效 membership，且为本人，或当前 VERIFIED、未撤销、未过期的 EDUCATION / GENERAL 监护授权。保留已有 helper 语义，并补实时时钟条件防止长事务使用过期关系；不扩展到 ADVISOR/PARTNER/SERVICE，不开放家庭全体成员或身份敏感资料。
3. 仅在得到授权对象集合后 join integration.public_ids，精确 entity_kind、正确 fam_/stu_ 前缀与 UUIDv7 目标。检查公开值与既有创建接口的 prefix + 去连字符 UUID 一致；缺失、错类型、悬空或不一致均内部报 ID_MAPPING_UNAVAILABLE，不拼接生成替代 ID、不插入修补数据。列表中某个已授权对象的映射损坏则整个结果 fail-closed 503，不静默遗漏；无权对象不进入集合，也不探测其映射状态。
4. 单个学生输入先校验 stu_ 格式，再在已授权集合中按 public_id 精确匹配，返回已授权 DTO；未知与无权均同一 NOT_FOUND envelope / HTTP404，不泄漏是否存在。不得将十六进制反解后跳过映射表。不要承诺数据库执行时间完全恒定；统一状态/正文及日志边界，并在应用层另核验限流、探测防护。
5. 不接受 legacy_student_id 或 application_family_id 作为公开定位符。PHOENIX_FAMILY_OS 的 fam_ 仅由 binder 的0023入口处理，不能替代 canonical public fam_。

family DTO v2：`{schemaVersion:"family-summary.v2",family:{familyRef:"fam_…",displayName}}`。

students DTO v2：`{schemaVersion:"student-summary.v2",items:[{studentRef:"stu_…",displayName}]}`；单项使用 `item`。不输出 internal UUID、principal、guardian roster、出生日期、学校、联系方式或文件。v2 为明确版本变更；不能把当前 v1 的 UUID 字段无版本地替换。原预览保持默认关闭直到独立实现验收。

数据库 envelope 仅供可信后端：`{status:"ALLOW|NOT_FOUND|DENY|UNAVAILABLE",data:<DTO或null>}`。不把内部 reason、attempt、UUID 或 SQL 错误透传浏览器。列表成功空集为 ALLOW + items=[]，不等于授权失败。非法输入为 DENY，后端按固定400/403映射；无权/未知学生固定404。

## 受控读取审计及事务

复用0014/0017已有的 `audit.record_write_decision(text,text,uuid,boolean,text)`，由新读取函数内部以固定 **action=READ** 调用。该 helper 名称含 write，但 action 为 text，现实现支持 READ，并同时写 access_events、带 request_nonce/attempt_id 的 PHOENIX_AUDIT 服务端 LOG。不改旧 helper，不授予运行账号其 EXECUTE，不新造可伪造的通用 audit API；也不复用缺少 nonce/attempt 的旧 record_access_event 充当完成。

- 固定 resource_kind：FAMILY_SUMMARY / STUDENT_SUMMARY / STUDENT_SUMMARY_LIST；reason 白名单：AUTHORIZED / NO_TRUSTED_CONTEXT / SUBJECT_UNAVAILABLE / ID_MAPPING_UNAVAILABLE / RESULT_LIMIT_EXCEEDED。调用者不能传 decision、reason、actor 或 family。
- family/single：每次调用记录一次决定。列表：记录一次 LIST 决定，另对实际返回的每位学生记录一次 READ/ALLOW，所有行与结果在同一事务；若映射损坏或超限则不记录成功学生项，只记录失败决定。未知/无权单项的 resource_id=NULL，避免把跨家庭对象挂到当前家庭的审计记录。合法成功记录内部 UUID，只在受保护审计域内保存。
- `audit.access_events` 已有 event_id、occurred_at、backend_pid、principal_id、actor_person_id、family_id、action、resource_kind、resource_id、decision、reason_code、attempt_id、request_nonce；无必要新字段/新审计表。attempt 由受控 helper 随机生成，nonce 来自0023绑定上下文，不接受客户端指定身份。
- 新专用角色无业务表、mapping表或audit表 SELECT/INSERT/UPDATE/DELETE，无审计序列写入、DDL、context签发或管理接口权限。为该角色只授权数据库CONNECT、core/auth必要schema USAGE、三个入口与 auth.redeem_context_ticket(uuid,uuid)、auth.clear_context()、auth.current_request_nonce()、auth.current_family_id()、auth.current_principal_id() EXECUTE；后两者仅用于清理后校验，不提供任意对象查询。不授予integration/audit schema USAGE。binder仍使用独立 LOGIN 与独立pool，只具备0023签票，不得到新读入口。
- **不能用 BEGIN READ ONLY 调用会写审计的函数。** 后端改为短时普通事务，在专用角色下调用一次入口、验证完整 envelope/DTO、COMMIT 后才释放任何HTTP正文；业务读写边界由角色权限限制，而不是假称整个事务只读。应用启动检查应拒绝旧reader会员资格、业务表直读或通用audit执行权限。
- 因 LOGIN 为 NOINHERIT，精确连接顺序为：启动权限检查 → SET ROLE 专用角色 → clear → 独立binder签票 → 本连接redeem/nonce核验 → BEGIN → 受控入口 → DTO校验 → COMMIT → 仍以专用角色clear并校验family/principal均NULL → RESET ROLE → DISCARD ALL。角色授权不足、继承reader等旧权限或clear失败均启动/请求拒绝，不依赖LOGIN隐式继承。数据库CONNECT必须独立给实际LOGIN配置，不把NOINHERIT角色CONNECT当作LOGIN连接许可。
- 正常拒绝通过 envelope 返回而不抛业务异常：先 COMMIT 拒绝审计，后发403/404/503。审计INSERT/LOG失败、COMMIT失败、DTO校验失败均无业务正文并回滚/清理。finally rollback-if-needed / 恢复专用角色 / clear / 验证空上下文 / RESET ROLE / DISCARD，清理失败销毁连接，保留一次性票据及分离pool原则。JWT验证失败或binder未签票而尚未调用DB读入口的请求由受保护应用认证日志记录，不伪造为已发生的数据库读取。
- DB行可被调用事务回滚，LOG不可由 SQL ROLLBACK 撤回；这只证明“决策尝试”可对账，不证明客户端已收到数据，也不保证服务器崩溃/日志配置错误时不丢失。审计发出后发生错误可能出现LOG有ALLOW但无committed row；按既有D-9对账识别，不宣称已交付。禁止在发送HTTP后补写“授权审计”。
- 新role强制受控路径仅保护使用该role的投影，不追溯消除管理员/其他已授权reader的读取能力。旧账号退役/授权治理需独立变更，本轮不自动停用已有账号。

## 数据与运维边界

现有规则和审计保留政策继续沿用；本轮不发明真实日志目的地、保留期限、跨境或WORM设施。运行时审计/日志采集、访问控制、留存、对账与恢复证据未取得，真实启用仍HOLD。原始数据库日志含内部身份/资源引用，只能放私有证据域，不能上传公开CI产物。

本设计不新建真实LOGIN、不读取/生成实际密钥、不登记真实身份、不补历史缺失public_ids、不改映射审核权威。PUBLIC_BASE_URL/JWKS等事实见[缺口表](REAL_IDENTITY_GAP_AUDIT.md)。0036分类与本方案无表结构依赖，但最终编号、账本行数、恢复断言和CI基线必须按当时实际合入顺序同步。

回退方案：新接口保持默认关闭；停止候选进程/关闭开关。Forward一旦登记不得改字节或手工删账本；需要回退权限/功能时另走Forward修正。本轮没有执行此方案。
