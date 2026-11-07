import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs") ? createRequire(import.meta.url)(modulePath) : await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.IDENTITY_V31_ORIGIN || "http://127.0.0.1:44631";
const out = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v31", "part8");
const browser = await chromium.launch({ headless: true, ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}) });
const results = [];
try {
  await mkdir(out, { recursive: true });
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const writes = []; page.on("request", request => { if (request.method() !== "GET") writes.push(request.url()); });
  const external = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== new URL(origin).origin) external.push(request.url());
  });
  for (const locale of ["zh", "en"]) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/${locale}/identity/explorer`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("[data-cbi-card-flag]").count(), 4);
      assert.equal(await page.locator("[data-cbi-family]").count(), 5);
      assert.equal(await page.locator("[data-cbi-focus]").count(), 6);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: resolve(out, `centre-${locale}-${width}.png`), fullPage: true });
        await page.screenshot({ path: resolve(out, `centre-${locale}-${width}-hero.png`) });
      }
    }
    await page.locator("#cbi-amount-min").fill("100");
    assert.equal(await page.locator("[data-cbi-country]").count(), 0, "unknown currency/amounts must not match a budget");
    assert.ok(await page.getByRole("alert").count());
    await page.locator("#cbi-amount-max").fill("1");
    assert.match(await page.getByRole("alert").last().textContent(), locale === "zh" ? /下限不得高于上限/ : /lower bound/);
    await page.locator("[data-cbi-clear]").click();
    await page.locator('[data-cbi-family="PARENTS"]').check();
    assert.equal(await page.locator("[data-cbi-country]").count(), 0, "unknown family rules cannot infer a fit");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-cbi-family="PARENTS"]').isChecked(), false);
    await page.locator('[data-cbi-focus="minimum_investment"]').check();
    assert.equal(await page.locator("[data-cbi-country]").count(), 0);
    await page.locator("[data-cbi-clear]").click();
    assert.equal(await page.locator("[data-cbi-country]").count(), 4);
    const cards = page.locator("[data-cbi-country]");
    await cards.nth(0).getByRole("checkbox").check(); await cards.nth(1).getByRole("checkbox").check();
    await page.getByRole("link", { name: /打开比较|Open comparison/ }).click();
    await page.locator("[data-cbi-report]").waitFor();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /生成并下载比较报告|Generate comparison report/ }).click();
    const download = await downloadPromise; const file = resolve(out, `report-${locale}.json`); await download.saveAs(file);
    const report = JSON.parse(await readFile(file, "utf8"));
    assert.equal(report.countries.length, 2);
    assert.equal(report.status, "INTERNAL_REVIEW_NOT_FOR_PUBLICATION");
    assert.ok(report.gaps.length > 0);
    assert.doesNotMatch(JSON.stringify(report), /"owner"|"imported_by"|"file_hash"|"source_file"|"approved_by"/);
    for (const country of report.official_sources) for (const source of [...country.sources, ...country.field_sources]) {
      assert.equal(new URL(source.official_url).search, "");
      assert.equal(new URL(source.official_url).hash, "");
    }
    assert.ok(report.rows.some(row => row.key === "tax"));
    assert.equal(report.rows.find(row => row.key === "minimum_investment").values.every(value => value === (locale === "zh" ? "待核实" : "Pending verification")), true);
    assert.match(report.notice, locale === "zh" ? /不构成法律、税务、投资或移民申请意见/ : /not legal, tax, investment or immigration/);
    await page.screenshot({ path: resolve(out, `report-${locale}.png`), fullPage: true });
    await page.locator("[data-cbi-report]").screenshot({ path: resolve(out, `report-${locale}-section.png`) });
    results.push({ locale, status: "PASS", checks: "five widths, explicit unknown amount/family/focus filtering, reset, memory-only choices, real JSON report download" });
  }
  await page.goto(`${origin}/zh/identity/explorer/compare?countries=argentina,vanuatu,unknown`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-cbi-report]").count(), 0, "invalid requested country must not be silently dropped");
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  assert.deepEqual(external, [], "Comparison and report download must not call external tracking or asset hosts");
  console.log("PASS Part 8 bilingual interaction, download and privacy checks");
} finally { await writeFile(resolve(out, "browser-results.json"), JSON.stringify({ origin, results }, null, 2)); await browser.close(); }
