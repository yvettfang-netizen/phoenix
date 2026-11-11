import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs")
  ? createRequire(import.meta.url)(modulePath)
  : await import(modulePath ? pathToFileURL(modulePath).href : "playwright");

const origin = process.env.IDENTITY_V31_ORIGIN || process.env.IDENTITY_ORIGIN || "http://127.0.0.1:44631";
const publicOrigin = process.env.IDENTITY_V31_PUBLIC_ORIGIN || "http://127.0.0.1:44632";
const evidenceDir = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v31");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}),
});
const results = [];
const passed = (name) => { results.push({ name, status: "PASS" }); console.log(`PASS ${name}`); };
const failed = (name, error) => results.push({ name, status: "FAIL", error: String(error) });
const slugs = ["saint-kitts-and-nevis", "argentina", "vanuatu", "sao-tome-and-principe"];
const widths = [1440, 1024, 768, 390, 320];

async function load(page, path) {
  const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${path} should render`);
  await page.locator("[data-cbi-page]").waitFor();
  return response;
}

async function selectCompare(page, count) {
  await load(page, "/zh/identity/explorer");
  const cards = page.locator("[data-cbi-country]");
  assert.equal(await cards.count(), 4);
  for (let index = 0; index < count; index += 1) await cards.nth(index).getByRole("checkbox").check();
  await page.getByRole("link", { name: /打开比较|Open comparison/ }).click();
  await page.waitForURL(/\/identity\/explorer\/compare/);
  assert.equal(await page.locator("[data-cbi-comparison]").count(), 1);
  assert.equal(await page.locator("[data-cbi-comparison-table] thead th").count(), count + 1, `${count}-way comparison`);
}

try {
  await mkdir(evidenceDir, { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const locale of ["zh", "en"]) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      await load(page, `/${locale}/identity/explorer`);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("[data-cbi-country]").count(), 4);
      assert.equal(await page.locator("[data-cbi-filter]").count(), 10);
      assert.equal(await page.locator("#cbi-query").count(), 1);
      assert.equal(await page.locator("#cbi-sort option").count(), 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow ${locale} ${width}`);
      const body = await page.locator("body").textContent();
      assert.match(body ?? "", locale === "zh" ? /内部审核预览/ : /Internal review preview/);
      assert.doesNotMatch(body ?? "", locale === "zh" ? /Internal review preview/ : /内部审核预览/);
      if (width === 1440 || width === 390) await page.screenshot({ path: resolve(evidenceDir, `cbi-explorer-${locale}-${width}.png`), fullPage: true });
      passed(`CBI ${locale} ${width}px: route, four records, responsive layout and language boundary`);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, "/zh/identity/explorer");
  for (const field of ["country", "operational", "legal", "investment", "minimum", "currency", "family", "residence", "dual", "passport"]) {
    const id = `cbi-filter-${field}`;
    await page.locator("[data-cbi-clear]").click();
    const select = page.locator(`#${id}`);
    assert.ok(await select.locator('option[value="__unknown__"]').count(), `${id} must include unknown`);
    await select.selectOption("__unknown__");
    const expectedUnknown = { country: 0, operational: 3, legal: 4, investment: 3, minimum: 4, currency: 4, family: 4, residence: 4, dual: 4, passport: 4 };
    assert.equal(await page.locator("[data-cbi-country]").count(), expectedUnknown[field], `${id} must return exactly the unknown records`);
  }
  await page.locator("[data-cbi-clear]").click();
  await page.locator("#cbi-filter-country").selectOption({ label: "阿根廷" });
  await page.locator("#cbi-filter-operational").selectOption({ label: "待上线" });
  await page.locator("#cbi-filter-minimum").selectOption("__unknown__");
  assert.equal(await page.locator("[data-cbi-country]").count(), 1, "country, operational and unknown amount must combine");
  await page.locator("#cbi-filter-operational").selectOption("__unknown__");
  assert.equal(await page.locator("[data-cbi-country]").count(), 0, "conflicting combined filters must produce no results");
  await page.locator("[data-cbi-clear]").click();
  await page.locator("#cbi-query").fill("Saint");
  assert.equal(await page.locator("[data-cbi-country]").count(), 1);
  await page.locator("#cbi-sort").selectOption("amount");
  await page.locator("#cbi-sort").selectOption("updated");
  await page.locator("[data-cbi-clear]").click();
  assert.equal(await page.locator("#cbi-query").inputValue(), "");
  assert.equal(await page.locator("[data-cbi-country]").count(), 4);
  for (const [query, expected] of [["阿根廷", 1], ["Argentina", 1], ["Sao Tome", 1]]) {
    await page.locator("#cbi-query").fill(query);
    assert.equal(await page.locator("[data-cbi-country]").count(), expected, `${query} must match one country`);
    await page.locator("[data-cbi-clear]").click();
  }
  assert.equal(await page.locator("[data-cbi-country]").count(), 4);
  passed("CBI filters: bilingual/accent search, all ten filters, both sort modes and clear");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectCompare(page, 2); await page.screenshot({ path: resolve(evidenceDir, "cbi-compare-2.png"), fullPage: true }); passed("CBI comparison: two records side by side");
  await selectCompare(page, 3); await page.screenshot({ path: resolve(evidenceDir, "cbi-compare-3.png"), fullPage: true }); passed("CBI comparison: three records side by side");
  await selectCompare(page, 4); await page.screenshot({ path: resolve(evidenceDir, "cbi-compare-4.png"), fullPage: true }); passed("CBI comparison: four records side by side");
  await load(page, "/zh/identity/explorer/compare?countries=" + slugs.join(",") + ",extra");
  assert.equal(await page.locator("[data-cbi-comparison-table]").count(), 0, "more than four comparison inputs must be rejected");
  passed("CBI comparison: duplicate/over-four input is not silently truncated");
  await load(page, "/zh/identity/explorer/compare?countries=" + slugs[0] + "," + slugs[0] + "," + slugs[1]);
  assert.equal(await page.locator("[data-cbi-comparison-table] thead th").count(), 3, "duplicate comparison inputs must be deduplicated");

  for (const locale of ["zh", "en"]) {
    for (const slug of slugs) {
      await load(page, `/${locale}/identity/countries/${slug}`);
      assert.equal(await page.locator("[data-cbi-detail]").count(), 1);
      assert.equal(await page.locator("h1").count(), 1, `${locale}/${slug} unique H1`);
      assert.equal(await page.locator("[data-cbi-faq] details").count(), 10, `${locale}/${slug} ten FAQ`);
      assert.equal(await page.locator("[data-cbi-faq-trace]").count(), 10, `${locale}/${slug} FAQ trace boundary`);
      assert.equal(await page.locator("[data-cbi-flag]").count(), 1, `${locale}/${slug} ISO flag marker`);
      const text = await page.locator("body").textContent();
      assert.match(text ?? "", locale === "zh" ? /来源与核实状态/ : /Sources & verification/);
      assert.match(text ?? "", locale === "zh" ? /内部审核预览/ : /Internal review preview/);
      assert.doesNotMatch(text ?? "", /成功率|approval probability|success rate/i);
      const switchHref = await page.locator("[data-cbi-locale-switch]").getAttribute("href");
      assert.equal(switchHref, `/${locale === "zh" ? "en" : "zh"}/identity/countries/${slug}`);
      if (slug !== "sao-tome-and-principe") assert.ok(await page.locator("[data-cbi-source-link]").count(), `${slug} official source link`);
      await page.screenshot({ path: resolve(evidenceDir, `cbi-detail-${locale}-${slug}.png`), fullPage: true });
      passed(`CBI ${locale}/${slug}: SSR detail, source section, ten FAQ and same-country locale switch`);
    }
  }
  await context.close();

  const publicContext = await browser.newContext();
  const publicExplorer = await publicContext.request.get(`${publicOrigin}/zh/identity/explorer`);
  assert.equal(publicExplorer.status(), 200, "public explorer route");
  const publicHtml = await publicExplorer.text();
  for (const name of ["Saint Kitts", "圣基茨", "Argentina", "阿根廷", "Vanuatu", "瓦努阿图", "São Tomé", "圣多美"]) assert.doesNotMatch(publicHtml, new RegExp(name, "i"), `unapproved ${name} must not reach public selector`);
  for (const slug of slugs) {
    const response = await publicContext.request.get(`${publicOrigin}/zh/identity/countries/${slug}`);
    assert.equal(response.status(), 404, `unapproved ${slug} must be server-gated`);
  }
  await publicContext.close();
  passed("Release gate: default public selector is empty and unapproved detail routes are 404");
} catch (error) {
  failed("CBI browser audit", error);
  throw error;
} finally {
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(resolve(evidenceDir, "cbi-browser-results.json"), JSON.stringify({ origin, publicOrigin, preview: process.env.IDENTITY_CBI_REVIEW_PREVIEW === "1", results }, null, 2));
  await browser.close();
}
