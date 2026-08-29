# Phoenix Family OS™ Mini Program MVP V0.1

一个可直接导入微信开发者工具的原生微信小程序 MVP，用来验证第一条家庭关系闭环：

> Education Compass → Family Profile → AI Growth Insight → Family Timeline → Advisor Follow-up

## 已实现

- 家庭用户：微信登录握手、本地演示身份、家庭档案、孩子档案
- Education Compass：5 步、10 题的成长问卷
- AI Growth Insight：可解释的本地规则引擎，输出阶段、优势、挑战、方向和下一步
- Family Timeline：自动记录档案、测评、报告、顾问联系与重要备注
- Phoenix Advisor：家庭列表、家庭详情、报告查看、联系申请、内部备注与跟进状态
- MVP 指标事件：家庭激活、孩子档案、Compass 完成、顾问申请和 7/30 日返回标记
- 刘海屏 / 灵动岛 / Android 状态栏与微信右上角胶囊动态适配
- 正式 Phoenix Nova 横版 Logo，并为深色、浅色和小尺寸场景提供独立品牌资源
- 模块化数据层：所有当前模块都回到 Family Profile、Timeline、AI Insight 和 Relationship History
- Partner Experience Layer：主页二级入口、凤城少年启航™ 合作详情、4 问音乐探索起点、联合体验申请与 Family Timeline 回写
- 未来模型占位：Partner、Permission 仅有空模型，没有 Partner Portal 或管理功能

## 明确未实现

- 商城、支付、服务市场
- 保险、医疗记录、CRM 销售漏斗
- Partner Portal / Partner Management
- Culture、Health、Identity、Wealth 业务功能
- Partner Portal / 课程商城 / 支付 / 排课 / 导师后台
- 生产级 OpenID 换取、云数据库与真实大模型调用

## 本地运行

1. 安装并打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本文件夹 `phoenix-family-os-mvp`。
4. 首次体验可使用测试号 / 游客模式；`project.config.json` 目前使用 `touristappid`。
5. 点击“开始家庭成长规划”，完成完整家庭端流程。
6. 退出后在欢迎页底部点击“Phoenix Advisor 内部入口”，查看顾问端。

正式开发时，把 `project.config.json` 的 `appid` 替换为已认证小程序 AppID。

## 验证

本项目无第三方运行依赖。安装 Node.js 后执行：

```bash
pnpm typecheck
pnpm test
pnpm build
```

测试覆盖数据闭环、AI 洞察生成、时间线、顾问备注、页面文件完整性与 JS / JSON 语法。

## 关键目录

```text
pages/          家庭端与顾问端页面
data/           Partner Experience 可复用内容配置
services/       数据仓库、登录、AI Provider、洞察引擎
models/         数据表结构与预留枚举
components/     品牌组件
assets/brand/   Phoenix Nova 深浅 Logo 与图标资源
tests/          领域闭环与工程结构测试
docs/           架构、验收与上线说明
utils/navigation.js  自定义导航栏与胶囊安全区计算
```

## 生产化接口

- `services/auth.js`：已调用 `wx.login` 完成客户端握手；生产环境需在可信服务端换取 OpenID。
- `services/ai-provider.js`：稳定的 AI Provider 边界；生产环境可改为调用受保护的云函数。
- `services/repository.js`：页面只依赖仓库接口；后续可将本地存储实现替换为云数据库，不改业务页面。
- `utils/navigation.js`：首页与欢迎页读取微信真实状态栏和胶囊尺寸；不要再用固定 `padding-top` 代替。

当前版本故意保留本地可运行能力，以验证家庭是否愿意完成档案、测评、查看报告、持续返回并申请人工联系。
