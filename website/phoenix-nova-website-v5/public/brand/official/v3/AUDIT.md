# 官方 Logo V3：审计与验收记录

任务：XUANWU-BRAND-LOGO-V3-20261030。日期：2026-10-30。状态：待 Founder 验收。

## 工程现场

GitHub main 再次核验为 `2e00b2c83bf54d5699fa3326d159448fda8afc0c`。本分支 `brand/phoenix-nova-logo-v3` 从该提交建立独立 Worktree，仅新增资产、隔离预览与验证脚本。

主站品牌目录为 `website/phoenix-nova-website-v5/public/brand/`。旧图腾由 `components/brand-mark.tsx` 引用，favicon 由 `app/layout.tsx` 引用，首页图腾及品牌说明由 `components/v5-site.tsx` 引用。现有三个 V1 PNG 均与本次母版不同；旧文件名中的 official 不代表本次认可。本 PR 保留旧文件及现有引用，等待验收后另行统一。

原工作目录的未提交成果保留。Health 的独立 Worktree、18 项未提交文件及恢复快照保留；其分支 `feature/phoenix-health-landing-v1` 的 HEAD 为 `ada733ec344067e56453503e444382464f6e53b8`，Draft PR #29 仍保持原状。Health V2 尚未完成最终视觉验收，本品牌 PR 不包含其页面、问卷、开关或业务代码。PR #6、#12、#13 仍独立存在，未合并、关闭或改基线。

## 已完成与证据

| 项目 | 已证实结果 | 证据 |
| --- | --- | --- |
| 母版身份 | 原图原样保留；1254×1254 RGB，无原始透明层 | `manifest.json`、`phoenix-nova-primary-original.png` |
| A 完整版 | 原始、无损矩形裁边、透明候选；完整保留全部文字与图腾 | `review/logo-three-versions.png` |
| B 横版 | 完整图腾与原字标重排；520×160、1040×320；未重打字体 | `review/header-desktop.png`、`review/header-mobile.png` |
| C 图腾 | 完整凤凰、地球、星芒；原生尺寸与五种图标尺寸、ICO 候选 | `review/icons-actual-size.png` |
| 来源与完整性 | 58 项断言通过；资产哈希、尺寸、原生 RGB 对应与透明边界核验 | `asset-verification.json` |
| 预览兼容性 | 1440、768、390、320px 无横向溢出；图片可解码、链接可用，无脚本错误及外部请求 | `review-validation.json` |
| 隔离范围 | 仅新增资产及脚本，无网站源码和依赖变更 | PR 文件清单 |

## 主代理视觉复核与限制

已实际查看三种版本、白色/棋盘/深色底、PC 与手机 Header、48/32/16px 实际尺寸截图。浅底 Header 可读，图腾、地球与星芒未截断，未重绘或替换字体。

透明 PNG 的原生 RGB 保持来源像素，alpha 为确定性遮罩。白底合成源无法精确恢复原始抗锯齿透明边缘；深色底可见浅色边缘，原蓝色字标对比度也低。透明资产只提交浅底视觉审核，**尚不能认定为适用于任意底色的最终透明母版**。若要求严格无白边，应取得原始分层或矢量源；本次不以 AI 或重绘补造。

48px 可识别整体轮廓，细线已变弱；32px 地球与星芒细节明显受限；16px 仅剩微小轮廓，**不建议作为正式 favicon**。已按要求保留完整结构的候选文件以供检视，未自动接入。改造小图标结构需要另行授权，本次未做。

没有可靠矢量源，未交付 SVG。深色、单色、反白与印刷版均未制作。

此次没有应用源码、依赖或业务逻辑修改，因此未重复安装或执行整站构建；验证范围是资产完整性与隔离预览。Health 构建及问卷回归不能由本报告替代。

## 等待验收与后续

请 Founder 验收完整版本、横版排布和完整图腾；确认透明边缘限制是否接受，并确定小尺寸图标后续处理。通过后再另行执行全站统一引用和第二批资产制作。本 PR 不合并 main、不部署生产、不触及数据库与独立子品牌。

原图 SHA-256：`A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E`。所有资产 SHA、尺寸、透明状态和来源见 `manifest.json`；截图清单及 SHA 见 `review-validation.json`。
