import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs")
  ? createRequire(import.meta.url)(modulePath)
  : await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.EDUCATION_ORIGIN || "http://127.0.0.1:4402";
const out = resolve(process.env.EDUCATION_EVIDENCE_DIR || "outputs/education-v3");
await mkdir(out, { recursive: true });

const results = [];
const passed = name => { results.push({ name, status: "PASS" }); console.log(`PASS ${name}`); };
const browser = await chromium.launch({
  headless: true,
  ...(process.env.EDUCATION_BROWSER ? { executablePath: process.env.EDUCATION_BROWSER } : {}),
});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function loaded() {
  await page.locator("[data-education-landing]").waitFor();
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = "eager";
    await Promise.all([...document.images].map(image => image.decode()));
    await document.fonts.ready;
  });
  // Visit the whole page before full-page capture so off-screen lazy images
  // are painted by Chromium as well as decoded.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
      scrollTo({ top: y, behavior: "instant" });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    scrollTo({ top: 0, behavior: "instant" });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

function parseColor(value) {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const channels = match[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
  if (channels.length < 3) return null;
  const rgb = channels.slice(0, 3).map(channel => channel.endsWith("%") ? Number.parseFloat(channel) * 2.55 : Number.parseFloat(channel));
  const alpha = channels[3] === undefined ? 1 : Number.parseFloat(channels[3].replace("%", "")) / (channels[3].endsWith("%") ? 100 : 1);
  if (rgb.some(Number.isNaN) || Number.isNaN(alpha)) return null;
  return [...rgb, alpha];
}

function luminance([red, green, blue]) {
  const linear = value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

async function assertContrast(selector, route, minimumRatio = 4.5) {
  const details = await page.locator(selector).first().evaluate(element => {
    const foreground = getComputedStyle(element).color;
    let node = element;
    let background = "rgb(255, 255, 255)";
    while (node) {
      const candidate = getComputedStyle(node).backgroundColor;
      if (candidate && !candidate.startsWith("rgba(0, 0, 0, 0)")) {
        background = candidate;
        break;
      }
      node = node.parentElement;
    }
    return { foreground, background };
  });
  const foreground = parseColor(details.foreground);
  const background = parseColor(details.background);
  assert.ok(foreground && background && background[3] > 0, `${route}: contrast colors are not inspectable for ${selector}`);
  const ratio = (Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05);
  assert.ok(ratio >= minimumRatio, `${route}: ${selector} contrast ratio ${ratio.toFixed(2)} is below ${minimumRatio}`);
}

async function assertBrandAssets(route) {
  const brands = await page.locator(".brand-asset").evaluateAll(images => images.map(image => ({
    src: image.getAttribute("src"),
    ratio: image.clientWidth / image.clientHeight,
    width: image.clientWidth,
    filter: getComputedStyle(image).filter,
  })));
  assert.equal(brands.length, 2, `${route}: shared Header/Footer must render two brand assets`);
  assert.ok(brands.every(brand => brand.src === "/brand/official/v3/phoenix-nova-header@2x.png" && Math.abs(brand.ratio - 1040 / 320) < 0.06 && brand.filter === "none" && brand.width >= 150 && brand.width <= 230), `${route}: approved brand asset rendering changed`);
}

async function assertAccessibleEducationPage(locale, width) {
  const route = `/${locale}/education @ ${width}px`;
  assert.equal(await page.locator("h1").count(), 1, `${route}: one h1 is required`);
  assert.ok((await page.locator("h1").innerText()).trim(), `${route}: h1 must have readable text`);
  const headings = await page.locator("[data-education-landing] :is(h1,h2,h3)").evaluateAll(elements => elements.map(element => element.textContent?.trim() || ""));
  assert.ok(headings.length >= 8 && headings.every(Boolean), `${route}: headings must be present and named`);
  const images = await page.locator("[data-education-landing] img").evaluateAll(elements => elements.map(element => ({
    alt: element.getAttribute("alt"),
    naturalWidth: element.naturalWidth,
    src: element.currentSrc || element.getAttribute("src") || "",
  })));
  assert.ok(images.length >= 1, `${route}: Education needs visual content`);
  assert.ok(images.every(image => image.alt !== null), `${route}: every image needs an explicit alt, including decorative alt=""`);
  assert.ok(images.some(image => image.alt.trim().length >= 5), `${route}: at least one Education image needs meaningful alternative text`);
  assert.ok(images.every(image => !image.src || image.naturalWidth > 0), `${route}: a rendered image failed to load`);
  const interactive = await page.locator("[data-education-landing] a, [data-education-landing] button, [data-education-landing] summary, [data-education-landing] select").evaluateAll(elements => elements.map(element => ({
    tag: element.tagName,
    name: (element.getAttribute("aria-label") || element.textContent || "").trim(),
  })));
  assert.ok(interactive.length > 0 && interactive.every(item => item.name), `${route}: interactive elements need accessible names`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route}: horizontal overflow`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).margin), "0px", `${route}: shared global stylesheet must load`);
}

async function assertCompass(pageRoute) {
  const route = pageRoute;
  const compass = page.locator("#education-compass");
  assert.equal(await compass.count(), 1, `${route}: #education-compass must be unique`);
  assert.ok(await compass.isVisible(), `${route}: #education-compass must be visible`);
  const controlled = page.getByTestId("education-compass-controlled");
  assert.equal(await controlled.count(), 1, `${route}: controlled Education Compass marker missing`);
  assert.match(await controlled.innerText(), /(?:尚未|暂未|未开放|未接通|not open|not connected|unavailable)/i, `${route}: Compass availability copy is not truthful`);
  const start = page.getByRole("button", { name: /开始(?:教育规划)?(?:评估|测评)|Start(?: education planning)? assessment/i });
  assert.equal(await start.count(), 1, `${route}: exactly one disabled assessment action is expected`);
  assert.equal(await start.isDisabled(), true, `${route}: assessment action must remain disabled`);
  assert.equal(await page.locator('a[href*="/education/assessment"],a[href*="/education/result"],a[href*="/education/questionnaire"]').count(), 0, `${route}: controlled Compass must not expose questionnaire/result routes`);
}

async function assertServiceDetails(route) {
  const services = page.getByTestId("education-service");
  assert.equal(await services.count(), 4, `${route}: four service cards are required`);
  for (let index = 0; index < await services.count(); index++) {
    const card = services.nth(index);
    const details = card.locator("details");
    assert.equal(await details.count(), 1, `${route}: service ${index + 1} must use one native details disclosure`);
    const detail = details.first();
    if (await detail.getAttribute("open") !== null) await detail.locator("summary").click();
    await detail.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await detail.getAttribute("open") !== null, true, `${route}: service ${index + 1} did not open from the keyboard`);
  }
}

async function assertLearningSteps(route) {
  const steps = page.getByTestId("learning-step");
  assert.equal(await steps.count(), 7, `${route}: seven ordered learning steps are required`);
  const texts = [];
  for (let index = 0; index < await steps.count(); index++) {
    const step = steps.nth(index);
    const text = (await step.innerText()).trim();
    assert.ok(text, `${route}: learning step ${index + 1} is empty`);
    texts.push(text);
    const details = step.locator("details");
    if (await details.count()) {
      const detail = details.first();
      if (await detail.getAttribute("open") !== null) await detail.locator("summary").click();
      await detail.locator("summary").focus();
      await page.keyboard.press("Enter");
      assert.equal(await detail.getAttribute("open") !== null, true, `${route}: learning step ${index + 1} details did not open from the keyboard`);
    }
  }
  assert.equal(new Set(texts).size, 7, `${route}: learning steps must remain ordered and distinct`);
}

async function assertConsultation(route) {
  const panel = page.getByTestId("education-consultation");
  assert.equal(await panel.count(), 1, `${route}: Education consultation panel is missing`);
  const select = panel.locator("#education-direction");
  assert.equal(await select.count(), 1, `${route}: education direction select is missing`);
  const values = await select.locator("option").evaluateAll(options => options.map(option => option.value));
  assert.deepEqual(values.slice(1), ["planning", "hong-kong", "global", "academic", "academy"], `${route}: consultation options changed`);
  const button = panel.getByRole("button", { name: /查看咨询准备清单|View preparation checklist/i });
  assert.equal(await button.count(), 1, `${route}: preparation button is missing`);
  assert.equal(await button.isDisabled(), true, `${route}: preparation button must start disabled`);
  assert.match(await page.getByTestId("education-preparation-status").innerText(), /(?:尚未发送咨询|No enquiry has been sent)/i, `${route}: initial preparation status is missing`);

  const requests = [];
  const record = request => requests.push({ url: request.url(), method: request.method() });
  page.on("request", record);
  try {
    for (const value of ["planning", "hong-kong", "global", "academic", "academy"]) {
      await select.selectOption(value);
      assert.equal(await select.inputValue(), value, `${route}: ${value} was not selectable`);
      assert.equal(await button.isDisabled(), false, `${route}: preparation button did not enable for ${value}`);
      await button.click();
      assert.match(await page.getByTestId("education-preparation-status").innerText(), /(?:尚未发送咨询|No enquiry has been sent)/i, `${route}: ${value} status must remain unsent`);
      assert.equal(new URL(page.url()).search, "", `${route}: ${value} put sensitive data in the URL`);
      const clear = panel.getByRole("button", { name: /清空选择|Clear selection/i });
      assert.equal(await clear.count(), 1, `${route}: clear selection action is missing after preparation`);
      await clear.click();
      assert.equal(await select.inputValue(), "", `${route}: clear did not reset ${value}`);
      assert.equal(await button.isDisabled(), true, `${route}: clear did not disable preparation action`);
    }
    await select.selectOption("academy");
    await button.click();
    assert.equal(await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookies: document.cookie,
    })).then(value => JSON.stringify(value)), JSON.stringify({ local: [], session: [], cookies: "" }), `${route}: preparation data escaped page memory`);
    assert.equal(requests.length, 0, `${route}: local preparation sent network requests: ${JSON.stringify(requests)}`);
  } finally {
    page.off("request", record);
  }
  await page.reload({ waitUntil: "networkidle" });
  await loaded();
  assert.equal(await page.locator("#education-direction").inputValue(), "", `${route}: reload restored consultation selection`);
  assert.match(await page.getByTestId("education-preparation-status").innerText(), /(?:尚未发送咨询|No enquiry has been sent)/i, `${route}: reload restored prepared state`);
  assert.equal(new URL(page.url()).search, "", `${route}: reload retained a sensitive query`);
  assert.equal(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })).then(value => JSON.stringify(value)), JSON.stringify({ local: [], session: [], cookies: "" }), `${route}: reload left client storage/cookies`);
}

async function assertFooter(route, locale) {
  const footer = page.locator("footer");
  const groups = footer.locator("details");
  assert.equal(await groups.count(), 5, `${route}: Footer must retain five groups`);
  for (let index = 0; index < await groups.count(); index++) {
    const group = groups.nth(index);
    if (!(await group.evaluate(element => element.open))) await group.locator("summary").click();
    assert.equal(await group.evaluate(element => element.open), true, `${route}: Footer group ${index + 1} did not expand`);
  }
  const footerText = await footer.innerText();
  for (const text of locale === "zh"
    ? ["凤启学苑", "ASKWISE", "学苑约课管理系统", "教育与学习平台"]
    : ["Phoenix Academy", "ASKWISE", "Academy booking platform", "Education & learning"]) assert.ok(footerText.includes(text), `${route}: Footer label ${text} is missing`);
  assert.equal(await footer.locator(`a[href="/${locale}/education#academy"]`).count(), 1, `${route}: Academy footer link changed`);
  assert.equal(await footer.locator(`a[href="/${locale}/education#askwise"]`).count(), 1, `${route}: ASKWISE footer link changed`);
  assert.equal(await footer.locator(`a[href="/${locale}/education#academy-booking"]`).count(), 1, `${route}: booking footer link changed`);
  assert.equal(await footer.locator(`a[href="/${locale}/education#consultation"]`).count(), 1, `${route}: contact footer link lost Education context`);
  assert.doesNotMatch(footerText, /启明堂|Qiming Learning/i, `${route}: retired Qiming label remains`);
  assert.equal(await footer.locator('a[href*="admin"],a[href*="dashboard"],a[href*="student"],a[href*="tutor"]').count(), 0, `${route}: Footer exposes an admin/student/tutor route`);
}

try {
  for (const locale of ["zh", "en"]) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      await page.goto(`${origin}/${locale}/education`, { waitUntil: "networkidle" });
      await loaded();
      await assertAccessibleEducationPage(locale, width);
      await assertBrandAssets(`/${locale}/education @ ${width}px`);
      assert.equal(await page.getByTestId("education-service").count(), 4);
      assert.equal(await page.getByTestId("education-value").count(), 5);
      assert.equal(await page.getByTestId("learning-step").count(), 7);
      for (const id of ["education-services", "education-compass", "academy", "academy-booking", "askwise", "family-growth", "consultation"]) assert.equal(await page.locator(`#${id}`).count(), 1, `/${locale}/education: #${id} must be unique`);
      assert.equal(await page.locator("header .is-active[aria-current=\"page\"]").first().innerText(), locale === "zh" ? "教育" : "Education", `/${locale}/education: active Header label changed`);
      assert.equal(await page.locator("header .locale-switch").getAttribute("href"), `/${locale === "zh" ? "en" : "zh"}/education`, `/${locale}/education: locale switch changed route`);
      assert.equal(await page.locator("form,input[type=file],input[type=email]").count(), 0, `/${locale}/education: unexpected native submission/sensitive field`);
      await page.screenshot({ path: resolve(out, `education-${locale}-${width}-full.png`), fullPage: true });
      if (width === 1440 || width === 390) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: resolve(out, `education-${locale}-${width}-hero.png`) });
        await page.locator("#education-compass").scrollIntoViewIfNeeded();
        await page.locator("#education-compass").screenshot({ path: resolve(out, `education-${locale}-${width}-compass.png`) });
        await page.locator("footer").scrollIntoViewIfNeeded();
        await page.locator("footer img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.locator("footer").screenshot({ path: resolve(out, `education-${locale}-${width}-footer.png`) });
      }
      passed(`${locale} ${width}px: route, structure, navigation, assets and no overflow`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/${locale}/education`, { waitUntil: "networkidle" });
    await loaded();
    await page.locator(".mobile-menu summary").click();
    assert.ok(await page.locator(".mobile-menu[open] nav").isVisible(), `${locale}: mobile menu did not open`);
    assert.ok(await page.locator(`.mobile-menu nav a[href="/${locale}/education"]`).isVisible(), `${locale}: mobile Education link is missing`);
    assert.ok(await page.locator(".mobile-menu nav").getByRole("link", { name: locale === "zh" ? /家庭中心/ : /Family Center/ }).isVisible(), `${locale}: mobile Family Center link is missing`);
    await page.locator(".mobile-menu .mobile-locale").click();
    await page.waitForURL(`**/${locale === "zh" ? "en" : "zh"}/education`);
    passed(`${locale}: mobile menu and locale-preserving switch`);

    await page.goto(`${origin}/${locale}/education`, { waitUntil: "networkidle" });
    await loaded();
    await assertServiceDetails(`/${locale}/education`);
    await assertLearningSteps(`/${locale}/education`);
    await assertCompass(`/${locale}/education`);
    await assertConsultation(`/${locale}/education`);
    await assertFooter(`/${locale}/education`, locale);
    await assertContrast("#education-compass h2", `/${locale}/education`, 3);
    await assertContrast('[data-testid="education-consultation"] label', `/${locale}/education`, 4.5);
    await assertContrast('[data-testid="education-consultation"] > p', `/${locale}/education`, 4.5);
    passed(`${locale}: native details, controlled Compass, local consultation, Footer and accessibility checks`);
  }

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(`${origin}/zh/education`, { waitUntil: "networkidle" });
  assert.equal(await noJsPage.locator("h1").count(), 1, "No-JS Education route must retain a readable heading");
  assert.equal(await noJsPage.locator("form,input[type=file],input[type=email]").count(), 0, "No-JS Education route must not expose native submission");
  assert.equal(await noJsPage.getByRole("button", { name: /开始(?:教育规划)?(?:评估|测评)|Start(?: education planning)? assessment/i }).isDisabled(), true, "No-JS controlled Compass action must remain disabled");
  assert.match(await noJsPage.getByTestId("education-preparation-status").innerText(), /(?:尚未发送咨询|No enquiry has been sent)/i, "No-JS local status must remain truthful");
  await noJs.close();
  passed("No-JS route has readable content and no native submission");
  assert.deepEqual(errors, []);
  passed("No browser runtime errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  await page.screenshot({ path: resolve(out, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(resolve(out, "education-browser-results.json"), JSON.stringify({ origin, results }, null, 2));
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ passed: results.filter(result => result.status === "PASS").length, failed: results.filter(result => result.status === "FAIL").length }));
}
