# 身份事实证据包执行报告

2026-11-04。Jimson本人授权及回写，Codex执行。**事实整理PASS / 真实身份接入HOLD。**

## 本轮实测与证据

| 项 | 结果 | 实际范围/证据 |
|---|---|---|
| 已有事实与决策来源 | PASS | 读取既有私有Git快照950c9a4…的11份限定来源；两项批准文档SHA-256与既有值一致。私有[SOURCE_EVIDENCE_INDEX.json](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/9c1867755b24f71c902f0020af213d43f27acb83/canonical-db/integration/identity-facts-20261104/SOURCE_EVIDENCE_INDEX.json)保留完整SHA、路径及原始版本 |
| 历史origin与保护引用 | PASS（历史事实）/ HOLD（当前有效性） | 发现2026-10-28正式参数、配置引用及旧部署SHA；已预填。没有读取所指密钥/pgpass文件，没有把过去的0600/运行状态当作今日状态 |
| 历史配置离线校验 | PASS_LEGACY_PROFILE_ONLY | 现有validate-auth-contract.ps1针对历史元数据JSON执行integration结构校验；无网络、无保护文件读取；它要求旧app角色，不能证明当前0037只读角色已正确配置 |
| DNS | PASS（解析观察）/ HOLD（归属与可信性） | 仅DNS查询；答案匹配受限历史目标。无目标主机HTTP/TLS/JWKS/SSH请求，不能据DNS推断控制权、TLS、端点或可信环境 |
| 精确工程候选 | PASS | PR48仍Draft/OPEN，HEAD38be3197c39490f149a1adbfc328e223354fca43，20/20 CI SUCCESS；main9355d286…未变 |
| ID翻译与读取审计I-7 | PASS（既有工程证据） | 引用[固定SHA技术复审](https://github.com/yvettfang-netizen/phoenix/blob/38be3197c39490f149a1adbfc328e223354fca43/docs/database/canonical-0037/PR48_FORMAL_REVIEW.md)的PG16/17合成、分离LOGIN及恢复结果；本轮重跑现有verify-source.mjs通过，没有重新跑PG集群 |
| 当前broker运行接线 | HOLD | 正式broker契约不发family ID，现有preview要求合成signed application_family_id；当前源码缺正式broker verifier及可信会话/route-family bridge，不允许仅替换issuer或伪造claim来启用 |
| 包与公开候选检查 | PASS | JSON/引用/授权false约束、现有源校验、git diff --check；固定摘要Gitleaks。首次单个API-key误报为已核实的批准文档SHA，保留脱敏发现及精确单行例外；没有修改批准原件或扩大排除范围。见私有PACKAGE_VALIDATION.json和SCAN_TRIAGE.md |
| 当前TLS/JWKS、保护配置ACL、实际运行版本 | NOT RUN / HOLD | 不连接腾讯或生产；需要F1/F2/F3当前受控证明 |
| 真实身份/关系/用途及撤销运维 | HOLD | F4/F5仍无事实证据；不收集、不导入真实记录 |

命令与原始输出在私有[READONLY_COMMANDS_AND_RESULTS.json](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/9c1867755b24f71c902f0020af213d43f27acb83/canonical-db/integration/identity-facts-20261104/READONLY_COMMANDS_AND_RESULTS.json)；包附PREPARE_REFERENCE_PACKET.mjs供在已批准的证据环境复验，仅参考，不是运行时配置；首次扫描误报与最终扫描完整记录留存。包manifest未签名，只能检验记录的字节完整性，不是身份、批准或可信性证明。

## 更正陈旧清单

1. 旧I-7的NOT RUN被PR48的0037实现及授权技术复审取代。
2. 旧runbook“尚无family mapping管理API”被0024/0025及既有FM批准取代。
3. 实际issuer/JWKS/保护引用已有历史登记；待补的是当前有效性，不再要求Founder重选broker或重填负责人。
4. 历史app/binder角色与当前最小权限投影角色不等价；旧validator结构PASS不代表当前配权PASS。
5. FD7已有空库/合成阶段批准政策，包括不少于180天审计留存；不据此推定真实业务处理、实际日志目的地和运维均已就绪。

## 交付和边界

公开分支`codex/identity-evidence-packet-20261104`，堆叠在PR48候选，避免改动已复审HEAD。私有包固定提交`9c1867755b24f71c902f0020af213d43f27acb83`。公开提交SHA以GitHub PR和Notion同步收据记录（本文件不伪造自引用SHA）。

本轮无SQL/应用修改、无Migration执行、无新建/重建数据库、无merge、无部署/腾讯连接、无生产密钥或真实资料读取/导入、无冒签独立Approve。Notion以Jimson本人授权及回写、Codex执行记录本轮完成项和HOLD。唯一下一步为责任人在私有表单补F1–F5证据引用，缺失项继续HOLD。
