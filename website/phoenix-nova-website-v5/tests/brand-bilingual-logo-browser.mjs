import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href
  : "playwright");
const origin = process.env.BRAND_LOGO_ORIGIN || "http://127.0.0.1:4442";
const out = resolve(process.env.BRAND_LOGO_EVIDENCE_DIR || "outputs/brand-bilingual-logo");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BRAND_LOGO_BROWSER ? { executablePath: process.env.BRAND_LOGO_BROWSER } : {}),
});
const results = [];
const passed = name => { results.push({ name, status: "PASS" }); console.log(`PASS ${name}`); };
const routes = ["", "/education", "/identity", "/health"];

try {
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const locale of ["zh", "en"]) {
    for (const path of routes) {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
        const route = `/${locale}${path}`;
        const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
        assert.equal(response?.status(), 200, `${route}: expected 200`);
        await page.locator("header .brand-mark").waitFor();
        const marks = page.locator(".brand-mark");
        assert.equal(await marks.count(), 2, `${route}: header and footer must share BrandMark`);
        const details = await marks.evaluateAll(elements => elements.map(element => {
          const asset = element.querySelector(".brand-mark__asset");
          const rect = element.getBoundingClientRect();
          const assetRect = asset?.getBoundingClientRect();
          return {
            variant: element.getAttribute("data-brand-variant"),
            text: element.textContent?.replace(/\s+/g, " ").trim(),
            width: rect.width,
            height: rect.height,
            assetSrc: asset?.getAttribute("src"),
            assetWidth: assetRect?.width,
            assetHeight: assetRect?.height,
            assetFilter: asset ? getComputedStyle(asset).filter : "",
          };
        }));
        assert.ok(details.every(detail => detail.variant === "b"), `${route}: all shared marks must be B variant`);
        assert.ok(details.every(detail => detail.assetSrc?.endsWith("/brand/official/v3/phoenix-nova-bilingual-b@2x.png")), `${route}: B must use the Founder-provided composite asset`);
        assert.ok(details.every(detail => detail.assetFilter === "none"), `${route}: official composite asset must not be filtered`);
        assert.ok(details.every(detail => width <= 680 ? detail.assetWidth >= 155 && detail.assetWidth <= 170 && detail.assetHeight >= 51 && detail.assetHeight <= 58 : detail.assetWidth >= 215 && detail.assetWidth <= 225 && detail.assetHeight >= 71 && detail.assetHeight <= 76), `${route} @ ${width}px: composite logo size outside B specification`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route} @ ${width}px: horizontal overflow`);
        if (width === 1440 || width === 390) await page.screenshot({ path: resolve(out, `${locale}${path.replaceAll("/", "-") || "-home"}-${width}.png`), fullPage: true });
        passed(`${route} @ ${width}px: B logo, shared Header/Footer and responsive bounds`);
      }
    }
  }
  const missingWealth = await page.goto(`${origin}/zh/wealth`, { waitUntil: "networkidle" });
  assert.equal(missingWealth?.status(), 404, "Wealth route must remain absent until a real page exists");
  passed("/zh/wealth remains an explicit 404; no dead Wealth page was fabricated");
  assert.deepEqual(errors, [], "No browser runtime errors");
  passed("No browser runtime errors");
  await context.close();
} finally {
  await writeFile(resolve(out, "brand-bilingual-logo-browser-results.json"), JSON.stringify({ origin, results }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ passed: results.filter(result => result.status === "PASS").length, failed: results.filter(result => result.status === "FAIL").length }));
}

