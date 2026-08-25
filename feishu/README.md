# 凤启 AI 数据连接器｜飞书连通测试

目标：验证「朱雀品牌项目工作台」多维表格 API 是否可读取。

## Windows 路径
`D:\CODEX\PhoenixNova\feishu`

## 使用方法
1. 将本压缩包内容解压到上述目录。
2. 将 `.env.example` 复制为 `.env`。
3. 在 `.env` 中，只填写你**重置后的新** `FEISHU_APP_SECRET`。
4. 不要把 `.env` 上传到 GitHub，也不要把 Secret 发到聊天里。
5. 打开 PowerShell / Terminal：

```powershell
cd D:\CODEX\PhoenixNova\feishu
npm install
npm run test:feishu
```

成功时会看到：

```text
✅ Token 获取成功
✅ 读取成功，共返回 N 条记录
```

如果提示没有权限，检查：
- 自建应用已发布
- 已开通多维表格应用身份权限
- 应用已被授予目标多维表格访问权限
