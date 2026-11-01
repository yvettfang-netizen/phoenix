/** Synthetic browser QA for the Health family planning page.
 * Set PLAYWRIGHT_MODULE to an installed playwright module directory when it is not local.
 * Start scripts/health-preview-server.mjs separately. HEALTH_COMPASS_PREVIEW remains off by default.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href
  : "playwright");
const origin = process.env.HEALTH_ORIGIN || "http://127.0.0.1:4387";
const out = resolve(process.env.HEALTH_EVIDENCE_DIR || "outputs/health-family");
const expectedEnabled = process.env.HEALTH_EXPECT_ENABLED === "1";

const source = readFileSync(new URL("../lib/health-compass.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { dimensions } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HEALTH_BROWSER_PATH ? { executablePath: process.env.HEALTH_BROWSER_PATH } : {}),
});
const results = [];
const passed = name => results.push({ name, status: "PASS" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

const pathFor = (locale, suffix = "") => `${origin}/${locale}/health/family${suffix}`;
const routeFor = locale => `/${locale}/compass/health`;

try {
  for (const locale of ["zh", "en"]) {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(pathFor(locale), { waitUntil: "networkidle" });
      assert.equal(await page.locator("[data-health-family]").count(), 1);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
        `${locale}/${width} horizontal overflow`,
      );

      const brand = await page.locator("header .brand-mark").boundingBox();
      const actions = await page.locator("header .header-actions").boundingBox();
      assert.ok(brand && actions, `${locale}/${width} shared header controls missing`);
      assert.ok(brand.x + brand.width <= actions.x + 1, `${locale}/${width} header overlap`);

      const bodyText = await page.locator("body").innerText();
      for (const dimension of dimensions) {
        const title = dimension.title[locale === "zh" ? 0 : 1];
        assert.ok(bodyText.includes(title), `${locale}/${width}: missing ${title}`);
      }

      const assessmentLinks = page.locator('a[href$="/compass/health"]');
      if (expectedEnabled) {
        assert.equal(await page.getByTestId("family-hero-assessment").count(), 1);
        assert.equal(await page.getByTestId("family-assessment").count(), 1);
        assert.equal(await page.getByTestId("family-hero-assessment-closed").count(), 0);
        assert.equal(await page.getByTestId("family-assessment-closed").count(), 0);
        assert.equal(await assessmentLinks.count(), 2);
        assert.deepEqual(
          await assessmentLinks.evaluateAll(links => links.map(link => new URL(link.href).pathname)),
          [routeFor(locale), routeFor(locale)],
        );
      } else {
        assert.equal(await page.getByTestId("family-hero-assessment-closed").count(), 1);
        assert.equal(await page.getByTestId("family-assessment-closed").count(), 1);
        assert.equal(await assessmentLinks.count(), 0);
      }

      const medicalLinks = page.locator(`a[href^="/${locale}/health#"]`);
      const medicalHrefs = await medicalLinks.evaluateAll(links => links.map(link => link.getAttribute("href")));
      assert.ok(medicalHrefs.includes(`/${locale}/health#services`), `${locale}: services bridge missing`);
      assert.ok(medicalHrefs.includes(`/${locale}/health#consultation`), `${locale}: consultation bridge missing`);
      assert.ok(medicalHrefs.every(href => href && !href.includes("?")), `${locale}: medical link carries query`);

      if ([390, 768, 1440].includes(width)) {
        await page.locator("footer").scrollIntoViewIfNeeded();
        await page.locator("footer img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: resolve(out, `health-family-${locale}-${width}.png`), fullPage: true });
      }
      passed(`${locale} family page ${width}px: six directions, gate state and responsive header`);
    }

    await page.goto(pathFor(locale), { waitUntil: "networkidle" });
    assert.equal(await page.locator("#family-consultation").count(), 1);
    await page.locator("#family-consultation").scrollIntoViewIfNeeded();
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.locator("footer img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => scrollTo(0, 0));
    const requests = [];
    page.on("request", request => requests.push(request.url()));
    await page.locator("#health-service").selectOption({ index: 1 });
    await page.locator('#family-consultation button[type="submit"]').click();
    const status = await page.getByTestId("health-consultation-status").innerText();
    assert.match(status, locale === "zh" ? /尚未发送咨询/ : /No enquiry has been sent/);
    assert.equal(requests.length, 0, `${locale} family consultation must not send requests`);
    assert.deepEqual(
      await page.evaluate(() => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
        cookies: document.cookie,
      })),
      { local: [], session: [], cookies: "" },
      `${locale} family consultation must not write browser storage`,
    );
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("#health-service").inputValue(), "");
    assert.equal((await page.getByTestId("health-consultation-status").innerText()).trim(), "");
    passed(`${locale} family consultation is a local demo and refresh resets it`);

    const otherLocale = locale === "zh" ? "en" : "zh";
    assert.equal(await page.locator("a.locale-switch").getAttribute("href"), `/${otherLocale}/health/family`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pathFor(locale), { waitUntil: "networkidle" });
    await page.locator(".mobile-menu summary").click();
    await page.locator(".mobile-menu .mobile-locale").click();
    await page.waitForURL(`**/${otherLocale}/health/family`);
    passed(`${locale} locale switch preserves the Health family route`);
  }

  for (const locale of ["zh", "en"]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
    // Founder V3.1 replaces the old three homepage choices with family,
    // cross-border care and partner introduction. Family questionnaire tests
    // above stay unchanged; partners do not receive a fake login route.
    const goals = page.locator('section[aria-labelledby="health-entry-title"]');
    assert.equal(await goals.count(), 1);
    assert.equal(await goals.locator("article").count(), 3, "Exactly three starting cards");
    assert.equal(await goals.locator(`a[href="/${locale}/health/family"]`).count(), 1);
    assert.equal(await goals.locator('a[href="#services"]').count(), 1);
    assert.equal(await goals.locator('a[href="#partners"]').count(), 1, "Partner card links to the controlled introduction");
    const goalText = await goals.innerText();
    if (locale === "zh") {
      assert.match(goalText, /家庭健康规划/);
      assert.match(goalText, /跨境医疗服务/);
      assert.match(goalText, /医疗服务合作伙伴/);
    } else {
      assert.match(goalText, /Family health planning/i);
      assert.match(goalText, /cross-border care/i);
      assert.match(goalText, /Medical service partners/i);
    }
    passed(`${locale} Health homepage exposes family, cross-border care and controlled partner introduction`);
  }

  assert.deepEqual(errors, [], "No browser runtime errors");
  passed("No browser runtime errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  await page.screenshot({ path: resolve(out, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(out, "browser-results.json"), JSON.stringify({
    scope: "health-family-browser",
    origin,
    expectedEnabled,
    results,
  }, null, 2));
  await browser.close();
  console.log(JSON.stringify(results));
}
