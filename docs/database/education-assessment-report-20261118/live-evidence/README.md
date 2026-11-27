# Education 0041 真实联调证据采集包

本目录只接收脱敏、可复验的事实引用。它不是密钥存放处，也不把合成测试当成真实联调。

## 当前状态

- 模板结构：PASS
- I-1／I-2／H-1／P-1 真实事实：HOLD
- 0041 正式晋升：HOLD
- 腾讯及生产部署：NOT RUN

## Jimson 需要回填的最小字段

复制 `LIVE_EVIDENCE_INTAKE_TEMPLATE.json` 到仓库外的受控工作区，仅在取得事实后回填：

1. `target.runtimeCommitSha`：实际运行的 40 位提交 SHA。
2. `target.serviceBindingRef`：环境、服务、运行 SHA 和监听范围的脱敏 HTTPS 收据。
3. 每个门禁的观察时间、审核人、报告 SHA-256，以及模板中列出的全部 HTTPS 证据引用。
4. `promotionDecision`：Founder 对最终 Migration 编号和指定非生产目标的批准引用。

不得回填密码、token、私钥、pgpass、完整 `.env`、真实 OpenID、手机号、邮箱、客户／学生／监护人 ID 或设备标识。映射证据必须使用不可逆摘要、集合数量和正反例结论。

## 本地校验

校验空模板和门禁程序：

```text
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --template
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --self-test
```

对仓库外的实际脱敏证据包执行晋升校验：

```text
node database/canonical/verification/education-assessment-report/live-evidence-gate.mjs --promotion <受控证据包绝对路径>
```

只有输出 `PROMOTION_FACTS=PASS` 才说明事实字段齐全；这仍不等于 Migration 已获审查、合并或部署批准。任何缺项、占位符、测试包、错误摘要、非 HTTPS 引用或敏感材料都会拒绝。
