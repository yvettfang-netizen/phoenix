# 0036/0037隔离兼容与会话BFF执行报告

2026-11-05；Jimson本人授权及回写，Codex执行。准确最终提交/CI和Notion收据以推送后同步记录为准，本报告不伪造自引用SHA或独立签署。

| 项 | 状态 | 实际执行/限制 |
|---|---|---|
| main与来源 | PASS | main9de1e8d…上新分支；0036取PR41/3de5c99…，0037/bridge取PR54/c1b2f30…；C1–C4批准来源摘要f100e615…已对照原件 |
| SQL/验收原字节 | PASS | 0001–0035及0036/0037均固定原SHA；0036来源验收脚本也保持摘要；没有新业务Migration |
| 冲突处理 | PASS | 两个Education冲突保留main新版元数据/阶段入口，仅重加默认关目录；不改Wealth/Health等main新成果 |
| backend类型/构建/测试 | PASS | 现有入口typecheck、build、146/146 tests；新增composition拒绝/无回退及双路由隔离测试 |
| website类型/相关lint/BFF测试 | PASS | typecheck和相关eslint通过；新旧family/session/catalog共8/8；不是全站生产联通证明 |
| PG16完整组合验收 | PASS | fresh实测37账本/93表/83策略；35→36→37、repeat、两个forward漂移、原子回滚、原0036业务/边界及0037权限/审计；新旧浏览器链及fresh restore通过 |
| PG17完整组合验收 | PASS | 与PG16相同；fresh及restore都跑原0036业务/边界与0037、独立opaque-session页面/BFF链；实测37账本/93表/83策略 |
| 默认关闭应用/BFF准备 | PASS（本地） | 独立opaque cookie/页面/BFF/Node composition，A/B/A与数据库变更/撤销验证；normal bootstrap缺provider拒绝，不启用真实身份 |
| 真实运行/身份/配置/发布 | HOLD / NOT RUN | F1–F5、单学生、真实provider与登录接线、治理及最终Review/批准不由测试替代；不连腾讯或生产 |

初次PG16在restore阶段复制原0036测试工具时缺少/opt/verification目录，失败并完成自有fixture清理；已在复制前显式创建目录并重跑。失败日志/退出码与成功输出都保留，未修改SQL规避问题。首次本地来源patch出现两处Education冲突，冲突文本和来源/处理记录保留，未执行git merge或覆盖main历史。

组合fresh与restore实际查询账本、表、策略；不拿旧36行/92表的设计当建库证明。原始脚本计数与新组合范围区别见README。所有DB LOGIN/票据/key/session为纯合成，SCRAM/受保护文件与stdin沿用；不在命令行传口令。只清理本轮自有标签容器、卷和fixture，不触碰常驻库、旧匿名卷或旧项目。

限定公开候选扫描、源/相对链接/换行/SQL摘要及准确HEAD CI在封包/推送时留原始结果。Windows工作树和Git规范化文本摘要分别记录；所有SQL源字节始终完全一致且LF，不能借换行修改历史Migration。原始日志和源索引只存既有私有证据分支，公开仅合成候选代码及脱敏报告，不归档key/pgpass/.env/dump/globals。

唯一下一步：固定此整合候选接受真实技术/业务/治理Review，同时按原F1–F5补当前事实，准备后续受保护provider/登录接线；缺失保持HOLD。当前没有Merge、部署、腾讯升级、真实身份登记/数据导入、历史库删除或他人签名。
