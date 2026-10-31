# Phoenix Nova™ Identity V3.0｜Founder Review

任务：PHOENIX-IDENTITY-PAGE-V3-20261031。日期：2026-10-31（Asia/Shanghai）。分支：`codex/identity-page-v3`。本阶段仅 Draft PR / 本机前端预览，不合并或部署。

## 页面结果

新增真实双语路由 `/zh/identity`、`/en/identity`。以 Founder 确认的国际城市与家庭视觉稿为基准，保留“阳光下未雨绸缪，风雨中闲庭信步。”和英文品牌表达；不是把整张效果图当网页背景。

| 模块 | 实现 |
|---|---|
| Hero | 香港城市与家庭独立场景，真实文字、两个锚点 CTA，中英文及手机文字/图片分区 |
| 四大身份服务 | 香港、全球居留、家庭子女、长期跨境；四张独立图片、双语标题及可展开说明 |
| 四项价值 | 提前准备、更多选择、下一代、长期生活安排；明确专业边界 |
| 五阶段流程 | 深入沟通、方案定制、专业执行、落地协助、长期陪伴；原生可展开阶段说明 |
| 全球机遇 | 国际城市/世界连接示意；香港、英国、加拿大、澳大利亚、新加坡只是规划方向 |
| Identity Compass | 主站未开放，展示受控状态；不新建问卷、不虚构结果、不跳往未接入的独立应用 |
| 咨询准备 | 五个 Identity 专属方向，本地准备清单、清空、刷新重置；没有联系方式、敏感文件或提交接口 |
| 共享品牌 | 复用 BrandMark、SiteHeader、SiteFooter、Button、Card、字体；V3 变体及五区 Footer 可复用 |

## Gate 1｜代码基线与工程保护

执行前重新从 GitHub 核验并同步 main：`b88db04f2a55e0f5ce2c7aa84a99c4303a25dd93`。PR #29 已合并；PR #30 仍 Open / Draft，不做处置。新工作区：`D:/CODEX/PhoenixNova/_Worktrees/identity-page-v3`。根工作区的 Education / ASKWISE 未提交成果保留，Health worktree 未覆盖。

上一轮首页/教育 V3 是独立视觉提案，尚未合入 main。当前 main 的共享 Footer 仍是三栏。因此本 PR 在既有 `SiteHeader` / `SiteFooter` 上增加可复用 `appearance="v3"`；仅 Identity 启用。其他页面继续使用原默认布局和现有路由，不借本任务重做首页、Education、Health 或全站 Footer。

Identity 页主导航高亮身份，语言切换保持 `/identity`。V3 导航的 Identity 指向新独立页面；默认旧导航仍保留已有 Compass 锚点，供后续全站 V3 整合时统一切换。旧 `/{locale}/compass#identity` 保持兼容。

## 官方 Logo

共享 Header / Footer 均使用 `/brand/official/v3/phoenix-nova-header@2x.png`，1040×320，RGBA。

- SHA-256：`C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA`。
- 字节、配色与比例不变，无白框、滤镜、阴影或裁切。
- Header 桌面 220px / 手机 175px；Footer 桌面 220px / 手机 165px。
- 仅在浅色背景使用；没有新建深色版或启用小尺寸 Favicon。

## Design Tokens 与共享边界

沿用 `--serif`、`--sans`、`--surface-ivory`、`--brand-ink` 等既有品牌变量。Identity 的候选颜色只在 CSS module 页根内定义：远洋靛蓝 #416F91、深海蓝 #094768、雾蓝 #EAF0F5、月白 #F7F8F5、香槟金 #C49A50。没有重定义全站 `:root`，没有朱砂红背景或全金按钮。

五区 Footer 通过共享目录 `lib/site-directory.ts` 管理。Academy、ASKWISE、启明堂、约课、学员/导师及 NOVA DIGITAL 没有核准公开 URL，显示“待开放”，不创建伪链接。家庭中心保持现有受控路由；不公开运营、教师管理或 Founder Dashboard。公司法定名称原样保留。

## 业务与隐私

- 不改身份问卷、Health 14题、规则、版本、授权、开关或现有 API。
- 不创建客户、成员、家庭、申请、预约或 Service Project。
- 不改 Canonical ID、PostgreSQL、认证、CRM、Family OS；不创建 Migration。
- 咨询控件没有 `<form>`、具名提交字段、文件上传、网络调用或持久化；按钮是 `type="button"`。无 JS 时无法提交。
- 不自动读取或附带评估答案。界面始终明确“尚未发送咨询”。
- 不承诺资格、获批、永居或时间；法律、税务、投资及资产配置由适当资质专业人士独立核实。
- 国际城市图片均为品牌示意，不是办公室、客户案例、合作伙伴或已核验项目证明。

## 本机验证

| 检查 | 结果 |
|---|---|
| 锁文件安装 | `npm ci --offline --ignore-scripts` 成功，672 packages，未改 lockfile |
| TypeScript | `npm run typecheck` 通过 |
| Lint | 全站 0 errors；既有 customer-center.tsx 未使用 Bell 的 1 条 warning，未修改无关文件 |
| Build | `vinext build` 通过，列出 `/:locale/identity`；现有工具对根重定向的分类提示保留 |
| Identity 浏览器 | 22/22 通过：中英 × 1440/1024/768/390/320px、四卡、五阶段、语言、导航、Footer、无 JS、零提交/存储、刷新清空 |
| 既有 Health 浏览器 | Landing 42/42，Family 13/13（开关关闭，本机前端模式） |
| 纯模型回归 | Auth 9/9、Family 4/4、Health model 8/8，共 21 项通过 |
| 本机 Workers 回归 | 25 项被环境故障阻断；最小空白 Miniflare 同样 workerd 0xc0000005，未进入页面断言 |
| Ubuntu CI | 新增 Identity 工作流；原 Health 工作流保留并运行全套测试。实际结果以 PR head 的 checks 为准 |

本机使用仓库已有 `scripts/health-node-preview.mjs`：空 Cloudflare env、无 D1、拒绝 API/非 GET。它可证明构建后的前端行为，不能替代真实 Workers、认证或数据库验证。没有削弱既有测试来获取通过。

## 预览与截图

```text
# 在 website/phoenix-nova-website-v5 下，以当前构建启动
# PowerShell
$env:HEALTH_TEST_PORT = '4400'
node scripts/health-node-preview.mjs
```

中文：`http://127.0.0.1:4400/zh/identity`；英文：`http://127.0.0.1:4400/en/identity`。

截图目录：`docs/previews/identity-v3/`。完整本机证据在忽略目录 `outputs/identity-v3/`，CI 证据由 artifact 保存 14 天。

## 已知限制与验收

1. Identity Compass 尚未接入官网；公开渠道和业务交接属于后续独立批准范围。
2. 咨询为准备演示，没有预约服务端。
3. 原始高分辨率 PNG 保持为静态资产，未依赖图片转换后端。正式上线前可另行评估响应式压缩，避免在本任务中扩展基础设施。
4. 新的共享 V3 展示变体尚未推广至首页与其他领域；本 PR 不将其当作全站已升级。
5. 本机 workerd 环境故障保留；合并前需查看 Ubuntu CI 及玄武技术审查。

Founder 验收中英文视觉、服务表达及咨询准备体验后，再另行决定合并和发布。回退为撤销本 PR 的前端变更，不涉及数据库。
