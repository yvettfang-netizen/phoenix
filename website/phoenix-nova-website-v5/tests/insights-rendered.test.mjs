import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createV5Worker } from "./worker-fixture.mjs";
const worker = createV5Worker();
after(() => worker.dispose());
async function get(path) { return worker.dispatchFetch(`http://localhost${path}`, { headers: { accept: "text/html" }, redirect: "manual" }); }
test("Insights routes render bilingual pages with noindex and correct language", async () => {
  for (const locale of ["zh", "en"]) {
    for (const path of ["/insights", "/insights/education", "/insights/identity", "/insights/wealth", "/insights/health", "/insights/perspectives", "/insights/topics/hong-kong-education", "/insights/articles/hong-kong-undergraduate-application-routes"]) {
      const response = await get(`/${locale}${path}`);
      assert.equal(response.status, 200, `/${locale}${path}`);
      const html = await response.text();
      assert.match(html, /noindex/i);
      assert.match(html, /Editorial preview|编辑预览/);
      assert.match(html, new RegExp(`lang="${locale === "zh" ? "zh-Hans" : "en"}"`));
    }
  }
});
test("search and pagination operate in rendered routes", async () => {
  const q = await (await get("/zh/insights?q=JUPAS")).text();
  assert.match(q, /搜索结果/);
  assert.match(q, /香港本科申请/);
  const page2 = await (await get("/zh/insights/education?page=2")).text();
  assert.match(page2, /升学信息怎么核验/);
  assert.doesNotMatch(page2, /<h3>香港本科申请/);
  const tag = await (await get("/en/insights/education?tag=A-Level")).text();
  assert.match(tag, /Applying to HKU with international qualifications/);
});
test("nonexistent content is not presented as real", async () => {
  assert.equal((await get("/zh/insights/articles/unknown-article")).status, 404);
  assert.equal((await get("/en/insights/unknown-channel")).status, 404);
  const sitemap = await (await get("/sitemap-insights.xml")).text();
  assert.doesNotMatch(sitemap, /<url>/);
  const rss = await (await get("/en/insights/feed.xml")).text();
  assert.doesNotMatch(rss, /<item>/);
});
