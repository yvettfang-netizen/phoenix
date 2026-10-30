/** Synthetic browser QA against the actual built worker; not physical-device acceptance.
 * Set PLAYWRIGHT_MODULE to an installed playwright module directory when it is not local.
 * Start scripts/health-preview-server.mjs separately. Default switch remains off.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BRAND_FOOTER_URL, BRAND_HEADER_URL } from "./brand-integrity.mjs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href : "playwright");
const origin = process.env.HEALTH_ORIGIN || "http://127.0.0.1:4387";
const out = resolve(process.env.HEALTH_EVIDENCE_DIR || "outputs/health-landing");
const BRAND_ASSETS = {
  header: { url: BRAND_HEADER_URL, width: 1040, height: 320, background: "rgb(248, 246, 241)" },
  footer: { url: BRAND_FOOTER_URL, width: 1059, height: 1116, background: "rgb(255, 255, 255)" },
};
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HEALTH_BROWSER_PATH ? { executablePath: process.env.HEALTH_BROWSER_PATH } : {}) });
const results = [];
const passed = name => results.push({ name, status: "PASS" });

async function inspectBrandImage(locator, route, role, width) {
  assert.equal(await locator.count(), 1, `${route} ${role} must render one brand image`);
  const image = locator.first();
  await image.evaluate(element => element.decode());
  const details = await image.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const wrapper = element.closest(".brand-asset-wrap");
    const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null;
    return {
      src: element.currentSrc || element.getAttribute("src") || "",
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      objectFit: style.objectFit,
      wrapperBackground: wrapperStyle?.backgroundColor || "",
      wrapperOverflow: wrapperStyle?.overflow || "",
    };
  });
  const expected = BRAND_ASSETS[role];
  assert.ok(details.src.includes(expected.url), `${route}: ${role} must use ${expected.url}`);
  assert.ok(!/phoenix-nova-(?:logo-master|mark-official|logo-official|official-logo-system-v1)\.png/i.test(details.src), `${route}: legacy mark/logo is still rendered`);
  assert.equal(details.naturalWidth, expected.width, `${route}: ${role} asset width changed`);
  assert.equal(details.naturalHeight, expected.height, `${route}: ${role} asset height changed`);
  assert.ok(details.width > 0 && details.height > 0, `${route}: ${role} image has no rendered box`);
  assert.equal(details.objectFit, "contain", `${route}: ${role} must use object-fit: contain`);
  assert.ok(Math.abs((details.width / details.height) - (details.naturalWidth / details.naturalHeight)) < 0.01, `${route}: ${role} image is cropped or distorted`);
  assert.equal(details.wrapperBackground, expected.background, `${route}: ${role} wrapper must have an explicit light background`);
  assert.ok(!["hidden", "clip"].includes(details.wrapperOverflow), `${route}: ${role} wrapper must not crop its image`);
  assert.ok(details.left >= -1 && details.right <= width + 1, `${route} ${width}px: ${role} image leaves the viewport`);
  return details;
}

async function assertSharedBrandChrome(page, route, width) {
  // Footer branding is intentionally lazy; make it visible before decoding.
  await page.locator("footer").scrollIntoViewIfNeeded();
  await inspectBrandImage(page.locator("header .brand-mark img"), route, "header", width);
  await inspectBrandImage(page.locator("footer .brand-mark img"), route, "footer", width);
  assert.equal(await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').count(), 0, `${route}: favicon markup must remain disabled`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} ${width}px horizontal overflow`);
}

async function assertCompassHeader(page, route, width) {
  await inspectBrandImage(page.locator("header .brand-mark img"), route, "header", width);
  assert.equal(await page.locator("footer .brand-mark img").count(), 0, `${route}: questionnaire must not invent a second footer brand image`);
  assert.equal(await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').count(), 0, `${route}: favicon markup must remain disabled`);
}

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
      assert.equal(await page.locator('[data-testid="health-strengths"]').count(), 1);
      assert.equal(await page.locator('[data-testid="health-life-stages"]').count(), 1);
      assert.match(await page.locator("h1").innerText(), locale === "zh" ? /全家人的健康/ : /Your family's health/);
      assert.equal(await page.locator("[data-health-landing]").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(248, 246, 241)");
      assert.equal(await page.locator("#health-compass").evaluate(el => getComputedStyle(el).backgroundColor), "rgb(0, 59, 70)");
      assert.ok(await page.title());
      assert.ok(await page.locator('meta[name="description"]').getAttribute("content"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${locale}/${width} horizontal overflow`);
      const brand = await page.locator("header .brand-mark").boundingBox();
      const actions = await page.locator("header .header-actions").boundingBox();
      assert.ok(brand.x + brand.width <= actions.x + 1, `${locale}/${width} header overlap`);
      assert.equal(await page.locator("[data-testid=health-landing-closed]").count(), process.env.HEALTH_EXPECT_ENABLED === "1" ? 0 : 1);
      assert.equal(await page.locator('a[href$="/compass/health"]').count(), process.env.HEALTH_EXPECT_ENABLED === "1" ? 1 : 0);
      passed(`${locale} responsive ${width}px, metadata and controlled entry`);
      if ([390, 768, 1440].includes(width)) {
        // Load below-fold lazy brand images before taking a full-page screenshot.
        // A white placeholder must not be mistaken for the final Footer asset.
        await page.locator("footer").scrollIntoViewIfNeeded();
        await page.locator("footer img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: resolve(out, `health-${locale}-${width}.png`), fullPage: true });
      }
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
    const wrapperLabel = locale === "zh" ? "服务地区、安排流程与常见问题" : "Regions, arrangements and common questions";
    const serviceSummary = page.locator("summary").filter({ hasText: wrapperLabel });
    const serviceDetails = serviceSummary.locator("..");
    assert.equal(await serviceDetails.count(), 1, `${locale}: service details wrapper missing`);
    await serviceSummary.click();
    assert.equal(await serviceDetails.evaluate(element => element.open), true, `${locale}: service details wrapper did not open`);
    assert.ok(await page.locator("#regions").isVisible(), `${locale}: regions content remains hidden`);
    await page.locator("#regions").evaluate(el => el.scrollIntoView());
    await serviceDetails.locator("section").last().locator("details").first().locator("summary").first().click();
    assert.ok(await serviceDetails.locator("details[open]").count(), `${locale}: FAQ did not open after wrapper expansion`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
    await page.locator(".mobile-menu summary").click();
    assert.ok(await page.locator(".mobile-menu[open] nav").isVisible());
    await page.locator(".mobile-menu .mobile-locale").click();
    await page.waitForURL(`**/${locale === "zh" ? "en" : "zh"}/health`);
    passed(`${locale} FAQ, mobile menu and locale-preserving route`);
  }
  for (const locale of ["zh", "en"]) {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ["", "/compass", "/health", "/health/family"]) {
        const path = `/${locale}${route}`;
        await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
        await assertSharedBrandChrome(page, path, width);
        passed(`${path} ${width}px shared Header/Footer brand integrity and no overflow`);
      }
    }
  }
  if (process.env.HEALTH_EXPECT_ENABLED === "1") {
    await page.goto(`${origin}/zh/health`, { waitUntil: "networkidle" });
    await page.getByTestId("health-landing-assessment").click();
    await page.waitForURL("**/zh/compass/health");
    await page.waitForLoadState("networkidle");
    await page.locator("[data-health-compass]").waitFor();
    await assertCompassHeader(page, "/zh/compass/health", await page.evaluate(() => innerWidth));
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
