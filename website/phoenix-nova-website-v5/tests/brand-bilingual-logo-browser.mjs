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
          const symbol = element.querySelector(".brand-mark__symbol");
          const divider = element.querySelector(".brand-mark__divider");
          const rect = element.getBoundingClientRect();
          const symbolRect = symbol?.getBoundingClientRect();
          return {
            variant: element.getAttribute("data-brand-variant"),
            text: element.textContent?.replace(/\s+/g, " ").trim(),
            width: rect.width,
            height: rect.height,
            symbolSrc: symbol?.getAttribute("src"),
            symbolWidth: symbolRect?.width,
            symbolHeight: symbolRect?.height,
            dividerHeight: divider?.getBoundingClientRect().height,
            symbolFilter: symbol ? getComputedStyle(symbol).filter : "",
          };
        }));
        assert.ok(details.every(detail => detail.variant === "b"), `${route}: all shared marks must be B variant`);
        assert.ok(details.every(detail => detail.text?.includes("鳳啟環球") && detail.text?.includes("Phoenix Nova™")), `${route}: B bilingual wordmark text missing`);
        assert.ok(details.every(detail => detail.symbolSrc?.endsWith("/brand/official/v3/phoenix-nova-symbol-transparent.png")), `${route}: B must use the approved symbol asset`);
        assert.ok(details.every(detail => detail.symbolFilter === "none"), `${route}: official symbol must not be filtered`);
        assert.ok(details.every(detail => width <= 680 ? detail.symbolWidth >= 28 && detail.symbolWidth <= 34 && detail.symbolHeight >= 36 && detail.symbolHeight <= 42 : detail.symbolWidth >= 38 && detail.symbolWidth <= 46 && detail.symbolHeight >= 48 && detail.symbolHeight <= 54), `${route} @ ${width}px: symbol size outside B specification`);
        assert.ok(details.every(detail => width <= 680 ? detail.dividerHeight >= 34 && detail.dividerHeight <= 38 : detail.dividerHeight >= 42 && detail.dividerHeight <= 48), `${route} @ ${width}px: divider size outside B specification`);
        assert.equal(await page.locator(".brand-mark__wordmark").count(), 2, `${route}: wordmark block missing`);
        assert.equal(await page.locator(".brand-mark__wordmark").locator(".brand-en").evaluateAll(nodes => nodes.some(node => node.textContent?.includes("For Every Beginning."))), false, `${route}: slogan must not be embedded in B logo`);
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

