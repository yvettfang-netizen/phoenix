# Askwise 原生微信小程序客户端

状态：`CODE EXISTS`。这是一个最小无 bundler 的原生 JS/WXML/WXSS 客户端，附带 `.d.ts` API 声明、真实 mock wx 行为测试和不依赖微信开发者工具的离线 source/config smoke 脚本。

构建状态：`BUILD BLOCKED`。当前明确使用 `touristappid`，没有真实 AppID、微信开发者工具和已配置的业务域名，因此这里不声称已完成微信构建或真机验证，也不创建假二维码。

## 选择与边界

Taro + React + TypeScript 适合已有 bundler、跨端组件复用和完整 TS 编译链的项目，但会增加依赖、构建配置、运行时包体和小程序端适配面。当前工程没有 bundler，故选择原生 JS/WXML/WXSS；共享 API 形状放在 `types/api.d.ts`，源码用 reference declaration 提示类型，但不引入编译器或学习逻辑。

局限：没有 React 组件抽象、TS 编译期校验或跨端复用；页面通过原生路由和少量共享 JS 工具保持简单，真实微信构建仍需开发者工具、真实 AppID、HTTPS 业务域名和后端联调。

## 配置与认证

`config.js` 中 `API_BASE_URL` 默认为空字符串。未配置时请求会明确拒绝；配置时必须填写 HTTPS origin，客户端自动拼接 `/api/pilot/v1`。不包含密钥，也不会把 token 或 userdata 写入日志。

微信登录调用 `wx.login` 后只把 code 发送到 `POST /wechat-login`；本地 UAT 备用入口是单独的 `POST /login` `{account,password}`，不会冒充微信登录。服务端返回的 Bearer token 仅存入微信 storage；401 会清除 token 并回到登录页。userdata 不做持久缓存。

## API 合约

所有请求都使用 `/api/pilot/v1` 前缀；认证接口以外的请求带 `Authorization: Bearer <token>`。

```text
POST /wechat-login {code}
POST /login {account,password}       # 匿名本地 UAT 备用
GET  /today                          -> {tasks,day}
POST /tasks                          {subject,topic,question,answer:{conditions,method,work,conclusion},request_id} -> {taskId,sessionId}
GET  /tasks/:id                      -> {task,session,attempts,diagnosis,latestHint,latestEvidence,photos}
POST /tasks/:id/attempts             {answer,request_id}
GET  /evidence                       -> array
GET  /dashboard                      -> stats
GET  /reflection                     -> array
POST /reflection                     {q1,q2,q3,request_id}
POST /tasks/:id/uploads              multipart: wx.uploadFile name=photo, png/jpeg/webp
POST /logout
```

Evidence renders the API's actual evidence fields without a fabricated URL. Task photos are projected from `photos`; reopening a task downloads `/uploads/:id` with authentication and previews the returned local file.

创建任务只接受 `Mathematics` / `Politics`，topic 只接受现有的两个场景。`GET /tasks/:id` 的 `diagnosis`、`latestHint`、`session.solved` 和 `attempts` 先投影为 UI 类型；提交尝试的 `{sessionId,diagnosis,mode,correct}` 不被客户端自行解释，成功后必须重新 GET 任务状态、Hint 和 Evidence。诊断展示只按服务端返回的规则/结构化字段渲染；客户端不宣称 LLM 语义判断。

证据下载只允许 API 相对 `/uploads/`，或精确同源同 `/api/pilot/v1` 前缀的 HTTPS URL，禁止把 Bearer 带给任意外源。待提交记录包含 session-scoped key；退出、401 和新登录都会清理 `askwise.pending.*`，清理失败时客户端先在内存中废弃旧 token，不继续发送。

## 重试与状态

创建任务、提交尝试、提交复盘和照片上传会先持久化 `request_id` 与待提交 payload。网络失败只保留记录并显示人工 `Retry`；手动重试复用同一个 key，不自动无限重发。页面状态为 `busy`、`error`、`solved` 时分别驱动界面与伴生角色姿态；`error` 安全回退到已批准的 `idle.png`。

## 离线 smoke

该脚本只检查路由、配置拒绝、关键 API 源码约束、认证/上传/下载入口和批准资产存在性，不冒充微信编译器或真机测试：

```text
node tests/smoke.cjs
node tests/behavior.cjs
```

主包只包含 `assets/aoyu/poses/idle.png`；其余 6 张批准 PNG 保留在源码目录但由 `project.config.json` 忽略，运行时从已配置 API 同源 `/assets/aoyu/poses/` 加载，配置/网络错误安全回退 idle，不重绘角色。
