# Phoenix Compass™ Free MVP

一个移动端优先、无需登录的免费 30 秒成长探索体验：Landing → 5 屏 7 题 → Growth Snapshot → 结果反馈。

## ACTIVE BASELINE

当前唯一有效产品闭环为：**测评 → Growth Snapshot → 1–5 分反馈**。

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

## 质量检查

```bash
pnpm check
pnpm build
```

实现说明与数据结构见 `docs/IMPLEMENTATION.md`，完整验收清单见 `docs/TESTING_CHECKLIST.md`。
