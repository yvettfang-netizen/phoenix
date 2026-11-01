import assert from "node:assert/strict";
import test from "node:test";
import { createV5Worker } from "./worker-fixture.mjs";
import { assertBrandMarkup, assertBrandSource } from "./brand-integrity.mjs";

const origin = "http://localhost";
const request = (worker, path) => worker.dispatchFetch(`${origin}${path}`, {
  headers: { accept: "text/html" },
  redirect: "manual",
});

async function page(worker, path) {
  const response = await request(worker, path);
  return { response, html: await response.text() };
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function assertLocaleCopy(html, locale) {
  const text = visibleText(html);
  if (locale === "zh") {
    // Official brand names and the language switch are allowed; business copy is not bilingual.
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
      "International care resources",
      "Hong Kong",
      "Shenzhen",
    ]) assert.ok(!text.includes(forbidden), `zh page contains English business copy: ${forbidden}`);
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
      "香港",
    ]) assert.ok(!text.includes(forbidden), `en page contains Chinese business copy: ${forbidden}`);
  }
}

function assertNoInternalBusinessData(html, route) {
  const text = visibleText(html);
  assert.doesNotMatch(text, /Founder\s*(?:OS|Dashboard)|内部(?:管理|运营)后台|运营管理后台/i, `${route}: internal Founder links must not be public`);
  assert.doesNotMatch(html, /href=["'][^"']*(?:founder|admin|backoffice|dashboard)[^"']*["']/i, `${route}: internal Founder route leaked`);
  assert.doesNotMatch(text, /(?:\d+(?:\.\d+)?\s*%|[$£¥]\s*\d)/i, `${route}: internal fee or commission figures leaked`);
}

test("Health landing is reachable in both locales with independent metadata and OG tags", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  const zh = await page(worker, "/zh/health");
  const en = await page(worker, "/en/health");
  assert.equal(zh.response.status, 200);
  assert.equal(en.response.status, 200);
  assert.match(zh.html, /data-health-landing/);
  assert.match(en.html, /data-health-landing/);

  assert.match(zh.html, /全球健康与跨境医疗/);
  assert.match(zh.html, /全家人的健康，是更远未来的起点。/);
  assert.match(zh.html, /连接大湾区(?:优质)?医疗资源，让跨境就医更(?:便捷|清晰)、更从容。/);
  assert.match(visibleText(en.html), /Global Health & Cross-Border Medical Services/i);
  assert.match(visibleText(en.html), /Your Family's Health, the Start of a Brighter Tomorrow\./);
  assert.match(en.html, /Access healthcare options across Hong Kong, Shenzhen and the Greater Bay Area/);
  assert.match(zh.html, /property="og:title"/);
  assert.match(en.html, /property="og:title"/);
  assert.match(zh.html, /property="og:description"/);
  assert.match(en.html, /property="og:description"/);
  assert.match(zh.html, /property="og:image"[^>]+health-v31-gba-family\.png/);
  assert.match(en.html, /property="og:image"[^>]+health-v31-gba-family\.png/);
  assert.match(zh.html, /name="twitter:card"[^>]+summary_large_image/);
  assert.match(en.html, /name="twitter:card"[^>]+summary_large_image/);
  assert.match(zh.html, /zh_CN/);
  assert.match(en.html, /en_GB/);
  assert.match(zh.html, /lang=["']zh-Hans["']/);
  assert.match(en.html, /lang=["']en["']/);
  assertLocaleCopy(zh.html, "zh");
  assertLocaleCopy(en.html, "en");
});

test("Health landing contains three controlled entries, six values, five services and shared brand chrome", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());
  const { response, html } = await page(worker, "/zh/health");
  const english = await page(worker, "/en/health");
  assert.equal(response.status, 200);
  assert.equal(english.response.status, 200);

  for (const label of ["家庭健康规划", "大湾区跨境医疗服务", "医疗服务合作伙伴"]) assert.ok(html.includes(label), label);
  for (const label of ["Family health planning", "Greater Bay Area cross-border care", "Medical service partners"]) assert.ok(english.html.includes(label), label);
  for (const label of [
    "深港医疗专家资源",
    "国际化语言服务",
    "更具竞争力的医疗费用",
    "舒适宽敞的住院环境",
    "更便捷的预约安排",
    "保险理赔与后续服务",
  ]) assert.ok(html.includes(label), label);
  assert.match(html, /为什么选择大湾区国际化私立医疗？/);
  assert.match(visibleText(english.html), /Why choose international private healthcare in the Greater Bay Area\?/i);
  const englishStrengthText = visibleText(english.html);
  for (const label of [
    /(?:Hong Kong|Shenzhen).{0,60}(?:specialist|medical) (?:expertise|resources)/i,
    /international language (?:services|support)/i,
    /(?:more )?potentially competitive medical costs/i,
    /comfortable(?: and spacious)?(?: inpatient)? environments/i,
    /more (?:efficient|convenient) appointment (?:arrangements|planning|coordination)/i,
    /insurance claims and (?:continuing|follow-up) (?:support|services)/i,
  ]) assert.match(englishStrengthText, label);
  for (const label of [
    "医疗机构与预约协调",
    "医疗翻译与患者导航",
    "跨境就医安排",
    "在地服务支持",
    "后续跟进与保险理赔协助",
  ]) assert.ok(html.includes(label), label);
  for (const label of [
    "Provider and appointment coordination",
    "Medical interpretation and patient navigation",
    "Cross-border care arrangements",
    "On-the-ground support",
    "Follow-up and insurance claims assistance",
  ]) assert.ok(english.html.includes(label), label);
  for (const label of ["儿童青少年", "成年家庭", "长者照护", "香港", "深圳及大湾区内地城市", "英国及其他海外地区"]) assert.ok(html.includes(label), label);
  for (const label of ["Children and teenagers", "Adult families", "Older family members", "Hong Kong", "Shenzhen and mainland Greater Bay Area cities", "The UK and other overseas regions"]) assert.ok(english.html.includes(label), label);
  assert.match(html, /合作伙伴工作台.{0,80}受控预览/s);
  assert.match(english.html, /Partner workspace.{0,100}Controlled preview/is);
  assert.doesNotMatch(html, /href=["']\/(?:zh|en)\/(?:partner|workbench)[^"']*["']/i, "no unapproved partner workspace route may be invented");

  const servicesAt = html.indexOf('id="services"');
  const crossBorderAt = html.indexOf('id="cross-border-process"');
  const whyAt = html.indexOf('id="why-phoenix"');
  assert.ok(servicesAt >= 0 && whyAt > servicesAt && crossBorderAt > whyAt, "GBA value section and cross-border process must follow the five services");
  const familyAt = html.indexOf('id="family-planning"');
  const process = html.slice(crossBorderAt, familyAt > crossBorderAt ? familyAt : html.length);
  assert.equal((process.match(/<details\b/gi) ?? []).length, 6, "Health landing must retain six native process details");
  assert.equal((html.match(/<details\b/gi) ?? []).length >= 16, true, "Health landing must retain six process details and the FAQ/consultation details");

  assert.match(html, /<header class="site-header[^"]*"/);
  assert.match(html, /\/brand\/official\/v3\/phoenix-nova-header@2x\.png/);
  assertBrandMarkup(html, "/zh/health");
  assert.match(html, /<footer class="site-footer[^\"]*"/);
  assert.match(html, /href="\/zh\/health"[^>]*>健康/);
  assert.match(html, /专业连接，安心同行/);
  assert.match(html, /当前为前端候选预览，正式咨询渠道尚未接通/);
  for (const field of ["当前所在地区", "就医目的地", "服务协调需求", "咨询来源渠道", "保险协调渠道"]) assert.ok(html.includes(field), `missing optional consultation field: ${field}`);
  assert.doesNotMatch(html, /method=["']post["']/i, "consultation preparation must not expose POST");
  assertNoInternalBusinessData(html, "/zh/health");
  assertNoInternalBusinessData(english.html, "/en/health");
});

test("Health Compass remains controlled: off hides assessment and direct route, on enables both", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });

  for (const locale of ["zh", "en"]) {
    const landingOff = await page(off, `/${locale}/health`);
    assert.doesNotMatch(landingOff.html, new RegExp(`href="/${locale}/compass/health"`));
    assert.match(landingOff.html, /health-landing-closed/);
    assert.match(landingOff.html, /href="#services"/);
    assert.match(landingOff.html, /href="#consultation"/);
    assert.equal((await request(off, `/${locale}/compass/health`)).status, 404);

    const landingOn = await page(on, `/${locale}/health`);
    assert.match(landingOn.html, new RegExp(`href="/${locale}/compass/health"`));
    assert.match(landingOn.html, /health-landing-assessment/);
    const compass = await page(on, `/${locale}/compass/health`);
    assert.equal(compass.response.status, 200);
    assert.match(compass.html, /data-health-compass/);
  }

  assert.equal((await request(off, "/compass/health")).status, 404);
  const alias = await request(on, "/compass/health");
  assert.ok([301, 302, 307, 308].includes(alias.status));
  assert.equal(new URL(alias.headers.get("location"), origin).pathname, "/zh/compass/health");
});

test("Health routes do not occupy the backend /health probe and reject invalid locales", async t => {
  const worker = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(() => worker.dispose());
  assert.equal((await request(worker, "/health")).status, 404);
  assert.equal((await request(worker, "/fr/health")).status, 404);
  assert.equal((await request(worker, "/fr/compass/health")).status, 404);
});

test("Compass keeps Education, Identity, Wealth and Health as equal entries with Health service link", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });

  const zhOff = await page(off, "/zh/compass");
  for (const id of ["education", "identity", "wealth", "health"]) assert.match(zhOff.html, new RegExp(`id="${id}"`));
  assert.match(zhOff.html, /href="\/zh\/health"/);
  assert.doesNotMatch(zhOff.html, /href="\/zh\/compass\/health"/);

  const enOn = await page(on, "/en/compass");
  for (const id of ["education", "identity", "wealth", "health"]) assert.match(enOn.html, new RegExp(`id="${id}"`));
  assert.match(enOn.html, /href="\/en\/health"/);
  assert.match(enOn.html, /href="\/en\/compass\/health"/);
});

test("Main site, Compass, Health and Family share the canonical brand rendering", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());
  assertBrandSource();

  for (const locale of ["zh", "en"]) {
    for (const route of ["", "/compass", "/health", "/health/family"]) {
      const path = `/${locale}${route}`;
      const response = await request(worker, path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assertBrandMarkup(html, path);
    }
  }
});
