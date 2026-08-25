require("dotenv").config();

const {
  FEISHU_APP_ID,
  FEISHU_APP_SECRET,
  FEISHU_BITABLE_APP_TOKEN,
  FEISHU_TABLE_ID,
} = process.env;

function requireEnv(name, value) {
  if (!value) throw new Error(`缺少环境变量：${name}`);
}

async function getTenantAccessToken() {
  requireEnv("FEISHU_APP_ID", FEISHU_APP_ID);
  requireEnv("FEISHU_APP_SECRET", FEISHU_APP_SECRET);
  requireEnv("FEISHU_BITABLE_APP_TOKEN", FEISHU_BITABLE_APP_TOKEN);
  requireEnv("FEISHU_TABLE_ID", FEISHU_TABLE_ID);

  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    }
  );

  const data = await res.json();
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`获取 tenant_access_token 失败：${JSON.stringify(data, null, 2)}`);
  }
  return data.tenant_access_token;
}

async function readFirstFiveRecords(token) {
  const url =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/` +
    `${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=5`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`读取多维表格失败：${JSON.stringify(data, null, 2)}`);
  }
  return data;
}

async function main() {
  try {
    console.log("1. 正在获取飞书 tenant_access_token...");
    const token = await getTenantAccessToken();
    console.log("✅ Token 获取成功");

    console.log("2. 正在读取朱雀项目库前 5 条记录...");
    const result = await readFirstFiveRecords(token);
    const items = result?.data?.items || [];
    console.log(`✅ 读取成功，共返回 ${items.length} 条记录\n`);

    items.forEach((item, index) => {
      console.log(`--- 记录 ${index + 1} ---`);
      console.log("record_id:", item.record_id);
      console.log("fields:");
      console.dir(item.fields, { depth: null });
      console.log();
    });
  } catch (err) {
    console.error("❌ 测试失败");
    console.error(err.message);
    process.exit(1);
  }
}

main();
