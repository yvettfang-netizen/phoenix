# 0037 actual synthetic acceptance

**LOCAL PG16 PASS / LOCAL PG17 PASS / REAL IDENTITY HOLD**。只使用一次性、带标签的新集群及纯合成数据，不连接本机既有库、腾讯或生产。原始命令/输出在私有证据包 `canonical-db/evidence/canonical-0037-20261104/`，最终提交SHA、CI及归档SHA见本候选GitHub/Notion交付记录；公开报告不复制原始运行日志或fixture凭据。

| PR47验收项 | PG16 | PG17 | 实际核验 |
|---|---|---|---|
| F-01 fresh/upgrade/repeat/drift/atomic | PASS | PASS | fresh 35+0037共36文件；另建0035升级集群保留已有合成家庭；36项重复校验；0037漂移拒绝；故意失败的0038探针不留schema/账本 |
| F-02/04 ID与来源 | PASS | PASS | 表内fam_/stu_精确v2输出；同Person per_、旧stu_、内部UUID及应用fam_不能冒充公开学生ID；无自动建档 |
| F-03 异常映射 | PASS | PASS | 缺失、错前缀、错编码、悬空映射拒绝；列表整单失败、无ID拼接回退；未知/外家庭单项相同404 |
| F-05/06 context及关系 | PASS | PASS | backend_start错配、事务内到期、错误channel、主体/身份停用、无关成员、跨家庭、自报/未来/自然过期监护、学生成员过期拒绝；本人及有效EDUCATION/GENERAL基本投影成功 |
| F-07 权限负例 | PASS | PASS | 分离真实LOGIN；业务/mapping/audit直读、DML/sequence/DDL、audit伪造/private helper/管理API/SET旧角色拒绝；临时表不能遮蔽core对象；新角色获额外server-file父角色时应用503 |
| F-08 ticket/pool | PASS | PASS | 伪造/过期/错principal/重放票据拒绝；并发A/B/A、clear/reset/discard；结束context/ticket均0；连接故障不返回资料 |
| F-09 受保护审计 | PASS | PASS | READ、资源、ALLOW/DENY、principal/actor/family、nonce/attempt核对；单项无权不记录外家庭资源UUID；空列表成功；100项101条ALLOW事件，超限整单失败且0条成功学生事件 |
| F-10/11 事务与失败 | PASS | PASS | READ ONLY失败；ROLLBACK后DB行0但LOG保留；attempt/nonce对账区分LOG_ONLY与committed；审计INSERT故障、延迟到COMMIT的故障、无效DB DTO均503无业务正文，恢复后再次跑故障测试 |
| F-12 browser E2E | PASS | PASS | 实际Edge → BFF → 合成JWT → 独立binder → ticket → 专用role受控v2函数；库内名字变化可见、A/B/A隔离、监护/身份/mapping撤回下一请求拒绝；恢复后浏览器A/B再读取 |
| F-13 fresh-cluster restore | PASS | PASS | 专用backup LOGIN导出dump/globals；摘要篡改拒绝；新集群角色/权限/函数恢复，36账本/92表/83策略；重跑全部新数据库regression与HTTP故障、浏览器；无测试注入残留 |
| F-14 compatibility | PASS（本地） | PASS（本地） | 复用原0017 LOG格式与attempt/nonce；旧136项后端测试、类型/build通过；网站类型、目标lint、3项BFF测试通过；旧0035及目录/投影回归在独立CI保留，准确HEAD最终状态见PR checks |

脚本：`verification/v0037/projection-e2e.mjs`（PG16/17）及 `read-audit-regression.mjs`；原SQL、原smoke/migrate脚本字节不变。最新角色/私有helper不增加业务表或RLS策略，因此表/策略数仍92/83，不代表未应用0037。

本地软件：Docker Engine 29.8.2，锁定PG16/17镜像摘要见脚本，Playwright 1.62.1，当前机器用headless Edge；GitHub CI用独立Chromium。Web凭据不在JavaScript、Cookie为合成HttpOnly预览票据；没有真实login/signing端点。

备份manifest未签名，digest只提供一致性检查；服务端LOG可能丢失、ALLOW不证明客户已收到数据，已有reader/管理员仍可能独立读取。真实审计采集/留存/轮换、provider事实、真实主体核定及正式启用继续HOLD，不用合成PASS替代生产或独立审核。
