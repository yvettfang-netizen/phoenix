/** Synthetic browser QA against the actual built worker; not physical-device acceptance.
 * Set PLAYWRIGHT_MODULE to an installed playwright module directory when it is not local.
 * Start scripts/health-preview-server.mjs separately. Default switch remains off.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href : "playwright");
const origin = process.env.HEALTH_ORIGIN || "http://127.0.0.1:4387";
const out = resolve(process.env.HEALTH_EVIDENCE_DIR || "outputs/health-landing");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HEALTH_BROWSER_PATH ? { executablePath: process.env.HEALTH_BROWSER_PATH } : {}) });
const results = [];
const passed = name => results.push({ name, status: "PASS" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
try {
  for (const locale of ["zh", "en"]) {
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
      assert.equal(await page.locator("h1").count(), 1);
      assert.ok(await page.title());
      assert.ok(await page.locator('meta[name="description"]').getAttribute("content"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale}/${width} horizontal overflow`);
      const brand = await page.locator("header .brand-mark").boundingBox();
      const actions = await page.locator("header .header-actions").boundingBox();
      assert.ok(brand.x + brand.width <= actions.x + 1, `${locale}/${width} header overlap`);
      assert.equal(await page.locator("[data-testid=health-landing-closed]").count(), process.env.HEALTH_EXPECT_ENABLED === "1" ? 0 : 1);
      assert.equal(await page.locator('a[href$="/compass/health"]').count(), process.env.HEALTH_EXPECT_ENABLED === "1" ? 1 : 0);
      passed(`${locale} responsive ${width}px, metadata and controlled entry`);
      if ([390, 768, 1440].includes(width)) await page.screenshot({ path: resolve(out, `health-${locale}-${width}.png`), fullPage: true });
    }
    const requests = [];
    page.on("request", request => requests.push(request.url()));
    await page.locator("#health-service").selectOption({ index: 1 });
    await page.locator('#consultation button[type="submit"]').click();
    const status = await page.getByTestId("health-consultation-status").innerText();
    assert.match(status, locale === "zh" ? /尚未发送咨询/ : /No enquiry has been sent/);
    assert.equal(requests.length, 0, "Consultation must not send requests");
    assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })), { local: [], session: [], cookies: "" });
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#health-service").inputValue(), "");
    assert.equal((await page.getByTestId("health-consultation-status").innerText()).trim(), "");
    passed(`${locale} consultation truthful, no network/storage, refresh resets`);
    await page.locator("#consultation").evaluate(el => el.scrollIntoView());
    await page.locator("details").filter({ has: page.locator("summary") }).nth(1).locator("summary").click();
    assert.ok(await page.locator("details[open]").count());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
    await page.locator(".mobile-menu summary").click();
    assert.ok(await page.locator(".mobile-menu[open] nav").isVisible());
    await page.locator(".mobile-menu .mobile-locale").click();
    await page.waitForURL(`**/${locale === "zh" ? "en" : "zh"}/health`);
    passed(`${locale} FAQ, mobile menu and locale-preserving route`);
  }
  if (process.env.HEALTH_EXPECT_ENABLED === "1") {
    await page.goto(`${origin}/zh/health`, { waitUntil: "networkidle" });
    await page.getByTestId("health-landing-assessment").click();
    await page.waitForURL("**/zh/compass/health");
    await page.waitForLoadState("networkidle");
    await page.locator("[data-health-compass]").waitFor();
    await page.locator("header img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const requests = [];
    page.on("request", request => requests.push(request.url()));
    assert.equal(await page.getByTestId("health-start").isDisabled(), true);
    await page.getByTestId("health-consent").check();
    await page.getByTestId("health-start").click();
    await page.locator('input[type="radio"]').first().check();
    await page.getByTestId("health-next").click();
    await page.getByTestId("health-back").click();
    assert.equal(await page.locator('input[type="radio"]').first().isChecked(), true);
    await page.getByTestId("health-next").click();
    for (let i = 0; i < 13; i++) await page.getByTestId("health-skip").click();
    await page.getByTestId("health-result").click();
    assert.equal(await page.getByTestId("health-dimension").count(), 0, "Context-only answers must not invent results");
    const consultationLinks = await page.getByTestId("health-independent-consultation").locator("a").evaluateAll(links => links.map(link => link.getAttribute("href")));
    assert.deepEqual(consultationLinks, ["/zh/health/family#family-consultation", "/zh/health#consultation"]);
    assert.equal(requests.length, 0, `Questionnaire interaction must not send answers: ${JSON.stringify(requests)}`);
    assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })), { local: [], session: [], cookies: "" });
    passed("Landing → original questionnaire, consent, back/edit, skip, no invented results or transmission");
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  passed("No browser runtime errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  await page.screenshot({ path: resolve(out, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(out, "browser-results.json"), JSON.stringify({ results }, null, 2));
  await browser.close();
  console.log(JSON.stringify(results));
}
