/*
 * V6 homepage and Compass browser evidence.
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
  assertBrandSource,
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
const widths = [1440, 768, 390, 320];
const mobileBreakpoint = 700;
const hubSelector = 'main > section[aria-labelledby="compass-hub-heading"]';
const desktopGeometry = {
  header: [56, 64],
  hero: [230, 270],
  compass: [145, 175],
  journey: [90, 115],
  ecosystem: [130, 160],
  footer: [100, 130],
};

await mkdir(out, { recursive: true });
const results = [];
const geometryEvidence = [];
const passed = name => {
  results.push({ name, status: "PASS" });
  console.log(`PASS ${name}`);
};
assertBrandSource();

function normaliseAssetSrc(src) {
  return (src || "").split("?")[0];
}

function compassDestinations(locale) {
  return {
    education: `/${locale}/education`,
    identity: `/${locale}/identity`,
    wealth: `https://wealth.phoenixnova.com.cn/${locale}`,
    health: `/${locale}/health`,
  };
}

async function waitForRenderedPage(page) {
  await page.locator("h1").first().waitFor();
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 1)) {
      scrollTo(0, y);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    scrollTo(0, 0);
    await Promise.all([...document.images].map(image => image.decode().catch(() => undefined)));
    await document.fonts.ready;
    const unloaded = [...document.images].filter(image => image.naturalWidth === 0).map(image => image.currentSrc || image.src || "");
    if (unloaded.length) throw new Error(`V6 homepage images failed to load: ${unloaded.join(", ")}`);
  });
}

async function assertLogo(page, route, width) {
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
  assert.ok(brands.every(brand => brand.width > 0 && brand.height > 0 && Math.abs((brand.width / brand.height) - 3) < 0.002), `${route}: B logo must retain its exact 3:1 rendered ratio`);
  assert.ok(brands.every(brand => brand.filter === "none"), `${route}: official B logo colours must not be filtered`);
  const headerWidth = await page.locator("header.site-header .brand-asset").evaluate(image => image.getBoundingClientRect().width);
  const footerWidth = await page.locator("footer.site-footer .brand-asset").evaluate(image => image.getBoundingClientRect().width);
  const expectedHeaderWidth = width >= 1181 ? 165 : width > mobileBreakpoint ? 220 : 150;
  assert.ok(Math.abs(headerWidth - expectedHeaderWidth) <= 2, `${route}: Header logo width ${headerWidth}px is outside the ${expectedHeaderWidth}px V6.3 target`);
  assert.ok(Math.abs(footerWidth - 150) <= 2, `${route}: Footer logo width ${footerWidth}px is outside the 150px V6.3 target`);
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
  const footerBackground = await footer.locator("[data-compact-footer]").evaluate(element => getComputedStyle(element).backgroundColor);
  const heroBackground = await page.locator('main > section[aria-labelledby="homepage-v6-title"]').evaluate(element => getComputedStyle(element).backgroundColor);
  assert.equal(footerBackground, heroBackground, `${route}: Hero and compact Footer must use the same brand teal`);
}

async function assertCompassAndJourneys(page, locale, route) {
  const compass = page.locator("[data-v6-compass]");
  assert.equal(await compass.count(), 4, `${route}: four Compass cards are required`);
  for (const [domain, href] of Object.entries(compassDestinations(locale))) {
    const card = page.locator(`a[data-v6-compass="${domain}"]`);
    assert.equal(await card.getAttribute("href"), href, `${route}: ${domain} card route changed`);
  }

  const journey = page.locator("[data-v6-journey]");
  assert.equal(await journey.count(), 6, `${route}: six life-journey items are required`);
  const journeyNames = await journey.evaluateAll(nodes => nodes.map(node => (node.textContent || "").trim()));
  assert.ok(journeyNames.every(Boolean), `${route}: every life-journey item needs readable content`);
}

async function assertCompassHub(page, locale, width) {
  const route = `/${locale} @ ${width}px`;
  const hub = page.locator(hubSelector);
  const dials = hub.locator("a[data-v6-dial]");
  const family = hub.locator("a[data-v6-family-os]");
  assert.equal(await hub.locator("a").count(), 5, `${route}: the map needs five independent links`);
  assert.equal(await dials.count(), 4, `${route}: expected four Compass dials`);
  for (const [domain, href] of Object.entries(compassDestinations(locale))) {
    assert.equal(await hub.locator(`a[data-v6-dial="${domain}"]`).getAttribute("href"), href);
  }
  assert.equal(await family.getAttribute("href"), `/${locale}/account`);
  assert.ok(await family.evaluate(link => getComputedStyle(link, "::before").clipPath.startsWith("polygon(")), `${route}: missing house silhouette`);

  const arcs = hub.locator('div > svg[focusable="false"] > path:visible');
  assert.equal(await arcs.count(), 1);
  assert.equal((await arcs.getAttribute("d")).match(/M/g)?.length, 4, `${route}: expected four visible gold arcs`);

  const boxes = await dials.evaluateAll(links => links.map(link => {
    const { x, y, width, height } = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    return {
      domain: link.dataset.v6Dial, x, y, width, height,
      radius: style.borderTopLeftRadius,
      color: style.getPropertyValue("--domain").trim(),
    };
  }));
  const house = await family.boundingBox();
  assert.ok(house && house.width >= 44 && house.height >= 44, `${route}: house link is too small`);
  assert.ok(boxes.every(box => box.width >= 44 && Math.abs(box.width - box.height) <= 1 && box.radius === "50%"), `${route}: all four links must be circles`);
  assert.ok(boxes.every(box => box.width > house.width && box.height > house.height), `${route}: the house must be smaller than the dials`);
  assert.equal(new Set(boxes.map(box => box.color)).size, 4, `${route}: each dial needs its domain color`);
  const familyX = house.x + house.width / 2;
  const familyY = house.y + house.height / 2;
  for (const box of boxes) {
    const left = box.domain === "education" || box.domain === "identity";
    const top = box.domain === "education" || box.domain === "wealth";
    assert.equal(box.x + box.width / 2 < familyX, left, `${route}: ${box.domain} is on the wrong side`);
    assert.equal(box.y + box.height / 2 < familyY, top, `${route}: ${box.domain} is on the wrong row`);
  }
  geometryEvidence.push({ locale, width, house, dials: boxes });
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

async function assertDesktopGeometry(page, locale) {
  const blocks = [
    ["header", "header.site-header"],
    ["hero", 'main > section[aria-labelledby="homepage-v6-title"]'],
    ["compass", 'main > section[aria-labelledby="compass-heading"]'],
    ["journey", 'main > section[aria-labelledby="journey-heading"]'],
    ["ecosystem", 'main > section[aria-labelledby="learning-heading"]'],
    ["footer", "footer.site-footer"],
  ];
  const measurements = {};
  const failures = [];
  for (const [name, selector] of blocks) {
    const locator = page.locator(selector);
    assert.equal(await locator.count(), 1, `${locale} 1440px: V6.3 ${name} block must be unique`);
    measurements[name] = await locator.evaluate(element => element.getBoundingClientRect().height);
    const [minimum, maximum] = desktopGeometry[name];
    if (measurements[name] < minimum || measurements[name] > maximum) failures.push({ name, actual: measurements[name], expected: [minimum, maximum] });
  }
  measurements.compassHub = (await page.locator(hubSelector).boundingBox()).height;
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  geometryEvidence.push({ locale, width: 1440, totalHeight, blocks: measurements, failures });
  assert.deepEqual(failures, [], `${locale} 1440px: surrounding sections outside their existing ranges: ${JSON.stringify(failures)}`);
  passed(`${locale} 1440px: surrounding homepage sections retain their desktop proportions`);
}

async function assertCompassTextFits(page, locale) {
  const metrics = await page.locator("[data-v6-compass] p").evaluateAll(elements => elements.map(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lineTops = [...range.getClientRects()].map(rect => Math.round(rect.top * 10) / 10);
    const lineCount = new Set(lineTops).size;
    const style = getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight);
    return { text: element.textContent?.trim() || "", lineCount, lineHeight, height: element.getBoundingClientRect().height };
  }));
  assert.equal(metrics.length, 4, `${locale} 1440px: Compass card description count changed`);
  assert.ok(metrics.every(metric => metric.text && metric.lineCount <= 2 && Number.isFinite(metric.lineHeight) && metric.height <= metric.lineHeight * 2 + 1), `${locale} 1440px: Compass card description exceeds two lines: ${JSON.stringify(metrics)}`);
  geometryEvidence.push({ locale, width: 1440, compassText: metrics });
  passed(`${locale} 1440px: Compass card descriptions remain within two computed lines`);
}

async function assertEnglishMainCopy(page) {
  const violations = await page.locator("main").evaluate(main => {
    const chinese = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const found = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      const text = node.nodeValue?.replace(/\s+/g, " ").trim() || "";
      if (!text || parent?.closest("script,style,[aria-hidden=\"true\"]")) continue;
      if (chinese.test(text)) found.push({ tag: parent?.tagName || "", text });
    }
    return found;
  });
  assert.deepEqual(violations, [], `English homepage main contains Chinese text outside Logo/trademark: ${JSON.stringify(violations)}`);
  passed("English homepage main copy contains no Chinese characters outside Logo/trademark");
}

async function assertLanguageSwitches(page) {
  for (const sourceLocale of locales) {
    const targetLocale = sourceLocale === "zh" ? "en" : "zh";
    for (const path of ["/education", "/identity", "/health"]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${origin}/${sourceLocale}${path}`, { waitUntil: "networkidle" });
      const toggle = page.locator("header.site-header .locale-switch");
      await toggle.waitFor();
      const targetPath = `/${targetLocale}${path}`;
      assert.equal(await toggle.getAttribute("href"), targetPath, `${sourceLocale}${path}: language toggle path changed`);
      await Promise.all([
        page.waitForURL(url => new URL(url).pathname === targetPath),
        toggle.click(),
      ]);
      assert.equal(new URL(page.url()).pathname, targetPath, `${sourceLocale}${path}: language toggle did not preserve route`);
      passed(`${sourceLocale}${path} → ${targetPath}: language toggle preserves route`);
    }
  }
}

async function assertPage(page, locale, width) {
  const route = `/${locale} @ ${width}px`;
  assert.equal(await page.locator("h1").count(), 1, `${route}: one homepage h1 is required`);
  assert.ok((await page.locator("h1").innerText()).trim(), `${route}: homepage h1 must have readable text`);
  assert.equal(await page.locator("[data-homepage-v6]").count(), 1, `${route}: V6 homepage root marker must be unique`);
  assert.equal(await page.locator("[data-homepage-v6]").evaluate((element, localeCode) => element.getAttribute("lang")?.toLowerCase().startsWith(localeCode), locale), true, `${route}: homepage language is wrong`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route}: horizontal overflow`);
  const sections = await page.locator("main > section").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-labelledby")));
  assert.deepEqual(sections, ["homepage-v6-title", "compass-heading", "journey-heading", "compass-hub-heading", "learning-heading"]);
  assert.doesNotMatch(await page.locator("body").innerText(), /Founder (?:Center|OS)|创始人中心/i);
  await assertLogo(page, route, width);
  await assertHeaderAndFooter(page, locale, route);
  await assertCompassAndJourneys(page, locale, route);
  await assertCompassHub(page, locale, width);
  if (width === 1440) {
    await assertCompassTextFits(page, locale);
    await assertDesktopGeometry(page, locale);
  }
  if (locale === "en") await assertEnglishMainCopy(page);
  await page.screenshot({ path: resolve(out, `homepage-v6-${locale}-${width}.png`), fullPage: true });
  await page.locator(hubSelector).screenshot({ path: resolve(out, `homepage-v6-${locale}-${width}-compass.png`) });
  await page.locator("header.site-header").screenshot({ path: resolve(out, `homepage-v6-${locale}-${width}-header.png`) });
  await page.locator("footer.site-footer").screenshot({ path: resolve(out, `homepage-v6-${locale}-${width}-footer.png`) });
}

async function assertHomepageClicks(page, locale, width) {
  const account = `/${locale}/account`;
  const entries = [
    ...Object.entries(compassDestinations(locale)).map(([domain, href]) => [`${hubSelector} a[data-v6-dial="${domain}"]`, href]),
    [`${hubSelector} a[data-v6-family-os]`, account],
  ];
  if (width === 1440) {
    entries.push(
      ["header.site-header a.portal-link", account],
      ['section[aria-labelledby="homepage-v6-title"] a[href$="/compass"]', `/${locale}/compass`],
      ['section[aria-labelledby="homepage-v6-title"] a[href$="/about"]', `/${locale}/about`],
      ['main a[href$="/education#academy"]', `/${locale}/education#academy`],
      ['main a[href$="/education#askwise"]', `/${locale}/education#askwise`],
      ['main a[href$="/insights"]', `/${locale}/insights`],
    );
  }
  for (const [selector, href] of entries) {
    await page.goto(`${origin}/${locale}`, { waitUntil: "domcontentloaded" });
    const target = new URL(href, origin);
    const link = page.locator(selector);
    assert.equal(await link.getAttribute("href"), href);
    await Promise.all([
      page.waitForURL(target.href, { waitUntil: "domcontentloaded" }),
      link.click(),
    ]);
    await page.locator(target.hash || "h1").first().waitFor({ state: target.hash ? "attached" : "visible" });
    passed(`${locale} ${width}px: ${selector} opens ${href}`);
  }
}

const browser = await chromium.launch({ headless: true, ...(process.env.V6_BROWSER ? { executablePath: process.env.V6_BROWSER } : {}) });
const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
const homepageConsoleErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
page.on("console", message => {
  if (message.type() === "error" && locales.some(locale => page.url() === `${origin}/${locale}`)) {
    homepageConsoleErrors.push({ url: message.location().url, message: message.text() });
  }
});

try {
  for (const locale of locales) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < mobileBreakpoint ? 844 : 1000 });
      await page.goto(`${origin}/${locale}`, { waitUntil: "networkidle" });
      await waitForRenderedPage(page);
      await assertPage(page, locale, width);
      if (width === widths[0]) await assertInternalRoutes(page, locale, `/${locale}`);
      passed(`${locale} ${width}px: homepage structure, logo, Compass geometry, language and overflow`);
      if (width === 1440 || width === 390) await assertHomepageClicks(page, locale, width);
    }
  }
  await assertLanguageSwitches(page);
  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(" | ")}`);
  // The browser requests /favicon.ico automatically. app/layout.tsx defers that asset pending Founder approval.
  const unexpectedErrors = homepageConsoleErrors.filter(error =>
    !(error.url === `${origin}/favicon.ico` && error.message.includes("404"))
  );
  assert.deepEqual(unexpectedErrors, [], "Unexpected homepage console errors");
  passed("No browser runtime errors or unexpected homepage console errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  await page.screenshot({ path: resolve(out, "homepage-v6-failure.png"), fullPage: true }).catch(() => undefined);
  throw error;
} finally {
  await writeFile(resolve(out, "homepage-v6-browser-results.json"), JSON.stringify({ origin, results, geometryEvidence, pageErrors, homepageConsoleErrors }, null, 2));
  await browser.close();
  console.log(JSON.stringify({ passed: results.filter(result => result.status === "PASS").length, failed: results.filter(result => result.status === "FAIL").length }));
}
