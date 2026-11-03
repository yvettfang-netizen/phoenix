/*
 * V6 homepage browser evidence.
 *
 * Set V6_ORIGIN to the running review server before executing this test.  The
 * test deliberately uses the same PLAYWRIGHT_MODULE convention as the other
 * browser checks in this repository so it can run with either the local
 * package or an externally supplied Playwright installation.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import {
  BRAND_HEADER_SIZE,
  BRAND_HEADER_URL,
} from "./brand-integrity.mjs";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs")
  ? createRequire(import.meta.url)(modulePath)
  : await import(modulePath ? pathToFileURL(resolve(modulePath, "index.mjs")).href : "playwright");

const origin = process.env.V6_ORIGIN || "http://127.0.0.1:4400";
const out = resolve(process.env.V6_EVIDENCE_DIR || "outputs/homepage-v6-browser");
const locales = ["zh", "en"];
const widths = [1920, 1440, 1024, 768, 390, 375, 320];
const mobileBreakpoint = 700;

await mkdir(out, { recursive: true });
const results = [];
const passed = name => {
  results.push({ name, status: "PASS" });
  console.log(`PASS ${name}`);
};

function normaliseAssetSrc(src) {
  return (src || "").split("?")[0];
}

function localeLink(href, locale, path) {
  return href === `/${locale}${path}` || href.startsWith(`/${locale}${path}#`);
}

async function waitForRenderedPage(page) {
  await page.locator("h1").first().waitFor();
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : image.decode().catch(() => undefined)));
    await document.fonts.ready;
  });
}

async function assertLogo(page, route) {
  await page.locator("footer").scrollIntoViewIfNeeded();
  const brands = await page.locator(".brand-asset").evaluateAll(images => images.map(image => ({
    src: image.getAttribute("src") || image.currentSrc || "",
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
    filter: getComputedStyle(image).filter,
  })));
  assert.equal(brands.length, 2, `${route}: shared Header/Footer must render exactly two brand assets`);
  assert.ok(brands.every(brand => normaliseAssetSrc(brand.src) === BRAND_HEADER_URL), `${route}: every shared brand image must use the approved B logo`);
  assert.ok(brands.every(brand => brand.naturalWidth === BRAND_HEADER_SIZE.width && brand.naturalHeight === BRAND_HEADER_SIZE.height), `${route}: B logo natural dimensions changed`);
  assert.ok(brands.every(brand => brand.width > 0 && brand.height > 0 && Math.abs((brand.width / brand.height) - (BRAND_HEADER_SIZE.width / BRAND_HEADER_SIZE.height)) < 0.01), `${route}: B logo is cropped or distorted`);
  assert.ok(brands.every(brand => brand.filter === "none"), `${route}: official B logo colours must not be filtered`);
}

async function assertHeaderAndFooter(page, locale, route) {
  const header = page.locator("header.site-header");
  assert.equal(await header.count(), 1, `${route}: one shared Header is required`);
  const headerText = `${await header.innerText()} ${(await header.locator("a").allTextContents()).join(" ")}`;
  if (locale === "zh") {
    for (const label of ["首页", "教育", "身份", "健康"]) assert.match(headerText, new RegExp(label), `${route}: missing ${label} navigation`);
    assert.match(headerText, /(?:财富|财务)/, `${route}: missing Wealth navigation`);
  } else {
    for (const label of ["Home", "Education", "Identity", "Health"]) assert.match(headerText, new RegExp(label), `${route}: missing ${label} navigation`);
    assert.match(headerText, /(?:Wealth|Finance)/, `${route}: missing Wealth navigation`);
  }
  assert.ok(await header.locator("a").count() >= 7, `${route}: the shared Header must expose the primary navigation`);
  const footer = page.locator("footer");
  assert.equal(await footer.count(), 1, `${route}: one shared Footer is required`);
  assert.match(await footer.innerText(), /Phoenix Nova|©\s*2026/i, `${route}: Footer brand/copyright is missing`);
}

async function assertCompassAndJourneys(page, locale, route) {
  const compass = page.locator("[data-v6-compass]");
  assert.equal(await compass.count(), 4, `${route}: four Compass cards are required`);
  const hrefs = await compass.evaluateAll(nodes => nodes.map(node => {
    const link = node.matches("a") ? node : node.closest("a") || node.querySelector("a");
    return link?.getAttribute("href") || "";
  }));
  assert.ok(hrefs.every(Boolean), `${route}: every Compass card must have a real link target`);
  assert.ok(hrefs.some(href => localeLink(href, locale, "/education")), `${route}: Education Compass link is missing`);
  assert.ok(hrefs.some(href => localeLink(href, locale, "/identity")), `${route}: Identity Compass link is missing`);
  assert.ok(hrefs.some(href => localeLink(href, locale, "/health")), `${route}: Health Compass link is missing`);
  assert.ok(hrefs.some(href => href === `/${locale}/compass#wealth` || href === `/${locale}/wealth` || href.startsWith(`/${locale}/wealth#`)), `${route}: Wealth Compass link/controlled preview is missing`);

  const journey = page.locator("[data-v6-journey]");
  assert.equal(await journey.count(), 6, `${route}: six life-journey items are required`);
  const journeyNames = await journey.evaluateAll(nodes => nodes.map(node => (node.textContent || "").trim()));
  assert.ok(journeyNames.every(Boolean), `${route}: every life-journey item needs readable content`);
}

async function assertInternalRoutes(page, locale, route) {
  const paths = await page.locator("a[href]").evaluateAll(links => {
    const origin = location.origin;
    return [...new Set(links.map(link => {
      const raw = link.getAttribute("href") || "";
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return "";
      const target = new URL(raw, location.href);
      return target.origin === origin ? target.pathname : "";
    }).filter(Boolean))];
  });
  assert.ok(paths.length > 0, `${route}: no internal navigation routes were discoverable`);
  const statuses = await page.evaluate(async routePaths => Promise.all(routePaths.map(async path => {
    try {
      const response = await fetch(path, { credentials: "same-origin", redirect: "manual" });
      return { path, status: response.status };
    } catch (error) {
      return { path, status: 0, error: String(error) };
    }
  })), paths);
  assert.ok(statuses.every(result => result.status >= 200 && result.status < 400), `${route}: internal route check failed: ${JSON.stringify(statuses)}`);
  passed(`${locale}: ${paths.length} unique internal homepage routes return HTTP success`);
}

async function assertPage(page, locale, width) {
  const route = `/${locale} @ ${width}px`;
  assert.equal(await page.locator("h1").count(), 1, `${route}: one homepage h1 is required`);
  assert.ok((await page.locator("h1").innerText()).trim(), `${route}: homepage h1 must have readable text`);
  assert.equal(await page.locator("[data-homepage-v6]").count(), 1, `${route}: V6 homepage root marker must be unique`);
  assert.equal(await page.locator("[data-homepage-v6]").evaluate((element, localeCode) => element.getAttribute("lang")?.toLowerCase().startsWith(localeCode), locale), true, `${route}: homepage language is wrong`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route}: horizontal overflow`);
  await assertLogo(page, route);
  await assertHeaderAndFooter(page, locale, route);
  await assertCompassAndJourneys(page, locale, route);
  await page.screenshot({ path: resolve(out, `homepage-v6-${locale}-${width}.png`), fullPage: true });
}

const browser = await chromium.launch({ headless: true, ...(process.env.V6_BROWSER ? { executablePath: process.env.V6_BROWSER } : {}) });
const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));

try {
  for (const locale of locales) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < mobileBreakpoint ? 844 : 1000 });
      await page.goto(`${origin}/${locale}`, { waitUntil: "networkidle" });
      await waitForRenderedPage(page);
      await assertPage(page, locale, width);
      if (width === widths[0]) await assertInternalRoutes(page, locale, `/${locale}`);
      passed(`${locale} ${width}px: V6 homepage structure, navigation, logo, links, language and overflow`);
    }
  }
  assert.deepEqual(pageErrors, [], `V6 homepage browser runtime errors: ${pageErrors.join(" | ")}`);
  passed("No V6 homepage browser runtime errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  await page.screenshot({ path: resolve(out, "homepage-v6-failure.png"), fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  await writeFile(resolve(out, "homepage-v6-browser-results.json"), JSON.stringify({ origin, results, pageErrors }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ passed: results.filter(result => result.status === "PASS").length, failed: results.filter(result => result.status === "FAIL").length }));
}
