# 故障注入执行报告

本轮已完成可执行的本地合成演练，不使用PR57旧结果证明新增探针通过。独立分支codex/family-center-drills-20261105；基线PR57为fb2f49cdc55ba57ec43e5c08ab561ee7bbe0f683。main仍为0001–0035，本候选只在一次性集群验证0036/0037组合；没有部署。

复验：从仓库根目录，先在未占用的loopback环境运行浏览器演练，再依次运行两个PG版本（共用.dev.vars和端口，不并行）。PLAYWRIGHT_MODULE指向隔离安装的Playwright，FAMILY_DRILL_EVIDENCE_DIR指向本轮专有输出目录，DOCKER_CONTEXT固定desktop-linux（先确认是本地named pipe）。不得提供现有数据库URL或现存凭据。

```text
node database/canonical/verification/v0037/browser-failure-drills.mjs
node database/canonical/verification/v0037/projection-e2e.mjs 16 --family-center-v2 --failure-drills
node database/canonical/verification/v0037/projection-e2e.mjs 17 --family-center-v2 --failure-drills
```

每个探针保存实际阶段时间、响应码、恢复区间、关联ID、指纹、受限范围及review_status。只读HTTP探针不把数据库RPO套用于页面。已有数据只用一次性集群；SQL故障只改自有fixture中的临时函数/trigger，finally还原，源Migration不变。

服务端FAMILY_CENTER_MAINTENANCE_ENABLED默认false，true优先返回无个人资料的双语维护页。它是本地已定义的修复性恢复目标；不是自动批准的Staging版本。原页面关闭V2的行为保留，不因此给旧版安全认证。

执行结果、命令/退出码、CI和截图在最终私有同步收据记录。矩阵中的完整场景HOLD不因局部探针通过自动转PASS。

## 本地实际执行（2026-11-05 UTC）

| 命令 | 源码SHA | 退出码 / 原始输出 |
|---|---|---|
| browser-failure-drills.mjs（上方完整命令） | 3c6aeb7898e16020a477d115a87883569d014296 | 0；browser.txt及browser/browser-pgN_A.json，五张截图 |
| projection-e2e.mjs 16 --family-center-v2 --failure-drills | f600b9c12582dc8e635c61b751d51d7ddfd76b82 | 0；pg16.txt及pg16/*.json |
| projection-e2e.mjs 17 --family-center-v2 --failure-drills | 25d92c9a60161237769a84789c8e2aba289a3622 | 0；pg17.txt及pg17/*.json |
| C:/Program Files/Git/bin/bash.exe scripts/build-verified.sh（website V5目录） | 25d92c9a60161237769a84789c8e2aba289a3622 | 0；build.txt |
| node database/canonical/verification/v0037/verify-source.mjs | 本次候选工作树 | 0；37项字节不变且全部SQL LF |

上述输出位于仓库忽略目录out/family-center-drills-20261105；私有归档收据提供固定GitHub路径和摘要。日期、响应、关联ID、指纹、实际区间记录于JSON。旧执行SHA不覆盖后续变更：最终提交CI重新执行更严格的逐场景指纹、导航目标检查和精确flag/注入时刻记录；CI检出PR准确head SHA，合成JSON/截图作为专有artifact保存。最终CI Run、准确SHA及20项结论由私有FINAL_VERIFICATION.json和Draft PR检查页共同固定，不在代码提交中自引用。

首次浏览器执行因N/A包含路径分隔符退出1；第二次因测试时钟注册顺序退出1。原失败日志browser-attempt1.txt、browser-attempt2.txt/JSON原样保留；修复测试工具后重跑退出0。两次不是越权成功，不通过修改安全阈值消除。此前本机依赖与锁文件有差异，完整网站测试以干净安装的本次CI为准；不将本地定向测试当作全网站通过。

ca1114adf0d5a4c9046f36162f62f063ac1a80a8的更严格导航验收实际失败：维护页原/contact目标404（browser-final.txt及final/browser失败JSON保留）。修复为现有education#consultation入口；保持原200断言不变，重新执行新SHA，不沿用失败提交的通过状态。该问题为维护导航缺陷，没有观察到权限泄露。

随后f5cbf14398bb5d36a822a8a5cecaaddfa6d4e98e已通过维护页及目标导航，但R13重启后的旧浏览器页与热重载并发导航冲突而退出1（browser-fixed.txt及verified/browser保留）。复验改为关闭旧页、在同一合成认证context中新开页；不降低直接URL404、重新读取200等断言。所有失败记录与最终通过记录按目录/SHA分开保存。

实际结果：R02跨家庭404且DB DENY关联请求ID；R04三种非法JWT401、伪造家庭头403、三种票据误用拒绝；R06不兼容DTO503；R07数据库暂停503、恢复200且上下文/票据0；R12审计INSERT失败503、恢复200且仅新增1条真实审计。PG16/17分别在fresh/restored重跑；37账本、93表、83策略。R01/R03浏览器采用实际页面/BFF及明示的loopback上游double，不能声称真实provider/Agent或Staging已联通。

独立Draft PR基于PR57分支，不重复创建数据库，不改SQL、不合并、不部署、不连接腾讯。代码和可公开合成测试经固定镜像Gitleaks扫描；脱敏原始日志及截图留私有证据分支。单次测试FAIL必须保留；任何真实越权或完整性异常触发停止和安全审核，不自动解除S3。
