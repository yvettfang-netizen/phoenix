# Phoenix Meta｜执行验收、发布门禁与回滚补充

任务：PHOENIX-META-CANONICAL-ACCEPTANCE-ROLLBACK-20261105。关联主任务：PHOENIX-META-CANONICAL-INTEGRATION-20261105。日期：2026-11-05（Asia/Shanghai）。**发布结论 HOLD；无生产授权。**

## 执行边界

这是准备的runbook，未执行生产或Staging变更。负责人：技术值守待指定、数据库Jimson、最终变更批准Founder；不得把角色名称当签字。任何真实操作绑定变更单、精确版本、窗口、停止条件、监控及回滚负责人。本任务只可做局部本地模拟。

| 层 | 当前可恢复来源 | 当前资格 |
|---|---|---|
| 页面 | Sites67 / a96de29 / 保存包hash见M0文件 | 来源存在；安全与旧版完整回归未通过，NOT QUALIFIED |
| API | 旧Canonical兼容API版本、artifact digest、路由配置 | EVIDENCE_MISSING，不使用D1任务API替代 |
| DB | 已验证backup+ledger+schema inventory | EVIDENCE_MISSING；仅知道源码0035，未查生产ledger |
| Runtime | 已验证配置、工具清单、授权版本及revocation ledger | EVIDENCE_MISSING；外部GPT链接不是回滚artifact |

## 第一层：页面

Failure：页面崩溃/无法加载或投影误导。Detection：合成页面smoke、浏览器错误及已批准监控阈值。Containment：由获授权值守在实际运行环境关闭META_CANONICAL_READ_ENABLED，确认新请求无Gateway流量；若页面无法加载无法靠UI按钮关闭，使用受控部署配置通道。flag传播和inflight请求单独记录。

Rollback：在既有应用恢复经资格验证的上一版本，保留/→/wilds→/realms/:id及/nova导航；当前67版有已知权限/编号缺口，未整改或加受控关闭策略前不能作为安全恢复目标。不得把旧内容按实时事实呈现；不删除任务/审计/业务数据。

Verification：/、/wilds、九个正式入口、/nova匿名与已授权角色、五模块空/历史状态、桌面与移动、资产加载、旧入口权限负例、禁止写入均smoke；确认无额外DB权限或第二主库。Recovery Decision：全部恢复断言与安全门槛通过后由责任人建议，Founder批准正式恢复流量；否则保持关闭并修复。

## 第二层：API

Failure：500、超时、错误scope、源版本不兼容。Containment：停止故障路由新增流量/关闭feature flag，不降级到浏览器或无鉴权DB连接；保留request id、服务身份、audit、故障事件和日志脱敏。审计不可用时fail-closed，使用已批准受控故障记录通道，不把丢失审计的请求算成功。

Rollback：先用测试Schema版本/校验和与契约测试确认旧API兼容，核实原artifact digest与部署配置，才能切回。没有旧版本或不兼容时禁止强切；维持503并准备兼容性修复版本/Forward方案。本轮不存在已验证的旧Canonical API，故此步骤不能报可执行PASS。

Verification：每条GET、401/403/撤权/ticket/池清理、no-store、DTO字段版本/证据、旧API对现Schema读取和错误语义、allow/deny/error持久审计。禁止自动重试有副作用操作。Recovery Decision绑定监控窗口和批准阈值。

## 第三层：Canonical PostgreSQL（Forward-only）

Failure：新迁移/Schema行为错误或一致性异常。Containment：关闭相关功能写入、停相关worker/队列消费者新任务，保留数据库状态、已执行migration ledger/checksum、审计和备份；不删除执行记录，不倒改0001–0035，不运行down migration。

Rollback方向：优先兼容旧/新API的修复性Forward Migration，独立审查和授权；没有批准不得执行。若必须恢复backup，先在隔离目标演练并记录下表；真实恢复可能损失已确认业务数据时必须另取Founder授权，禁止覆盖原实例后才判断损失。

| 恢复必填项 | 当前 |
|---|---|
| backup ID/hash、开始结束时间、DB版本与migration ledger | EVIDENCE_MISSING |
| 恢复目标（明确非生产演练/后续另批生产目标） | PENDING |
| RPO/RTO/保留周期及审批 | NOT APPROVED；无达标声明 |
| 恢复工具/镜像digest/加密与访问权限/日志 | PENDING |
| 数据一致性 | 关键master及FK、任务/状态、唯一/幂等键、行数+业务校验、ledger/checksum与RLS/ACL |
| 恢复后审计 | 保留原审计不可篡改来源；标记恢复点与缺失窗口，重建关联不能重写历史；证明deny/allow可追溯 |
| 不可逆外部变化 | 合同/付款/发布/工具操作逐项对账，不能只据库状态重放 |
| 需要补偿/重放清单及批准 | PENDING；外部动作与幂等状态不明→人工处理 |

Verification：隔离恢复后PG16/PG17兼容与应用API、撤权、ticket、context cleanup、审计完整、业务对象关联测试；测量实际RPO/RTO并对预先批准阈值，不能把pg_restore exit0当恢复验收。Recovery Decision由Jimson提出、玄武验证、Founder在具体风险范围批准。

## 第四层：Agent Runtime

Failure：错误授权/编排绕过Phoenix/工具异常重复执行。Detection：audit与异常访问告警、错误Spirit/高风险action监控。Containment：服务端禁用受影响Agent capability、停止新高风险执行和消费者；现有任务保留并经批准状态机转暂停/待人工。当前没有此写状态机，不能直接改表模拟成功。

Rollback：恢复已验证Runtime配置版本及artifact hash，**与当前有效权限、撤销ledger和任务状态重新求交**；旧配置绝不能复活已撤销授权。Founder→Phoenix→Relevant Spirits→Synthesis→Founder Gate不变，F3未批始终拒绝。

网络中断后的外部操作先按幂等键/状态/trace到实际目标核对：已完成仅补关联；未完成且可幂等重试再经授权重试；结果未知→暂停与人工核对；补偿使用独立批准契约。不得重复签约、支付、发布、部署或迁移。

Verification：任务owner/scope、revocation、伪造Agent、最小Spirit分发、F3拒绝、timeout/断网的exactly-once业务意图、审计连续性。Recovery Decision以独立实测和批准为准；不能用恢复旧prompt宣称Runtime恢复。
