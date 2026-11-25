# Forward 实现验收计划 — 全部新能力 NOT RUN

本文件为可执行实现批次的验收合同草案，不是测试报告。以下用纯合成数据、两个真实分离LOGIN、一次性票据，在PG16和PG17均须独立通过；禁止superuser SET ROLE替代登录证明。复用既有投影fixture及备份/恢复工具，但不得把PR46的PASS移作新函数已通过。

| 编号 | 必测项目 | 预期 | 当前状态 |
|---|---|---|---|
| F-01 | 核对最新main/候选编号；35个历史SQL逐字节匹配；全新安装至新编号，重复、漂移拒绝、原子回滚；升级0035与若已合入0036的路径 | 账本与实际迁移集合一致，不覆盖0036，不手改账本 | NOT RUN |
| F-02 | FAMILY/STUDENT_PROFILE既有public IDs正反向翻译 | 正确fam_/stu_，同person的per_不能当stu_；DTO v2，无UUID回落 | NOT RUN |
| F-03 | 缺失/错类型/前缀与kind不符/悬空/编码不符public_id | 有权目标映射损坏503无正文、不补数据；无权/未知学生同404，无存在性泄漏 | NOT RUN |
| F-04 | application fam_与canonical fam_恰好同形或不同值；旧stu_2026_001；伪造usr_ | 来源不混用，legacy不进入public读取；subject仅按issuer+subject映射，无自动建档 | NOT RUN |
| F-05 | 无context、PID/start错配、过期/停用主体、错误channel、跨家庭、非有效成员 | DENY，不通过GUC/请求头修改身份；新请求映射撤销后拒绝 | NOT RUN |
| F-06 | 学生本人、有效VERIFIED EDUCATION/GENERAL监护；非监护/未来/自然过期/撤销/自报证据 | 只有保守子集；列表不泄露无权对象；不扩张GENERAL到身份敏感数据 | NOT RUN |
| F-07 | 专用LOGIN的直接SELECT/全部DML/sequence/审计伪造/helper执行/管理函数/SET ROLE reader/app/binder/替换函数/temp遮蔽 | 全部拒绝；普通BEGIN仅允许controlled API内审计，不允许业务写入 | NOT RUN |
| F-08 | binder只签票、read只兑换；错人/伪造/过期/重复票据；A/B/A并发pool=1，clear/reset/discard | 单次票据；清理或断连失败503且连接丢弃，不残留权限 | NOT RUN |
| F-09 | family/single/list的ALLOW与DENY，包括空列表和100/101行边界 | access_events固定READ、正确principal/actor/family/nonce；列表只记录实际授权返回项，超限失败 | NOT RUN |
| F-10 | 调用者ROLLBACK、异常、日志有而表无的对账；审计写失败、COMMIT失败、DTO校验失败 | 不提前发送HTTP；正常拒绝先commit审计；失败不返回业务正文；LOG/DB差异可识别而非伪称不可回滚DB行 | NOT RUN |
| F-11 | BEGIN READ ONLY调用新函数 | 预期不能完成审计；用作负例。普通短事务+无表权限role调用可成功 | NOT RUN |
| F-12 | 真实浏览器→BFF→合成broker→binder→专用pool→受控API，变更库内合成字段、A/B/A、撤权下一请求 | v2字段与库相符，no-store，无cookie/token/DB配置泄露，无旧Store回退 | NOT RUN |
| F-13 | 专用备份账号、摘要篡改拒绝、全新集群恢复；角色、对象、权限及账本按实际基线断言；恢复后重跑全部新验收 | 新role/functions及旧RLS齐全，分离LOGIN及浏览器重放通过；不写死35/92/83作为升级后的数量 | NOT RUN |
| F-14 | 0017 request_nonce及D-9解析兼容、既有投影/目录/应用回归、原始日志不进入公开CI产物 | 现有行为不倒退；只发布脱敏合成摘要 | NOT RUN |

实现时新增独立永久验证脚本，例如verification下按最终编号分组的read-audit验收，不修改历史SQL；将最新账本/策略/表数量、恢复断言和Manifest同步更新。原始命令、输出、镜像摘要、精确SHA、失败及修复后重跑都保存到私有证据域，报告逐项PASS/HOLD，不能靠设计文件证明建库。

本轮已经实际完成的核验仅为：远端main/PR状态、既有决策原字节摘要、35项Migration摘要与源码接口事实。见[evidence/baseline-verification.json](evidence/baseline-verification.json)。本轮未启动新数据库、执行SQL、跑新的PG16/17或浏览器验收。
