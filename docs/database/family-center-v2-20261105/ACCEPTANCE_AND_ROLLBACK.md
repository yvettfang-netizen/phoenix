# 开关、验收与回滚

| 开关/能力 | 默认 | 本候选范围 |
|---|---|---|
| FAMILY_CENTER_V2_ENABLED | false | cloudflare env严格true才替换原family-center页面 |
| FAMILY_CENTER_V2_DEMO_ENABLED | false | 仅development且原customer auth未启用；有真实账户绝不注入合成家庭 |
| FAMILY_CENTER_PERSONALIZATION_ENABLED | false | 六种合成场景及内存pin；真实偏好持久化未实现 |
| FAMILY_CENTER_HARMONY_ENABLED | false | 仅demo确定性只读建议；真实Phoenix Meta未接入，按钮关闭 |
| CANONICAL_FAMILY_PROJECTION_ENABLED + CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED + CANONICAL_BROKER_SESSION_BRIDGE_ENABLED | false | 沿用PR55的development+loopback BFF；全部true才请求，无旧JWT回退 |
| 用户偏好写入 / Health专项受控入口 | 恒关闭 | 未实现写入/敏感医疗接口；不能通过开关启用尚不存在的能力 |

账户安全与退出复用原CustomerAccount。真实D1登录会话未桥接Canonical，V2在该模式显示安全不可用/空状态，保留账户控件，不尝试读Canonical。development合成验收用独立HttpOnly opaque session走既有BFF。

## 状态与交互

V2具备loading、empty、no-permission、unavailable、stale、error、ready展示组件。实际网络错误映射unavailable，401/403映射no-permission；未知或额外字段拒绝。等待或失败期间不显示旧DTO。失焦或60秒到期清空摘要并要求重验。模式/语言变化重建组件状态；演示family/subject变化重置pin/详情，不持久化。

五项导航用原生button、aria-current；家庭/主体用label+select；服务pin用aria-pressed；详情复用现有Dialog焦点管理/Escape。四种屏宽检查实际水平溢出和可点击模块。图片装饰区域aria-hidden，官方Logo有alt；无motion依赖。

## 场景验收边界

A–F为明确标注的合成客户场景；G多家庭为界面演示，未实现真实多家庭grant；H不让管理员查看其他成年人资料，当前真实投影不返回成年人私密内容；I已有PG测试核验学生本人/有效监护；J普通页面无医疗资料接口，患者撤销后的专项医疗访问在本轮NOT RUN。不能把“没有医疗字段”写成患者级Consent测试PASS。

真实账号登录→Canonical服务→私人报告→默认偏好持久化完整闭环保持HOLD。合成浏览器可完成选择场景/家庭/成员→服务→报告摘要对话框→首页，pin刷新重置有明确提示；真实PG链只验证family/students摘要与原安全回归。

## 回滚

1. 页面：关闭FAMILY_CENTER_V2_ENABLED恢复原页面；旧组件/账户验证均保留。回滚来源5414c18…。
2. API：关闭三个既有Canonical开关，BFF返回404安全关闭；无数据库直连回退。
3. 数据库：本轮没有SQL变更或持久化数据写入，无schema回退；原0001–0037字节保留。
4. Agent/配置：关闭HARMONY和个性化开关；本轮只读demo内存状态随刷新清空。未来正式持久化需另审数据回滚，不声称本文件替代正式生产runbook。

不合并、不部署、不连接腾讯或生产、不读取生产密钥、不导入真实客户/学生/患者数据。Founder's visual sign-off / independent security review / actual provider enablement remains HOLD.
