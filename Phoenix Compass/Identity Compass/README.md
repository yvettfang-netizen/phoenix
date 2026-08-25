# Phoenix Compass™ Free MVP

一个移动端优先、无需登录的免费 30 秒成长探索体验：Landing → 5 屏 7 题 → Growth Snapshot → 结果反馈。

同一仓库现已包含 Phoenix Identity Compass™ Sprint 1：Identity Landing → Free 6题 → 标准化档案 → Mock Feishu Adapter → Free Identity Snapshot。

## ACTIVE BASELINE

原 Growth Compass 的有效产品闭环保持为：**测评 → Growth Snapshot → 1–5 分反馈**。

Identity Compass 的 Sprint 1 闭环独立为：**Free 6题 → Family Intent Classification → Free Identity Snapshot → 完整分析接续入口**。Identity 模块不包含付费墙、支付、政策资格判断、获批概率或法律意见。

Free MVP 不包含商业化产品、价格、付费 CTA、支付或购买跳转，也不包含用户数据库、会员系统、Family OS 或未来模块的运行时实现。任何超出这一闭环的能力均不属于当前基线。

## 本地运行

需要 Node.js 24 与 pnpm 11。

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

打开 `http://localhost:3000`。

## 环境变量

- `OPENAI_API_KEY`：服务端 OpenAI API 密钥；留空时自动使用安全规则回退。
- `OPENAI_MODEL`：默认 `gpt-5.6-luna`，可在部署环境覆盖。
- `OPENAI_BASE_URL`：默认 `https://api.openai.com/v1`。

## 路由

- `/`：Landing Page
- `/assessment`：5 屏 7 题
- `/result`：Growth Snapshot 与 1–5 分反馈
- `/api/growth-snapshot`：结构校验、AI 生成、一次重试与安全回退
- `/identity`：Identity Compass 免费入口
- `/identity/assessment`：每屏 1 题的 Free 6题
- `/identity/result`：Free Identity Snapshot
- `/identity/full-analysis`：下一 Sprint 接续边界，不运行政策引擎

## 质量检查

```bash
pnpm check
pnpm build
```

实现说明与数据结构见 `docs/IMPLEMENTATION.md`，完整验收清单见 `docs/TESTING_CHECKLIST.md`。

Identity Sprint 1 的仓库审计、数据契约、Adapter、Persona fixtures、验证结果与 Implementation Gaps 见 `docs/IDENTITY_SPRINT_1_AUDIT.md`。
