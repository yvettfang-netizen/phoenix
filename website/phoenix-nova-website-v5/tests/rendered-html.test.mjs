import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createV5Worker } from "./worker-fixture.mjs";
const worker = createV5Worker();
after(() => worker.dispose());

async function get(path) {
  return worker.dispatchFetch(`http://localhost${path}`, {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
}

test("redirects the root to the Chinese master route", async () => {
  const response = await get("/");
  assert.ok([301, 302, 307, 308].includes(response.status));
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/zh");
});

test("renders the bilingual V5 portal home with noindex", async () => {
  const zh = await get("/zh");
  const en = await get("/en");

  assert.equal(zh.status, 200);
  assert.equal(en.status, 200);

  const zhHtml = await zh.text();
  const enHtml = await en.text();
  assert.match(zhHtml, /一个入口/);
  assert.match(zhHtml, /凤启世界/);
  assert.match(enHtml, /One gateway/);
  assert.match(enHtml, /Phoenix Nova world/);
  assert.match(zhHtml, /name="robots" content="noindex, nofollow, nocache"/i);
  assert.match(enHtml, /name="robots" content="noindex, nofollow, nocache"/i);
});

test("connects Digital Phoenix to the approved immortal-guardian world", async () => {
  const response = await get("/zh");
  const html = await response.text();
  assert.match(html, /数字凤启/);
  assert.match(html, /进入仙兽图/);
  assert.match(html, /\/images\/fengqi-digital-immortals\.png/);
  assert.match(html, /https:\/\/fengqi-research-institute\.yvettfang\.chatgpt\.site/);
});

test("renders every bilingual candidate destination", async () => {
  const pages = ["compass", "lighthouse", "services", "insights", "oriental", "about", "family-center", "admissions", "application"];
  for (const locale of ["zh", "en"]) {
    for (const page of pages) {
      const response = await get(`/${locale}/${page}`);
      assert.equal(response.status, 200, `/${locale}/${page}`);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    }
  }
});

test("keeps the three admissions goals together and exposes no real intake endpoint", async () => {
  const info = await (await get("/zh/admissions")).text();
  const intake = await (await get("/zh/application")).text();
  for (const label of ["本科申请", "硕士申请", "博士申请"]) assert.ok(info.includes(label));
  assert.match(info, /\/zh\/application/);
  assert.match(intake, /准备申请什么学位/);
  assert.match(intake, /目前就读/);
  assert.match(intake, /虚构资料/);
  assert.doesNotMatch(intake, /<input[^>]+type="file"/i);
  assert.match(intake, /name="robots" content="noindex, nofollow, nocache"/i);
});

test("Family Center foregrounds document milestones and keeps the prototype honest", async () => {
  const html = await (await get("/zh/family-center")).text();
  for (const label of ["证件与节点", "学业与报告", "我的服务", "我的资料", "获准逗留期限", "回乡证"]) assert.ok(html.includes(label), label);
  assert.match(html, /未接通真实账户/);
  assert.match(html, /换领节点待核验/);
  assert.match(html, /\/zh\/application/);
  assert.match(html, /name="robots" content="noindex, nofollow, nocache"/i);
});

test("Compass presents the four approved directions without claiming live handoff", async () => {
  const html = await (await get("/zh/compass")).text();
  for (const id of ["education", "identity", "wealth", "health"]) assert.ok(html.includes(`id="${id}"`));
  assert.doesNotMatch(html, /Child Compass|Family Compass/);
  assert.match(html, /正式测评入口待接通/);
  assert.match(html, /测评结果尚未同步/);
});

test("keeps the serial novel inside Insights", async () => {
  const insights = await get("/zh/insights");
  const home = await get("/zh");
  assert.match(await insights.text(), /《维港之上》/);
  assert.match(await home.text(), /凤启洞察/);
});
