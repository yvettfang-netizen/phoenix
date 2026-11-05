import assert from "node:assert/strict";
import test from "node:test";
import { createV5Worker } from "./worker-fixture.mjs";

const origin = "http://localhost";
const request = (worker, path, init = {}) => worker.dispatchFetch(`${origin}${path}`, {
  headers: { accept: "text/html", ...(init.headers ?? {}) },
  redirect: "manual",
  ...init,
});

async function page(worker, path) {
  const response = await request(worker, path);
  return { response, html: await response.text() };
}

function renderedMarkup(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

function visibleText(html) {
  return renderedMarkup(html)
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceBetweenIds(html, startId, nextId) {
  const start = html.indexOf(`id="${startId}"`);
  assert.ok(start >= 0, `missing ${startId} section`);
  const end = html.indexOf(`id="${nextId}"`, start + startId.length + 5);
  assert.ok(end > start, `missing section boundary after ${startId}`);
  return html.slice(start, end);
}

const insurers = {
  zh: ["Manulife 宏利", "AIA 友邦", "Prudential 保诚", "AXA 安盛", "Bupa 保柏", "Sun Life 永明", "FWD 富卫", "BOC Life 中银人寿", "China Life 中国人寿", "Cigna 信诺", "HSBC Life 汇丰保险"],
  en: ["Manulife", "AIA", "Prudential", "AXA", "Bupa", "Sun Life", "FWD", "BOC Life", "China Life", "Cigna", "HSBC Life"],
};

const specialties = {
  zh: ["骨科与关节中心", "肿瘤精准治疗", "乳腺与女性健康", "胃肠内窥镜"],
  en: ["Orthopaedics & joints", "Precision oncology", "Breast & women's health", "Gastrointestinal endoscopy"],
};

test("Health V6 exposes a post-APEC launch plan with explicit boundaries in both locales", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health`);
    assert.equal(response.status, 200, `/${locale}/health`);
    assert.match(html, /noindex/i);
    const section = sliceBetweenIds(html, "brand-origin", "health-entry-title");
    const text = visibleText(section);
    assert.match(text, /APEC/i);
    assert.match(text, locale === "zh" ? /会后|计划启动|首发/ : /Post-APEC|after APEC|planned|launching/i);
    assert.match(text, locale === "zh" ? /无关|不构成|独立/ : /independent|not.*(?:partner|official|designated|sponsor)/i);
    assert.doesNotMatch(text, /倒计时|报名|开幕|活动预告|18.?19|countdown|registration|opening ceremony|event preview/i);
    assert.doesNotMatch(text, /\b(?:is|as|an?)\s+(?:an?\s+)?(?:official\s+APEC\s+(?:partner|project)|APEC[- ]designated\s+medical\s+service|APEC\s+sponsor)\b/i);
    assert.doesNotMatch(text, /(?:是|为|作为).{0,20}APEC.{0,30}(?:官方合作伙伴|官方项目|指定医疗服务|赞助方)/i);
  }
});

test("Health V6 insurance selector is local, unverified and does not infer brand coverage", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health`);
    assert.equal(response.status, 200);
    assert.match(html, /data-testid="health-v6-insurance"/);
    const markup = renderedMarkup(html);
    const text = visibleText(markup);
    for (const insurer of insurers[locale]) assert.ok(text.includes(insurer), `${locale}: missing insurer ${insurer}`);
    assert.match(text, /UNVERIFIED/i);
    assert.match(text, locale === "zh" ? /请提供具体保险计划，由顾问进一步核实/ : /specific insurance plan.*further adviser verification/i);
    assert.match(text, locale === "zh" ? /品牌层级不会自动继承/ : /brand-level selection never inherits/i);
    assert.match(text, locale === "zh" ? /不接收保单、病历、证件/ : /does not receive policies, medical records, identity documents/i);
    assert.match(text, locale === "zh" ? /不发送网络请求|不会提交咨询/ : /no network request|does not submit an enquiry/i);
    assert.doesNotMatch(markup, /<input[^>]+type=["']file["']/i);
    assert.doesNotMatch(markup, /method=["']post["']|action=["'][^"']+api|coverage[^<]{0,40}(?:approved|covered|eligible)/i);
    assert.ok((markup.match(/data-testid="health-v6-insurance-brand"/g) ?? []).length >= 1);
    assert.ok((markup.match(/data-testid="health-v6-insurance-specialty"/g) ?? []).length >= 1);
  }
});

test("Health V6 includes four specialty areas and boundary-safe clinical planning copy", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health`);
    assert.equal(response.status, 200);
    const text = visibleText(html);
    for (const specialty of specialties[locale]) assert.ok(text.includes(specialty), `${locale}: missing specialty ${specialty}`);
    assert.match(text, locale === "zh" ? /由医疗机构|医生决定|适合性|待核实/ : /provider|doctor|clinician|suitability|confirm/i);
    assert.doesNotMatch(text, locale === "zh" ? /保证治疗效果|统一承诺.{0,20}(?:出院|下床|完成)|固定疗效/ : /guaranteed treatment outcome|all patients|fixed recovery|guaranteed discharge/i);
    assert.doesNotMatch(text, /<input[^>]+type=["']file["']/i);
  }
});

test("Health V6 retains six-step coordination, FAQ coverage and noindex in both locales", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());

  for (const locale of ["zh", "en"]) {
    const { response, html } = await page(worker, `/${locale}/health`);
    assert.equal(response.status, 200);
    const markup = renderedMarkup(html);
    const text = visibleText(markup);
    const processStart = markup.indexOf('id="cross-border-process"');
    const familyStart = markup.indexOf('id="family-planning"', processStart + 1);
    const process = processStart >= 0 ? markup.slice(processStart, familyStart > processStart ? familyStart : markup.length) : markup;
    assert.equal((process.match(/<details\b/gi) ?? []).length, 6, `${locale}: six coordination steps required`);
    assert.match(text, locale === "zh" ? /线上咨询|患者授权|专科评估|诊疗方案|医疗文件|理赔协助/ : /consultation|patient authori[sz]ation|specialist assessment|care plan|medical documents|claims assistance/i);
    assert.match(text, locale === "zh" ? /常见问题|FAQ|隐私/ : /FAQ|privacy/i);
    assert.ok((markup.match(/<details\b/gi) ?? []).length >= 18, `${locale}: FAQ and process details should render`);
    const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
    assert.match(robots, /noindex/i);
    assert.doesNotMatch(markup, /method=["']post["']/i);
  }
});

test("Health V6 preserves Compass flag behavior", async t => {
  const off = createV5Worker();
  const on = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" });
  t.after(async () => { await off.dispose(); await on.dispose(); });
  for (const locale of ["zh", "en"]) {
    assert.equal((await request(off, `/${locale}/compass/health`)).status, 404);
    assert.equal((await request(on, `/${locale}/compass/health`)).status, 200);
    const landingOff = await page(off, `/${locale}/health`);
    const landingOn = await page(on, `/${locale}/health`);
    assert.match(landingOff.html, /health-landing-closed/);
    assert.doesNotMatch(landingOff.html, new RegExp(`href="/${locale}/compass/health"`));
    assert.match(landingOn.html, new RegExp(`href="/${locale}/compass/health"`));
  }
});
