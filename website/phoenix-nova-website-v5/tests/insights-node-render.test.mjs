import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
register("../scripts/frontend-preview-loader.mjs", import.meta.url);
const { default: worker } = await import("../dist/server/index.js");
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
async function get(path) { return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx); }

const previewOrigin = "https://insights-preview.example.test";
const originalOrigin = process.env.PHOENIX_INSIGHTS_ORIGIN;
test.before(() => { process.env.PHOENIX_INSIGHTS_ORIGIN = `${previewOrigin}/`; });
test.after(() => {
  if (originalOrigin === undefined) delete process.env.PHOENIX_INSIGHTS_ORIGIN;
  else process.env.PHOENIX_INSIGHTS_ORIGIN = originalOrigin;
});

function footerHasLocaleLink(html, href) {
  const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer?.includes(`href="${href}"`), `Missing footer language link to ${href}`);
}

test("node-only preview renders Insights routes in both languages", async () => {
  for (const locale of ["zh", "en"]) {
    for (const path of ["/insights", "/insights/education", "/insights/identity", "/insights/wealth", "/insights/health", "/insights/perspectives", "/insights/topics/hong-kong-education", "/insights/articles/hong-kong-undergraduate-application-routes"]) {
      const response = await get(`/${locale}${path}`);
      assert.equal(response.status, 200, `/${locale}${path}`);
      const html = await response.text();
      assert.match(html, /noindex/i);
      assert.match(html, /Editorial preview|编辑预览/);
      assert.match(html, new RegExp(`<html\\b[^>]*\\blang="${locale === "zh" ? "zh-Hans" : "en"}"`));
      assert.ok(html.includes(`rel="canonical" href="${previewOrigin}/${locale}${path}"`));
      assert.ok(html.includes(`property="og:url" content="${previewOrigin}/${locale}${path}"`));
      footerHasLocaleLink(html, `/${locale === "zh" ? "en" : "zh"}${path}`);
    }
  }
});
test("search and pagination render genuine filtered content", async () => {
  const q = await (await get("/zh/insights?q=JUPAS")).text();
  assert.match(q, /搜索结果/);
  assert.match(q, /香港本科申请/);
  footerHasLocaleLink(q, "/en/insights?q=JUPAS");
  const page2 = await (await get("/zh/insights/education?page=2")).text();
  assert.match(page2, /升学信息怎么核验/);
  footerHasLocaleLink(page2, "/en/insights/education?page=2");
  const tag = await (await get("/en/insights/education?tag=A-Level")).text();
  assert.match(tag, /Applying to HKU with international qualifications/);
  footerHasLocaleLink(tag, "/zh/insights/education?tag=A-Level");
});
test("both preview feeds link to the localized home without listing articles", async () => {
  const sitemap = await (await get("/sitemap-insights.xml")).text();
  assert.doesNotMatch(sitemap, /<url>/);
  for (const locale of ["zh", "en"]) {
    const response = await get(`/${locale}/insights/feed.xml`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^application\/rss\+xml/);
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    const rss = await response.text();
    assert.ok(rss.includes(`<link>${previewOrigin}/${locale}/insights</link>`));
    assert.doesNotMatch(rss, /<item\b/);
  }
});

test("the absent origin and invalid origins use the same V5 fallback", async t => {
  t.after(() => { process.env.PHOENIX_INSIGHTS_ORIGIN = previewOrigin; });
  const canonical = async () => {
    const html = await (await get("/en/insights")).text();
    return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  };
  delete process.env.PHOENIX_INSIGHTS_ORIGIN;
  const fallback = await canonical();
  assert.ok(fallback?.endsWith("/en/insights"));
  assert.notEqual(fallback, `${previewOrigin}/en/insights`);

  for (const value of [
    "not-a-url",
    "http://insights-preview.example.test",
    "https://insights-preview.example.test/insights",
    "https://user@insights-preview.example.test",
    "https://insights-preview.example.test/?preview=1",
  ]) {
    process.env.PHOENIX_INSIGHTS_ORIGIN = value;
    assert.equal(await canonical(), fallback);
  }
  const feed = await (await get("/en/insights/feed.xml")).text();
  assert.ok(feed.includes(`<link>${fallback}</link>`));
});
