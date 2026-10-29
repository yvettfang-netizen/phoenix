import assert from "node:assert/strict";
import test from "node:test";
import { createV5Worker } from "./worker-fixture.mjs";

const origin = "http://localhost";
const request = (worker, path) => worker.dispatchFetch(`${origin}${path}`, {
  headers: { accept: "text/html" },
  redirect: "manual",
});

async function page(worker, path) {
  const response = await request(worker, path);
  return { response, html: await response.text() };
}

test("Health landing is reachable in both locales with independent metadata and OG tags", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  const zh = await page(worker, "/zh/health");
  const en = await page(worker, "/en/health");
  assert.equal(zh.response.status, 200);
  assert.equal(en.response.status, 200);
  assert.match(zh.html, /data-health-landing/);
  assert.match(en.html, /data-health-landing/);

  assert.match(zh.html, /全球健康与国际医疗协调服务/);
  assert.match(en.html, /Global Health Services/);
  assert.match(zh.html, /property="og:title"/);
  assert.match(en.html, /property="og:title"/);
  assert.match(zh.html, /property="og:description"/);
  assert.match(en.html, /property="og:description"/);
  assert.match(zh.html, /property="og:image"[^>]+health-lounge\.jpg/);
  assert.match(en.html, /property="og:image"[^>]+health-lounge\.jpg/);
  assert.match(zh.html, /name="twitter:card"[^>]+summary_large_image/);
  assert.match(en.html, /name="twitter:card"[^>]+summary_large_image/);
  assert.match(zh.html, /zh_CN/);
  assert.match(en.html, /en_GB/);
});

test("Health landing contains the five services, four regions and shared brand chrome", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());
  const { response, html } = await page(worker, "/zh/health");
  assert.equal(response.status, 200);

  for (const label of [
    "就医前评估协调",
    "专业医疗翻译",
    "国际患者导航",
    "在地就医礼宾",
    "国际保险理赔协助",
    "香港",
    "中国内地",
    "英国",
    "其他国际地区",
  ]) assert.ok(html.includes(label), label);

  assert.match(html, /<header class="site-header[^"]*"/);
  assert.match(html, /\/brand\/phoenix-nova-mark-official\.png/);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /href="\/zh\/health"[^>]*>健康与国际医疗服务/);
  assert.match(html, /专业连接，安心同行/);
  assert.match(html, /当前为前端候选预览，正式咨询渠道尚未接通/);
});

test("Health Compass remains controlled: off hides assessment and direct route, on enables both", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });

  for (const locale of ["zh", "en"]) {
    const landingOff = await page(off, `/${locale}/health`);
    assert.doesNotMatch(landingOff.html, new RegExp(`href="/${locale}/compass/health"`));
    assert.match(landingOff.html, /health-landing-closed/);
    assert.equal((await request(off, `/${locale}/compass/health`)).status, 404);

    const landingOn = await page(on, `/${locale}/health`);
    assert.match(landingOn.html, new RegExp(`href="/${locale}/compass/health"`));
    assert.match(landingOn.html, /health-landing-assessment/);
    const compass = await page(on, `/${locale}/compass/health`);
    assert.equal(compass.response.status, 200);
    assert.match(compass.html, /data-health-compass/);
  }

  assert.equal((await request(off, "/compass/health")).status, 404);
  const alias = await request(on, "/compass/health");
  assert.ok([301, 302, 307, 308].includes(alias.status));
  assert.equal(new URL(alias.headers.get("location"), origin).pathname, "/zh/compass/health");
});

test("Health routes do not occupy the backend /health probe and reject invalid locales", async t => {
  const worker = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(() => worker.dispose());
  assert.equal((await request(worker, "/health")).status, 404);
  assert.equal((await request(worker, "/fr/health")).status, 404);
  assert.equal((await request(worker, "/fr/compass/health")).status, 404);
});

test("Compass keeps Education, Identity, Wealth and Health as equal entries with Health service link", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });

  const zhOff = await page(off, "/zh/compass");
  for (const id of ["education", "identity", "wealth", "health"]) assert.match(zhOff.html, new RegExp(`id="${id}"`));
  assert.match(zhOff.html, /href="\/zh\/health"/);
  assert.doesNotMatch(zhOff.html, /href="\/zh\/compass\/health"/);

  const enOn = await page(on, "/en/compass");
  for (const id of ["education", "identity", "wealth", "health"]) assert.match(enOn.html, new RegExp(`id="${id}"`));
  assert.match(enOn.html, /href="\/en\/health"/);
  assert.match(enOn.html, /href="\/en\/compass\/health"/);
});
