# 合成验收与证据边界

**本轮为只读审计/契约准备，不把新页面接入填成PASS。**

| 检查/证据 | 实际执行/来源 | 状态 |
|---|---|---|
| 最新main、相关远端分支、全部PR合并事实 | 本轮GitHub GET及git ls-remote；SOURCE_INDEX/BRANCH_AUDIT与私有原始响应 | PASS |
| main0001–0035摘要 | 本轮35/35逐项核对，未执行DB初始化/迁移 | PASS |
| 模块page/API/store/数据库适配器 | 本轮逐文件/完整未截断候选Git树核对；私有学苑及具名Founder源码只读 | PASS |
| PG16/17 Canonical本体及历史三条读路由 | 既有PR41固定3de5c99…、[Run41631005574](https://github.com/yvettfang-netizen/phoenix/actions/runs/41631005574)8/8；前轮完整F10/恢复/历史1测试3路由证据 | PASS（既有基础证据，不是本轮新页面贯通） |
| 当前各真实运行数据库账本/真实API部署 | 不读取真实数据/密钥，不连接D1/腾讯/生产 | NOT RUN |
| 新P0课程目录Page→Backend→Canonical→响应 | 本轮没有新增API/调用链；仅提交最小合同 | NOT RUN |
| Education/Identity/Wealth/Health新正式写入 | 无正式路由/身份及字段启用证据 | BLOCKED |
| ASKWISE真实Student映射/导入、学苑报名/扣课时 | 未批准/未执行 | HOLD |
| Family/Founder新授权投影 | 具体字段/角色/实际连接未完成 | NOT RUN / HOLD |
| 本文档候选的受保护CI | 以本分支实际提交对应Checks为准；未运行前不得继承其他SHA | NOT RUN（文档编写时） |

已有各模块npm test、Mock通过、页面构建、/api/health=ok、readiness=CANDIDATE、SQL恢复PASS均只证明各自范围。尤其旧桥接的Canonical授权查询不代表响应不再读取旧Master。

## 下一批最小真实合成验收

P0目录：在现有Node服务新增受控只读适配器，使用一次性PG16/17和生成凭据/合成已发布课程；HTTP请求验证实际调用list_published_courses及精确响应字段，Draft/Retired/未来版本不可见，错误不回退demo；执行Fresh/Upgrade/Repeat/Drift/Atomicity及备份恢复兼容。不得把这份计划标为已跑。

随后每模块单独运行页面/HTTP→可信解析→分离app/binder→RLS→真实投影E2E：

- Education/Learning：版本不变、仅授权学生、监护/Consent/教师到期拒绝、仅发布卡可见、无重复主数据。
- Identity/Wealth：来源与需求分离、Mock ID拒绝、渠道/顾问跨对象拒绝、缺规则/Finance默认拒绝、幂等冲突。
- Health：只接白名单非敏感字段，联系许可不冒充患者同意，禁止上传/临床/真实预约及敏感投影。
- ASKWISE/学苑：未映射/错绑/撤销拒绝，事件重放不重复记证据/扣课时，时区/版本缺失显式处理，不自动按姓名匹配。
- Family/Founder：同一授权上下文内读取真实Canonical DTO，连接归还clear/discard、跨家庭/组织拒绝，汇总不带敏感明细或伪Finance收入。

本轮未运行会自动打开ASKWISE来源SQLite、启用WeChat/OpenAI/支付/Feishu或连接真实D1的脚本。实际代码检查及文档校验原始命令/输出在私有证据中；新API合成验收必须按各自准确代码SHA另行留证。
