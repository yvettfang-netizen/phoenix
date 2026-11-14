import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
register("../scripts/frontend-preview-loader.mjs", import.meta.url);
const { default: worker } = await import("../dist/server/index.js");
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
async function get(path) { return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx); }
test("node-only preview renders Insights routes in both languages", async () => {
  for (const locale of ["zh", "en"]) {
    for (const path of ["/insights", "/insights/education", "/insights/identity", "/insights/wealth", "/insights/health", "/insights/perspectives", "/insights/topics/hong-kong-education", "/insights/articles/hong-kong-undergraduate-application-routes"]) {
      const response = await get(`/${locale}${path}`);
      assert.equal(response.status, 200, `/${locale}${path}`);
      const html = await response.text();
      assert.match(html, /noindex/i);
      assert.match(html, /Editorial preview|编辑预览/);
    }
  }
});
test("search and pagination render genuine filtered content", async () => {
  const q = await (await get("/zh/insights?q=JUPAS")).text();
  assert.match(q, /搜索结果/);
  assert.match(q, /香港本科申请/);
  const page2 = await (await get("/zh/insights/education?page=2")).text();
  assert.match(page2, /升学信息怎么核验/);
  const tag = await (await get("/en/insights/education?tag=A-Level")).text();
  assert.match(tag, /Applying to HKU with international qualifications/);
});
test("preview content is not included in sitemap or RSS", async () => {
  const sitemap = await (await get("/sitemap-insights.xml")).text();
  const rss = await (await get("/en/insights/feed.xml")).text();
  assert.doesNotMatch(sitemap, /<url>/);
  assert.doesNotMatch(rss, /<item>/);
});
