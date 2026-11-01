/** Synthetic browser QA against the actual built worker; not physical-device acceptance.
 * Set PLAYWRIGHT_MODULE to an installed playwright module directory when it is not local.
 * Start scripts/health-preview-server.mjs separately. Default switch remains off.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BRAND_FOOTER_SIZE,
  BRAND_FOOTER_URL,
  BRAND_HEADER_SIZE,
  BRAND_HEADER_URL,
} from "./brand-integrity.mjs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href : "playwright");
const origin = process.env.HEALTH_ORIGIN || "http://127.0.0.1:4387";
const out = resolve(process.env.HEALTH_EVIDENCE_DIR || "outputs/health-landing");
const IVORY_SURFACE = "rgb(248, 246, 241)";
const BRAND_ASSETS = {
  header: { url: BRAND_HEADER_URL, ...BRAND_HEADER_SIZE, wrapperBackground: IVORY_SURFACE },
  footer: { url: BRAND_FOOTER_URL, ...BRAND_FOOTER_SIZE, wrapperBackground: "transparent" },
};
const FOOTER_SURFACE = IVORY_SURFACE;
const TRANSPARENT = new Set(["transparent", "rgba(0, 0, 0, 0)"]);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HEALTH_BROWSER_PATH ? { executablePath: process.env.HEALTH_BROWSER_PATH } : {}) });
const results = [];
const passed = name => results.push({ name, status: "PASS" });

async function assertLocaleSurface(page, locale, route) {
  const text = await page.locator("main").innerText();
  assert.equal(await page.locator('html').getAttribute('lang'), locale === 'zh' ? 'zh-Hans' : 'en');
  assert.equal(locale === "zh" ? text.includes("连接大湾区优质医疗资源，让跨境就医更便捷、更从容。") : text.includes("Access healthcare options across Hong Kong, Shenzhen and the Greater Bay Area with greater clarity and confidence."), true, `${route}: approved Hero subtitle is missing`);
  assert.equal(locale === "zh" ? text.includes("为什么选择大湾区国际化私立医疗？") : /Why choose international private healthcare in the Greater Bay Area\?/i.test(text), true, `${route}: GBA value title is missing`);
  if (locale === "zh") {
    for (const forbidden of [
      "Global Health & Cross-Border Medical Services",
      "Family Health Planning",
      "Explore Cross-Border Medical Services",
      "Explore Cross-Border Care",
      "FIVE COORDINATION SERVICES",
      "WHY CHOOSE",
      "GREATER BAY AREA",
      "Health Compass",
      "Family Center",
      "Partner workspace",
      "Hong Kong",
      "Shenzhen",
    ]) assert.ok(!text.includes(forbidden), `${route}: zh page contains English business copy ${forbidden}`);
  } else {
    for (const forbidden of [
      "全球健康与跨境医疗",
      "全家人的健康，是更远未来的起点。",
      "家庭健康规划",
      "了解跨境医疗服务",
      "医疗机构与预约协调",
      "健康罗盘",
      "合作伙伴工作台",
      "家庭中心",
    ]) assert.ok(!text.includes(forbidden), `${route}: en page contains Chinese business copy ${forbidden}`);
  }
  const hrefs = await page.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href") || ""));
  assert.equal(hrefs.some(href => /(?:founder|admin|backoffice|dashboard)/i.test(href)), false, `${route}: internal Founder route leaked`);
  assert.equal(/(?:\d+(?:\.\d+)?\s*%|[$£¥]\s*\d)/i.test(text), false, `${route}: internal fee or commission figures leaked`);
}

async function assertHealthSurface(page, locale, route) {
  assert.equal(await page.locator('section[aria-labelledby="health-entry-title"] article').count(), 3, `${route}: three public entry cards required`);
  assert.ok(await page.locator('[data-testid="health-strengths"] article').count() >= 4, `${route}: core value cards are missing`);
  assert.equal(await page.locator("#why-phoenix article").count(), 6, `${route}: six medical advantage cards required`);
  assert.equal(await page.locator("#services article").count(), 5, `${route}: five coordination service cards required`);
  assert.equal(await page.locator("#cross-border-process details").count(), 6, `${route}: six cross-border process details required`);
  assert.equal(await page.locator("#partners").count(), 1, `${route}: partner section missing`);
  assert.equal(await page.locator('#partners button:disabled').count(), 1, `${route}: partner workspace must remain controlled`);
  assert.equal(await page.locator(`a[href="/${locale}/family-center"]`).count() >= 1, true, `${route}: Family Center route missing`);
  await assertLocaleSurface(page, locale, route);
}

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
      wrapperBorder: wrapperStyle?.borderTopWidth || "",
      imageBackground: style.backgroundColor,
      imageBorder: style.borderTopWidth,
      imageFilter: style.filter,
    };
  });
  const expected = { ...BRAND_ASSETS[role], wrapperBackground: role === 'header' && /^\/(?:zh|en)\/health$/.test(route.split(' ')[0]) ? 'transparent' : BRAND_ASSETS[role].wrapperBackground };
  assert.ok(details.src.includes(expected.url), `${route}: ${role} must use ${expected.url}`);
  assert.ok(!/phoenix-nova-(?:logo-master|mark-official|logo-official|official-logo-system-v1)\.png/i.test(details.src), `${route}: legacy mark/logo is still rendered`);
  assert.equal(details.naturalWidth, expected.width, `${route}: ${role} asset width changed`);
  assert.equal(details.naturalHeight, expected.height, `${route}: ${role} asset height changed`);
  assert.ok(details.width > 0 && details.height > 0, `${route}: ${role} image has no rendered box`);
  assert.equal(details.objectFit, "contain", `${route}: ${role} must use object-fit: contain`);
  assert.ok(Math.abs((details.width / details.height) - (details.naturalWidth / details.naturalHeight)) < 0.01, `${route}: ${role} image is cropped or distorted`);
  if (expected.wrapperBackground === "transparent") {
    assert.ok(TRANSPARENT.has(details.wrapperBackground), `${route}: ${role} wrapper must remain transparent`);
  } else {
    assert.equal(details.wrapperBackground, expected.wrapperBackground, `${route}: ${role} wrapper must use the Phoenix Ivory surface`);
  }
  assert.ok(!["hidden", "clip"].includes(details.wrapperOverflow), `${route}: ${role} wrapper must not crop its image`);
  assert.equal(details.wrapperBorder, "0px", `${route}: ${role} wrapper must not frame its image`);
  assert.equal(details.imageBorder, "0px", `${route}: ${role} must not have an image border`);
  assert.ok(TRANSPARENT.has(details.imageBackground), `${route}: ${role} image must have no background fill`);
  assert.equal(details.imageFilter, "none", `${route}: ${role} official colours must not be filtered`);
  assert.ok(details.left >= -1 && details.right <= width + 1, `${route} ${width}px: ${role} image leaves the viewport`);
  return details;
}

async function assertSharedBrandChrome(page, route, width) {
  // Footer branding is intentionally lazy; make it visible before decoding.
  await page.locator("footer").scrollIntoViewIfNeeded();
  await inspectBrandImage(page.locator("header .brand-mark img"), route, "header", width);
  const footer = await inspectBrandImage(page.locator("footer .brand-mark img"), route, "footer", width);
  const expectedFooterWidth = /^\/(?:zh|en)\/health$/.test(route.split(' ')[0]) ? (width <= 700 ? 165 : 220) : (width <= 680 ? 165 : 210);
  assert.ok(Math.abs(footer.width - expectedFooterWidth) < 0.5, `${route} ${width}px: Footer brand must be ${expectedFooterWidth}px wide`);
  assert.equal(await page.locator("footer.site-footer").evaluate(element => getComputedStyle(element).backgroundColor), FOOTER_SURFACE, `${route}: Footer must use the Phoenix Ivory surface`);
  assert.equal(await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').count(), 0, `${route}: favicon markup must remain disabled`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} ${width}px horizontal overflow`);
}

async function assertCompassHeader(page, route, width) {
  await inspectBrandImage(page.locator("header .brand-mark img"), route, "header", width);
  assert.equal(await page.locator("footer .brand-mark img").count(), 0, `${route}: questionnaire must not invent a second footer brand image`);
  assert.equal(await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').count(), 0, `${route}: favicon markup must remain disabled`);
}

function expectedPrimaryHrefs(locale) {
  return [
    `/${locale}`,
    `/${locale}/education`,
    `/${locale}/identity`,
    `/${locale}/compass#wealth`,
    `/${locale}/health`,
    `/${locale}/about`,
    `/${locale}/insights`,
  ];
}

async function assertPrimaryNavigation(page, locale, { mobile = false } = {}) {
  const expected = expectedPrimaryHrefs(locale);
  const links = page.locator(mobile ? ".mobile-menu nav > a" : ".desktop-nav > a");
  if (mobile) {
    const menu = page.locator(".mobile-menu");
    if (!(await menu.evaluate(element => element.open))) await page.locator(".mobile-menu summary").click();
    assert.ok(await page.locator(".mobile-menu nav").isVisible(), `${locale}: mobile navigation is not visible`);
    assert.equal(await links.count(), 10, `${locale}: mobile navigation includes seven primary links, Family Center, partner introduction and locale switch`);
  } else {
    assert.ok(await links.first().isVisible(), `${locale}: desktop navigation is not visible`);
    assert.equal(await links.count(), 7, `${locale}: desktop navigation must contain seven primary links`);
  }
  const hrefs = await links.evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute("href")));
  assert.deepEqual(hrefs.slice(0, expected.length), expected, `${locale}: primary navigation hrefs changed`);
  if (mobile) {
    assert.equal(hrefs[7], `/${locale}/family-center`, `${locale}: mobile Family Center href changed`);
    assert.equal(hrefs[8], '#partners');
    assert.equal(hrefs[9], `/${locale === "zh" ? "en" : "zh"}/health`, `${locale}: mobile locale href must preserve Health`);
    await page.locator(".mobile-menu summary").click();
  }
}

async function assertCrossBorderProcess(page, route) {
  const process = page.locator("#cross-border-process");
  assert.equal(await process.count(), 1, `${route}: #cross-border-process must be unique`);
  assert.ok(await process.isVisible(), `${route}: #cross-border-process must be visible`);
  const order = await page.evaluate(() => {
    const services = document.querySelector("#services");
    const crossBorder = document.querySelector("#cross-border-process");
    const why = document.querySelector("#why-phoenix");
    return {
      servicesBeforeWhy: Boolean(services && why && (services.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING)),
      whyBeforeCrossBorder: Boolean(why && crossBorder && (why.compareDocumentPosition(crossBorder) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });
  assert.equal(order.servicesBeforeWhy, true, `${route}: GBA value section must follow services`);
  assert.equal(order.whyBeforeCrossBorder, true, `${route}: cross-border process must follow GBA values`);

  const details = process.locator("details");
  assert.equal(await details.count(), 6, `${route}: cross-border process must expose six native details`);
  for (let index = 0; index < 6; index++) {
    const detail = details.nth(index);
    assert.equal(await detail.evaluate(element => element.tagName), "DETAILS", `${route}: process item ${index + 1} is not native details`);
    assert.equal(await detail.locator("summary").count(), 1, `${route}: process item ${index + 1} needs one summary`);
    await detail.locator("summary").click();
    assert.equal(await detail.evaluate(element => element.open), true, `${route}: process item ${index + 1} did not open`);
  }
}

async function assertConsultationPreparation(page, locale) {
  const context = page.locator("#consultation details");
  assert.equal(await context.count(), 1, `${locale}: optional conversation context details missing`);
  await context.locator("summary").click();
  const fieldSpecs = [
    { key: "region", label: /当前所在地区|Current region/i, names: ["client_region", "current_region", "currentregion"] },
    { key: "destination", label: /就医目的地|医疗目的地|Care destination|Destination/i, names: ["care_destination", "destination", "careDestination"] },
    { key: "needs", label: /服务协调需求|服务需求|Coordination needs|Service needs/i, names: ["service_needs", "coordination_needs", "needs"] },
    { key: "source", label: /咨询来源渠道|来源渠道|Referral source/i, names: ["referral_source", "source"] },
    { key: "insurance", label: /保险协调渠道|保险渠道|Insurance (?:coordination )?channel/i, names: ["insurance_channel", "insurance"] },
  ];
  const fields = {};
  for (const spec of fieldSpecs) {
    let field = page.getByLabel(spec.label).first();
    if (await field.count() === 0) {
      for (const name of spec.names) {
        const candidate = page.locator(`select[name="${name}"]`).first();
        if (await candidate.count()) { field = candidate; break; }
      }
    }
    assert.equal(await field.count(), 1, `${locale}: optional consultation field ${spec.key} is missing`);
    assert.equal(await field.evaluate(element => element.tagName), "SELECT", `${locale}: ${spec.key} must be a select`);
    assert.equal(await field.evaluate(element => element.required), false, `${locale}: ${spec.key} must be optional`);
    assert.equal(await field.inputValue(), "", `${locale}: ${spec.key} must start empty`);
    fields[spec.key] = field;
  }
  const service = page.locator("#consultation select").first();
  assert.equal(await service.count(), 1, `${locale}: consultation service field missing`);
  assert.equal(await service.inputValue(), "", `${locale}: service must start empty`);

  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.locator("footer img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => scrollTo(0, 0));
  const requests = [];
  const onRequest = request => requests.push(request.url());
  page.on("request", onRequest);
  await fields.source.selectOption({ index: 1 });
  for (const key of ["region", "destination", "needs", "insurance"]) assert.equal(await fields[key].inputValue(), "", `${locale}: source selection inferred ${key}`);
  await service.selectOption({ index: 1 });
  await page.locator('[data-testid="health-consultation-prepare"]').click();
  const referralOnlyStatus = await page.getByTestId("health-consultation-status").innerText();
  assert.match(referralOnlyStatus, locale === "zh" ? /来源渠道/ : /Referral source/i);
  const selected = { source: await fields.source.inputValue() };
  for (const key of ["region", "destination", "needs", "insurance"]) {
    await fields[key].selectOption({ index: 1 });
    selected[key] = await fields[key].inputValue();
    assert.notEqual(selected[key], "", `${locale}: ${key} selection did not stick`);
    for (const other of Object.keys(selected)) assert.equal(await fields[other].inputValue(), selected[other], `${locale}: ${key} changed ${other}`);
  }

  await page.locator('[data-testid="health-consultation-prepare"]').click();
  const status = page.getByTestId("health-consultation-status");
  const statusText = await status.innerText();
  assert.match(statusText, locale === "zh" ? /尚未发送咨询/ : /No enquiry has been sent/);
  assert.ok(statusText.trim().length > 0, `${locale}: prepared checklist is empty`);
  assert.equal(requests.length, 0, `${locale}: consultation preparation must not send requests`);
  assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })), { local: [], session: [], cookies: "" });

  await fields.region.selectOption({ index: 2 });
  assert.equal((await status.innerText()).trim(), "", `${locale}: changing context must clear prepared state`);
  await fields.region.selectOption({ index: 1 });
  await page.locator('[data-testid="health-consultation-prepare"]').click();
  await page.getByTestId("health-consultation-status").locator('button[type="button"]').click();
  assert.equal(await service.inputValue(), "", `${locale}: clear selection did not reset service`);
  for (const [key, field] of Object.entries(fields)) assert.equal(await field.inputValue(), "", `${locale}: clear selection did not reset ${key}`);
  assert.equal((await status.innerText()).trim(), "", `${locale}: clear selection did not hide prepared state`);
  assert.equal(requests.length, 0, `${locale}: clearing consultation preparation must not send requests`);
  assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie })), { local: [], session: [], cookies: "" });

  page.off("request", onRequest);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#consultation select").first().inputValue(), "", `${locale}: refresh did not reset service`);
  for (const spec of fieldSpecs) {
    const field = page.getByLabel(spec.label).first();
    assert.equal(await field.inputValue(), "", `${locale}: refresh did not reset ${spec.key}`);
  }
  assert.equal((await page.getByTestId("health-consultation-status").innerText()).trim(), "", `${locale}: refresh restored prepared state`);
  passed(`${locale} consultation fields stay independent, local and resettable`);
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
      assert.match(await page.locator("h1").innerText(), locale === "zh" ? /全家人的健康/ : /Your family's health/i);
      await assertHealthSurface(page, locale, `/${locale}/health ${width}px`);
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
      // Playwright's actionability check fails if a floating tool intercepts the entry.
      await page.locator(process.env.HEALTH_EXPECT_ENABLED === "1" ? '[data-testid="health-landing-assessment"]' : '#health-compass a[href="#services"]').click({ trial: true });
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
      if (width === 390) {
        await assertPrimaryNavigation(page, locale, { mobile: true });
        await assertCrossBorderProcess(page, `/${locale}/health`);
      }
      if (width === 1440) {
        await assertPrimaryNavigation(page, locale);
        await assertCrossBorderProcess(page, `/${locale}/health`);
      }
    }
    await assertConsultationPreparation(page, locale);
    assert.ok(await page.locator("#regions").isVisible(), `${locale}: regions content remains hidden`);
    const faq = page.locator('section[aria-labelledby="faq-title"] details');
    assert.equal(await faq.count(), 10, `${locale}: ten public FAQ items are required`);
    await faq.first().locator("summary").click();
    assert.equal(await faq.first().evaluate(element => element.open), true, `${locale}: FAQ did not open`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/${locale}/health#consultation`, { waitUntil: "networkidle" });
    await page.locator(".mobile-menu summary").click();
    assert.ok(await page.locator(".mobile-menu[open] nav").isVisible());
    await page.locator('.mobile-menu a[href="#partners"]').click();
    await page.waitForURL(`**/${locale}/health#partners`);
    assert.equal(await page.locator(".mobile-menu").evaluate(element => element.open), false, "Partner introduction must close the mobile menu");
    await page.goto(`${origin}/${locale}/health#consultation`, { waitUntil: "networkidle" });
    await page.locator(".mobile-menu summary").click();
    await page.locator(".mobile-menu .mobile-locale").click();
    await page.waitForURL(`**/${locale === "zh" ? "en" : "zh"}/health#consultation`);
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
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  for (const locale of ["zh", "en"]) {
    await noScriptPage.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
    const submit = noScriptPage.locator('[data-testid="health-consultation-prepare"]');
    const noJsService = noScriptPage.locator("#consultation select").first();
    const noJsSource = noScriptPage.getByLabel(/咨询来源渠道|来源渠道|Referral source/i).first();
    assert.equal(await submit.isDisabled(), true, "No native submit before the local handler is attached");
    await noScriptPage.locator('#consultation details summary').click();
    await noJsService.selectOption({ index: 1 });
    await noJsSource.selectOption({ index: 1 });
    await noScriptPage.locator('footer').scrollIntoViewIfNeeded();
    await noScriptPage.locator('footer img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await noScriptPage.waitForLoadState('networkidle');
    const transmissions = [];
    const recordRequest = request => transmissions.push(request.url());
    noScriptPage.on('request', recordRequest);
    await noJsSource.press('Enter');
    assert.equal(await submit.isDisabled(), true);
    assert.deepEqual(transmissions, [], 'No-JS form must not transmit fields through a native GET');
    noScriptPage.off('request', recordRequest);
    assert.equal(new URL(noScriptPage.url()).search, '');
  }
  await noScriptContext.close();
  passed("No-JS consultation remains disabled without URL or network transmission");
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
