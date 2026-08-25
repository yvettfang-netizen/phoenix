require("dotenv").config();

const {
  FEISHU_APP_ID,
  FEISHU_APP_SECRET,
  FEISHU_BITABLE_APP_TOKEN,
  FEISHU_TABLE_ID,
} = process.env;

const ALLOWED_STATUS = [
  "新提交",
  "待评估",
  "待补资料",
  "方案准备",
  "项目进行中",
  "已完成",
  "暂不承接",
];

function requireEnv(name, value) {
  if (!value) throw new Error(`缺少环境变量：${name}`);
}

function nowChina() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function getTenantAccessToken() {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    }
  );

  const data = await res.json();

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(
      `获取 tenant_access_token 失败：${JSON.stringify(data, null, 2)}`
    );
  }

  return data.tenant_access_token;
}

async function findRecordByProjectId(token, projectId) {
  let pageToken = "";

  while (true) {
    let url =
      `https://open.feishu.cn/open-apis/bitable/v1/apps/` +
      `${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records` +
      `?page_size=100`;

    if (pageToken) {
      url += `&page_token=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    const data = await res.json();

    if (data.code !== 0) {
      throw new Error(`读取项目库失败：${JSON.stringify(data, null, 2)}`);
    }

    const items = data?.data?.items || [];

    const match = items.find(
      (item) => item?.fields?.["Project ID"] === projectId
    );

    if (match) return match;

    if (!data?.data?.has_more) break;

    pageToken = data?.data?.page_token;
    if (!pageToken) break;
  }

  return null;
}

async function updateRecord(token, recordId, fields) {
  const url =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/` +
    `${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records/${recordId}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ fields }),
  });

  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(`写回失败：${JSON.stringify(data, null, 2)}`);
  }

  return data;
}

async function main() {
  try {
    requireEnv("FEISHU_APP_ID", FEISHU_APP_ID);
    requireEnv("FEISHU_APP_SECRET", FEISHU_APP_SECRET);
    requireEnv("FEISHU_BITABLE_APP_TOKEN", FEISHU_BITABLE_APP_TOKEN);
    requireEnv("FEISHU_TABLE_ID", FEISHU_TABLE_ID);

    const [, , projectId, newStatus, ...noteParts] = process.argv;
    const note = noteParts.join(" ").trim();

    if (!projectId || !newStatus || !note) {
      console.log(`
使用方法：

node writeback-test.js <Project ID> <新状态> "<备注>"

例如：

node writeback-test.js ZQ-2608-0001 待评估 "连接器写回测试成功"
`);
      process.exit(1);
    }

    if (!ALLOWED_STATUS.includes(newStatus)) {
      throw new Error(
        `状态不合法。允许状态：${ALLOWED_STATUS.join("、")}`
      );
    }

    console.log("1. 正在获取飞书 Token...");
    const token = await getTenantAccessToken();
    console.log("✅ Token 获取成功");

    console.log(`2. 正在查找项目：${projectId}`);
    const record = await findRecordByProjectId(token, projectId);

    if (!record) {
      throw new Error(`没有找到 Project ID：${projectId}`);
    }

    console.log("✅ 找到项目");
    console.log("record_id:", record.record_id);
    console.log("项目名称:", record.fields["品牌 / 项目名称"]);
    console.log("原状态:", record.fields["当前状态"]);

    const oldNote = record.fields["内部备注"] || "";

    const newNoteLine =
      `AI连接器｜${nowChina()}｜${note}`;

    const mergedNote = oldNote
      ? `${oldNote}\n${newNoteLine}`
      : newNoteLine;

    console.log("\n即将写入：");
    console.log("新状态:", newStatus);
    console.log("追加备注:", newNoteLine);

    await updateRecord(token, record.record_id, {
      "当前状态": newStatus,
      "内部备注": mergedNote,
    });

    console.log("\n✅ 写回成功");
    console.log("Project ID:", projectId);
    console.log("当前状态:", newStatus);
    console.log("内部备注已追加，旧备注未覆盖。");

  } catch (err) {
    console.error("\n❌ 写回测试失败");
    console.error(err.message);
    process.exit(1);
  }
}

main();
