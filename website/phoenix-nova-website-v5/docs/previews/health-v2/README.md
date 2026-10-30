# Health V2｜Founder 视觉验收

日期：2026-10-30。基于既有 Health 页面继续修订，不重建问卷或业务流程。

| 截图 | 用途 |
| --- | --- |
| [中文 PC](health-zh-1440-viewport.png) | 1440×1000 首屏，实际可编辑前端组件 |
| [英文 PC](health-en-1440-viewport.png) | 同一布局的英文页面 |
| [中文手机](health-zh-390-viewport.png) | 390×1000 首屏，单列、大尺寸主入口 |
| [英文手机](health-en-390-viewport.png) | 英文换行、横版 Logo 和移动导航 |
| [修改前 V1](before-v1-zh-desktop.png) | 旧版完整页面，仅作历史对照，含已停用的旧 Logo |

完整页面截图、中英文 768px 平板截图及家庭规划页截图在本机 `outputs/health-v2/landing-off`、`landing-on`、`family-off`、`family-on`。PR 的 Health validation 工作流还会上传同一 head 的浏览器产物，保留 14 天。

本机主预览：`http://127.0.0.1:4390/zh/health`；英文为 `/en/health`；家庭规划为对应 `/health/family`。4390 的问卷开关关闭，4391 仅供本机受控开关开启测试。端口并非生产部署。

截图来自 Windows Edge 与本机 Node 前端适配器。该适配器不接真实 D1、患者数据或生产后台，不能证明 Workers/认证/数据库兼容性；真实 Worker 结果须以最终 head 的 Ubuntu CI 为准。实体手机与 Founder 视觉验收另行进行。

Founder 已通过三种 Logo 排布，限定浅色底；Header 横版、Footer 完整版白底及首页图腾象牙白底遵循此决议。小尺寸 favicon 未启用。山水香港家庭 Hero、核心优势、五项服务、人生阶段与底部咨询均为独立 HTML/CSS 组件；图片不包含页面文字、按钮或 Logo。

Health Compass 的题目、规则、隐私与默认关闭开关不变。咨询仍是明确的前端准备演示，不提交申请、不传送问卷答案。未合并 main、部署生产或修改数据库。
