# 家庭中心新增摘要API审查稿（未实现，DEPENDENCY_HOLD）

现有family-summary.v2 / student-summary.v2原DTO及BFF路由不改。下面只定义后续最小审查对象，不开放路由或放大现有role权限。

## 服务、报告、日期最小摘要

```text
family-center-summary.v1 (candidate)
  services[]: { serviceRef, subjectRef, businessDomain, title, status,
                nextActionLabel?, sourceRef, updatedAt }
  reports[]: { reportRef, subjectRef, title, publicationStatus,
               sourceRef, updatedAt }
  dates[]: { eventRef, serviceRef, subjectRef, title, verifiedAt?,
             occursAt?, dateVerificationStatus, sourceRef, updatedAt }
```

所有ref来自既有注册public ID或正式批准的专用locator，不能以UUID/姓名拼接。sourceRef不暴露内部路径或存储key。updatedAt必须来自权威事件，不用请求时刻冒充数据更新时间。数组分页/上限待核对实际字段与查询计划，未定前不发布此API。报告只返回已发布且可访问locator；下载仍走docs受控短时授权，不能用报告列表传原始内容。缺映射、越权、审计失败或DTO异常均无数据返回，不静默补档。

## 服务端权限矩阵

| 能力 | 当前用户/家庭/主体 | 附加权限 | 写入/审计 |
|---|---|---|---|
| family / students现有摘要 | 可信session→内部broker→0023绑定→独立binder/app→0037受控函数 | 有效成员及学生本人/既有有效监护scope，复用现有实现 | 受控READ审计COMMIT后返回 |
| 服务摘要候选 | 当前主体参与且family一致 | 有效project subject authorization/party/assignment及适用Consent；不把项目授权当患者Consent | 默认关闭，须受控READ函数；不得给projection reader直接SELECT |
| 已发布报告locator | 当前主体或有效代理 | publication发布状态、对应Consent/Guardian、文档分类 | 固定locator版本，审计后返回；下载另验 |
| 已核验日期 | 当前已授权项目/主体 | 日期来源及适用purpose须明确；撤权后不能继续显示 | 受控READ；未核验只显示待核验，无倒计时 |
| 授权摘要 | 本人可管理范围 | 成年家人关系不形成敏感访问权；管理员同样不豁免 | 本轮写入关闭，后续另审撤销API |
| 偏好写入 | 仅本人principal和已授权scope | 选择project不能改变业务权限 | 另审Forward方案、version并发控制和受控写入审计 |
| HARMONY context | 经网关认证的Agent及当前请求用途 | 独立capability+对象级授权；病历/银行/他人成年隐私不进入普通上下文 | 本轮无工具执行或真实LLM请求，真实能力关闭 |

## 仍需确定的事项

- D1用户名账户与Canonical外部身份的受控绑定/撤销流程；不自动联表，不按姓名或手机号匹配。
- 服务状态可对客户显示的精确子集、客户可见title/nextAction来源、report locator及日期核验字段。
- 正式多家庭/单学生切换契约和purpose；当前0023唯一家庭解析不能自动当成多家庭授权列表。
- 偏好权威、跨设备保留和注销删除；通知收件授权；Phoenix Meta Agent能力签署。
- Health专项患者Consent、文档分类/保留和财务收款权威；CRM预计金额不进入付款状态。

由Founder/实际责任人审查这些具体合同后才能实现新投影。这里没有将业务草案标记APPROVED/EFFECTIVE。
