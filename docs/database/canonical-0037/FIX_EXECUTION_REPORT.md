# 0037 ID翻译与数据库READ审计 — 实际交付

2026-11-04｜Jimson本人授权及回写，Codex执行。**LOCAL SYNTHETIC ENGINEERING PASS；INDEPENDENT REVIEW / REAL IDENTITY / RELEASE HOLD。**

依据PR47方案，已实现独立0037 Forward Migration：复用既有public ID与来源规则，通过专用角色的三个受控函数返回Family/Student v2最小投影，内部写受保护READ审计。backend/BFF均有独立、默认关闭的审计模式；保持旧v1合成预览及其原验收，不改0001–0035、不引入PR41的0036、不创建另一套主数据。

详见[源码/权限/配置/事务契约](IMPLEMENTATION_CONTRACT.md)和[逐项PG16/17实际验收](TEST_REPORT.md)。SQL SHA-256为 `29c153177b4177cc279fe2494e2be563bd6250f6564c57fc62e381df1c7decb2`；当前集合36个文件/账本，最新编号0037；92表/83策略，零新增业务表。

验收已经覆盖fresh及0035升级、repeat/drift/atomic、分离LOGIN、票据反例、public-ID异常、RLS等价收窄、权限闭包/临时表遮蔽、next-request撤权、真实浏览器和全新集群恢复。实际注入审计INSERT/COMMIT/DTO故障验证无业务正文，恢复后的集群也重复验证。测试自有容器/卷/fixture全部清理，历史保留目录和旧数据库未操作。

## 与既有测试的逐条衔接

| 文件 | 变动与原因 |
|---|---|
| 原catalog-e2e.mjs、family-projection-e2e.mjs | 只拷贝精确0001–0035文件，继续测试历史35基线；原断言不放宽、不把0037伪称已测 |
| canonical-0035-premerge.yml | 35项仍与固定来源逐名/逐摘要核验、smoke/migrate字节仍与固定来源一致；唯一额外文件必须匹配0037 Manifest，否则拒绝；明确构建35基线子集给原smoke，独立新工作流测试0037 |
| 新v0037 harness | 新36文件集合、显式保留编号缺口、完整受控投影/审计/恢复；额外private helper只复用逻辑，无额外运行时入口 |
| backend canonical-family-projection.ts | 旧v1分支保留，新开关下采用专用role、短普通事务、受控函数、严格v2 DTO、拒绝决定先commit；检查目标role全部父角色，阻断间接server-file能力 |
| HTTP/BFF及网站测试 | 增加stu_路由及显式v2 schema/前缀；旧模式仍仅接受v1；增加拒绝UUID/旧v1 fallback的永久测试，原两项测试保持通过 |

候选仅发布本轮SQL、Manifest、verification、工作流、上述明确列出的应用源文件/测试及本目录文档。原始测试日志、机器命令记录保留私有证据域；配置文件、pgpass、私钥、dump/globals、实际服务器坐标与真实资料不发布。CI不上传这些产物。

## 仍保持HOLD及唯一下一步

PR47事实表I-7的机制已实现并有本地PG16/17证据，**独立审查未代签**。其余真实HTTPS origin/iss/JWKS、实际签名/app/binder配置与轮换、真实身份/家庭关系核定、部署版本/lifecycle、日志运维及正式启用批准仍HOLD；已定ID、FM、broker技术方向及责任人不重开。

本轮不合并、不部署、不连接腾讯/生产，不把0037执行到既有运行库，不导入或登记真实身份/客户资料。准确提交、私有证据提交与最终CI链接在本候选GitHub及本轮Notion交付记录中登记，不自行填写Founder或独立审核签名。

**唯一下一工程门禁：针对本候选准确SHA完成正式代码、权限及审计复审。** 通过后再按另行批准的批次解决真实身份事实；本轮合成PASS不授予发布或真实接入许可。
