# PR48 正式代码、权限与审计复审

2026-11-04｜Jimson本人授权，Codex执行。采用玄武安全检查流程；这是本会话具名授权的技术复审报告，**不是不同GitHub账号/第三方审查人的Approve，也不代签Founder、玄武、白虎或麒麟。**

## 固定对象、范围与结论

- 审查对象：[PR48](https://github.com/yvettfang-netizen/phoenix/pull/48) 固定提交 `6e4dec2cd752158d67d139d75b3bf9971232b439`，分支 `codex/canonical-0037-id-read-audit-20261104`。先核对远端与干净工作树，再读取原始源码，编译原始应用后增加隔离探针，不用历史CI代替审查。
- 范围：0037全部SQL/Manifest、Node投影/配置/连接池、BFF与合成JWT、相关路由、测试及CI增量；沿调用链复核原审计helper、0023解析/票据与既有权限语义。不是全仓库历史Secret/PII审计或真实运行环境审计。
- 原始状态：发现**1项Medium权限预检缺口、1项Low错误封装问题**；另排除一个超时漏洞疑点，纠正原注释/交付说明。没有在本范围证实Critical/High、跨家庭资料泄漏或审计伪造路径，不能推广为全系统无漏洞。
- 修复后本地：**PG16 PASS / PG17 PASS / TECHNICAL REVIEW PASS WITH CONDITIONS**。精确修复SHA及新CI结果由PR48检查页、私有复审证据和本轮Notion交付记录绑定；不得用原6e4dec2的20项成功冒充修复提交的CI。
- 真实身份、部署、生产、真实数据继续HOLD；不合并、不提交或伪造独立Approve。工程复审完成不代表已获生产或合并许可。

## 发现、反例及处置

| 编号/等级 | 固定SHA上的实际证据 | 修复/复核 | 状态 |
|---|---|---|---|
| R48-01 / Low | protectedJson直接传播JSON.parse/fs错误。特定不合法合成JSON使异常携带CANARY片段，错误为SyntaxError、无503状态；并非每种JSON语法错误都有片段。实际index.ts启动入口只记录error.name，所以**没有证明当前启动日志或HTTP泄露真实凭据** | 文件读取/ACL/JSON失败统一变为无原文、无路径的503；非对象根拒绝。永久反例覆盖不合法JSON、null/数组/字符串根及不存在文件；修复后AppError/503、excerptPresent=false | CLOSED / PASS |
| R48-02 / Low文档错误；安全疑点排除 | 原先假设DISCARD ALL使binder的2s启动超时变0。PG16/17在同一真实binder PID连续读取，timeout=2s、reset_val=2000；带断言的签票函数仍返回200。最初期望503的探针失败恰好否定该假设 | 纠正源码注释及契约，不宣称修复不存在的binder超时漏洞。保留逐事务SET LOCAL和客户端query_timeout作为约束。测试只将binder池idle窗口延长到60秒以确定性保持真实后端，不模拟SQL结果或身份；应用实现未因此更改 | NOT A REPRODUCED TIMEOUT VULNERABILITY / DOCUMENTATION CORRECTED |
| R48-03 / Medium | audited guard只查五个Schema的CREATE，binder guard未查Schema CREATE。在合成库给read LOGIN、专用NOLOGIN role或binder LOGIN临时GRANT CREATE ON SCHEMA casework后，固定源码均仍返回200，违反其无DDL能力预检契约。**默认部署权限本身未发现该多余授权**，不是默认可越权读取的证明 | 预检检查全部非临时Schema及数据库CREATE（建Schema能力），兼顾LOGIN/专用role，binder同样拒绝永久DDL能力。修复后3类账号/角色 × Schema/Database两类过宽CREATE均503，撤销测试grant后恢复200；正常TEMP能力可保留但不能遮蔽core对象 | CLOSED / PASS |

R48-03的数据库CREATE作为同类遗漏一并补齐并新增修复后反例；冻结目标的直接前后比较证据是casework Schema CREATE，不将未执行的原始数据库CREATE反例写成已重现。

### 超时依据及探针校正

[PostgreSQL DISCARD](https://www.postgresql.org/docs/16/sql-discard.html)定义DISCARD ALL包含RESET ALL；[RESET](https://www.postgresql.org/docs/16/sql-reset.html)恢复相应默认值，而非必然恢复到0。本报告的2s/reset_val结论来自上述两个版本的实际同PID探针，不由文档推导任意部署配置的默认值。

最初的两类探针开发失败也保留：某种不合法JSON只报告位置、不带片段；最初将binder签票返回200误预期为503。随后换用确实含片段的合成JSON，并直接核对相同后端的timeout/reset_val。未删除这些反证或把它们包装成产品已修复的漏洞。

## 权限与审计复核表

| 边界 | 核验事实 | 结论 |
|---|---|---|
| 迁移完整性 | 0001–0035及0037原字节保持；0037 SHA-256仍 `29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2`；共36文件/账本，0036继续在独立PR41 | PASS；不需要新Migration |
| SECURITY DEFINER | 五个函数均固定search_path、pg_temp最后；owner可能绕过RLS，因此检查显式家庭、ACTIVE FAMILY principal/actor、实时时钟成员/监护谓词 | PASS（本候选范围） |
| EXECUTE矩阵 | 实库读取prosecdef/proconfig/ACL：projection role仅对三个wrapper为true、两个private helper为false；binder及旧app对五个均false | PASS；完整原始矩阵保留私有 |
| ID与访问范围 | typed已登记fam_/stu_、目标存在及编码一致；不给全局mapping SELECT；学生本人/有效核验监护子集；未知与外家庭单项同404 | PASS；不新增身份或映射规则 |
| 读写隔离 | 普通短事务只允许受控审计写入；业务/mapping/audit直读、DML/sequence/DDL、helper、签票及旧角色SET均有负例 | PASS；本轮扩全DDL预检，不改原表权限 |
| 身份/池 | 分离真实LOGIN、issuer/subject与source-qualified家庭解析、一次性ticket、nonce、PID/backend_start、clear/reset/discard；失败连接销毁 | PASS（合成）；真实provider/lifecycle不据此关闭 |
| 审计真实性 | READ/action/resource/reason不可由客户端指定；ALLOW/DENY含正确principal/actor/family/nonce/attempt；拒绝先commit；100项及超限、回滚与LOG_ONLY对账核验 | PASS；ALLOW仍不证明送达，DB行仍可回滚 |
| 故障/恢复 | 审计INSERT、延迟COMMIT、非法DTO、断库等拒绝正文；专用备份、篡改拒绝、全新恢复后重跑新/旧负例、复审探针及浏览器 | PG16/17 PASS；36账本/92表/83策略 |
| 密钥/数据 | default-off、development/test及loopback限制、合成.invalid issuer；无真实密钥、身份、客户数据、腾讯连接或运行库升级 | 边界遵守；真实接入HOLD |

## 实际执行与可复验记录

原始源码分别编译后，以两个版本执行 `node database/canonical/verification/v0037/projection-e2e.mjs <16或17> --review-original`：该取证模式只在原始应用源码6e4dec2上使用，预期接受原始缺陷观察，不是修复验收。新增探针不改变冻结应用逻辑；每次注入的函数/grant均恢复，应用源文件原始摘要在取证开始前单独核对。

修复后编译并执行同一脚本（**不加--review-original**）：不合法配置必须503、过宽CREATE必须503，超时必须仍为2s。两个版本均跑fresh/upgrade/repeat/drift/atomic、全部既有新投影反例、真实浏览器及全新集群恢复；恢复后再次执行复审矩阵。后端原136项、typecheck/build通过。原SQL、原smoke/migrate及BFF业务字段不改。

原始命令、stdout、最初失败探针、修复前后结果及文件摘要保存在私有 `canonical-db/evidence/pr48-formal-review-20261104/`。准确修复HEAD、CI及私有证据提交由交付记录给出，不将设计或报告视为建库证据。所有自有fixture、容器、卷均清理；旧库和历史保留项未动。

## 当前门禁

Jimson授权的本轮正式技术复审与修复闭环已完成。实际GitHub不同账号的Review/Founder合并决定仍以真实记录和规则为准，本会话不冒充或绕过。

**唯一下一步：依据既有真实身份缺口表补齐受控事实证据包并核验其来源。** 已冻结ID/FM/broker/责任人不重开；证据包只收非敏感配置和私有证明引用，不填写任何密钥、token或真实客户记录。缺证保持HOLD，本任务不批准启用或部署。
