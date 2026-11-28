import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createV5Worker } from "./worker-fixture.mjs";
import { assertBrandMarkup, assertBrandSource } from "./brand-integrity.mjs";

const request = (worker, path) => worker.dispatchFetch(`http://localhost${path}`, {
  headers: { accept: "text/html" },
  redirect: "manual",
});

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasAttribute = (tag, attribute, value) => {
  const expected = value === undefined ? `\\b${attribute}(?:\\s*=|\\s|>)` : `\\b${attribute}=[\"']${escapeRegExp(value)}[\"']`;
  return new RegExp(`<${tag}\\b[^>]*${expected}`, "i");
};
const testIdCount = (html, id) => (html.match(new RegExp(`data-testid=[\"']${escapeRegExp(id)}[\"']`, "gi")) ?? []).length;
const educationLanding = html => /data-education-landing(?:[=\s>])/i.test(html);
const unavailableCopy = /(?:尚未|暂未|未开放|未接通|不可用|not open|not connected|unavailable|not available)/i;
const noQuestionnaireRoute = /href=["'][^"']*\/education\/(?:assessment|result|questionnaire)(?:["'/?#])/i;
const noSensitiveField = /<form\b|type=["'](?:file|email|tel|password)["']|name=["'](?:student|email|passport|identity|phone)/i;

function assertSeoMarkup(html, locale) {
  assert.match(html, /<title>[^<]+<\/title>/i, `${locale}: document title is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["'][^"']+)[^>]*>/i, `${locale}: description metadata is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bproperty=["']og:title["'])(?=[^>]*\bcontent=["'][^"']+)[^>]*>/i, `${locale}: og:title metadata is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bproperty=["']og:description["'])(?=[^>]*\bcontent=["'][^"']+)[^>]*>/i, `${locale}: og:description metadata is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bproperty=["']og:image["'])(?=[^>]*\bcontent=["'][^"']*education-hero)[^>]*>/i, `${locale}: education Open Graph image is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bname=["']twitter:card["'])(?=[^>]*\bcontent=["']summary_large_image["'])[^>]*>/i, `${locale}: Twitter card metadata is missing`);
  assert.match(html, /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i, `${locale}: candidate route must remain noindex`);
}

function assertLocaleNavigation(html, locale) {
  const otherLocale = locale === "zh" ? "en" : "zh";
  // Lookaheads deliberately make this independent of SSR attribute ordering.
  assert.match(html, new RegExp(`<a\\b(?=[^>]*\\bhref=["']/${locale}/education["'])(?=[^>]*\\baria-current=["']page["'])[^>]*>`, "i"), `${locale}: Education header link is not the active page`);
  assert.match(html, new RegExp(`<a\\b(?=[^>]*\\bhref=["']/${otherLocale}/education["'])[^>]*>`, "i"), `${locale}: locale switch does not preserve Education`);
}

function assertEducationStructure(html, locale) {
  assert.ok(educationLanding(html), `${locale}: data-education-landing marker is missing`);
  assert.match(html, /href=["\']#education-packages["\']/, `${locale}: primary pricing CTA missing`);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${locale}: Education needs one h1`);
  assert.equal(testIdCount(html, "education-service"), 4, `${locale}: Education needs four services`);
  assert.equal(testIdCount(html, "education-pricing-package"), 3, "Education pricing retains undergraduate launch and two other-stage cards");
  assert.equal(testIdCount(html, "masters-pricing"), 1, "Masters pricing must be unique");
  assert.equal(testIdCount(html, "shared-signature-pricing"), 1, "One shared undergraduate and masters signature section");
  assert.equal(testIdCount(html, "application-fee-journey"), 1, "Application fee journey must be unique");
  assert.equal(testIdCount(html, "education-pricing-terms"), 1, "Education pricing must explain service boundaries once");
  assert.equal(testIdCount(html, "gaokao-pricing"), 1, "Gaokao pricing section must be unique");
  for (const id of ["gaokao-plan-b", "gaokao-plan-c", "gaokao-plan-d"]) assert.equal(testIdCount(html, id), 1, `Missing Gaokao tier: ${id}`);
  for (const id of ["primary", "gaokao-hk-undergraduate", "masters-standard", "masters-vip", "tailored", "research"]) {
    assert.equal((html.match(new RegExp(`\\bid=["']education-package-${id}["']`, "gi")) ?? []).length, 1, `Package anchor missing: ${id}`);
  }
  assert.equal(testIdCount(html, "education-value"), 5, `${locale}: Education needs five values`);
  assert.equal(testIdCount(html, "learning-step"), 7, `${locale}: Education needs seven ordered learning steps`);
  assert.equal(testIdCount(html, "education-consultation"), 1, `${locale}: Education consultation panel must be unique`);
  assert.equal(testIdCount(html, "education-preparation-status"), 1, `${locale}: Education preparation status must be unique`);
  for (const id of ["education-services", "education-compass", "academy", "academy-booking", "askwise", "family-growth", "consultation"]) {
    assert.equal((html.match(new RegExp(`\\bid=["']${escapeRegExp(id)}["']`, "gi")) ?? []).length, 1, `${locale}: #${id} must be unique`);
  }
  const servicesAt = html.indexOf('id="education-services"');
  const packagesAt = html.indexOf('id="education-packages"');
  const compassAt = html.indexOf('id="education-compass"');
  const academyAt = html.indexOf('id="academy"');
  assert.ok(servicesAt >= 0 && servicesAt < packagesAt && packagesAt < compassAt && compassAt < academyAt, "Education pricing order changed");
  const pricing = html.slice(packagesAt, compassAt);
  const a = pricing.indexOf('id="education-package-gaokao-hk-undergraduate"');
  const b = pricing.indexOf('id="education-package-gaokao-dual"');
  const c = pricing.indexOf('id="education-package-gaokao-gba"');
  const d = pricing.indexOf('id="education-package-gaokao-global"');
  const other = pricing.indexOf('id="education-masters-pricing"');
  assert.ok(a >= 0 && a < b && b < c && c < d && d < other, "Gaokao ladder order must be A/B/C/D before other services");
  for (const [part, price, count] of [[pricing.slice(a,b), "19,800", 4], [pricing.slice(b,c), "39,800", 6], [pricing.slice(c,d), "49,800", 10], [pricing.slice(d,other), "69,800", 16]]) {
    assert.ok(part.includes((locale === "zh" ? "¥" : "RMB ") + price), `Missing Gaokao fee ${price}`);
    assert.ok(part.includes(locale === "zh" ? count + "所院校" : count + " institutions"), `Missing Gaokao quota ${count}`);
  }
  assert.ok(pricing.slice(c,d).includes(locale === "zh" ? "重点推荐" : "RECOMMENDED"), "Plan C recommendation missing");
  assert.ok(pricing.includes(locale === "zh" ? "全国统一收费" : "Nationwide standard fees"), "Nationwide undergraduate pricing label missing");
  assert.doesNotMatch(pricing.slice(a,d), /潮州|Chaozhou|regional offer/i, "Undergraduate fees must not be geographically restricted");
  assert.ok(pricing.slice(d,other).includes(locale === "zh" ? "不含内地综评" : "no mainland comprehensive evaluation"), "Plan D must exclude mainland comprehensive evaluation");
  assert.ok(pricing.includes(locale === "zh" ? "¥39,980" : "RMB 39,980"), "Approved Standard price is missing");
  const m = ["masters-launch","masters-standard","masters-vip","tailored"].map(id=>pricing.indexOf('id="education-package-'+id+'"'));
  const endMasters = pricing.indexOf('id="education-package-primary"');
  assert.ok(other < m[0] && m[0] < m[1] && m[1] < m[2] && m[2] < m[3] && m[3] < endMasters, "Masters tier order");
  for(const [i, amount] of ["19,800","39,800","80,000","100,000"].entries()) {
    assert.ok(pricing.slice(m[i],m[i+1] ?? endMasters).includes((locale === "zh" ? "¥" : "RMB ")+amount), "Missing masters tier "+amount);
  }
  assert.ok(pricing.slice(m[0],m[1]).includes(locale === "zh" ? "最多4所院校、8个专业申请项目" : "up to 4 institutions and 8 programme applications"), "Masters launch quota");
  assert.ok(pricing.slice(m[1],m[2]).includes(locale === "zh" ? "最多6所院校、12个专业申请项目" : "Up to 6 institutions and 12 programme applications"), "Masters premium quota");
  for (const id of ["a","b","c","d"]) assert.equal(testIdCount(html, "masters-refund-"+id), 1, "Refund tier missing: "+id);
  assert.equal(testIdCount(html, "masters-risk-sharing"), 1, "Risk-sharing terms missing");
  for (const [part, amounts] of [[pricing.slice(m[0],m[1]),["8,000","11,800"]],[pricing.slice(m[1],m[2]),["3,000","36,800"]]]) for (const amount of amounts) assert.ok(part.includes(amount), "Refund amount missing "+amount);
  for (const part of [pricing.slice(m[2],m[3]),pricing.slice(m[3],endMasters)]) assert.ok(part.includes(locale === "zh" ? "服务费全额退还" : "Full service-fee refund"), "Full refund wording missing");
  assert.ok(pricing.slice(m[3],endMasters).includes(locale === "zh" ? "本科定制退款条款另行书面约定" : "Undergraduate bespoke refund terms are agreed separately"), "Undergraduate scope must be separate");
  assert.doesNotMatch(pricing.slice(a,other), /data-testid="masters-refund-/, "Do not attach masters refunds to undergraduate tiers");
  assert.ok(pricing.slice(m[3],endMasters).includes(locale === "zh" ? "名校定制服务" : "Bespoke Selective Admissions"), "Shared specialist positioning");
  assert.ok(pricing.slice(m[3],endMasters).includes(locale === "zh" ? "本科与硕士全国统一10万元起" : "for both undergraduate and master’s admissions"), "Shared signature applicability");
  assert.ok(pricing.slice(d,other).includes('href="#education-package-tailored"'), "Undergraduate must link to shared signature");
  assert.ok(pricing.slice(m[2],m[3]).includes('href="#education-package-tailored"'), "Masters must link to shared signature");
  assert.doesNotMatch(pricing, /89,980/, "Superseded master's VIP price");
  assert.ok(pricing.includes(locale === "zh" ? "并非强制逐项购买" : "not mandatory sequential purchases"), "Assessment fees are optional");
  assert.ok(pricing.includes(locale === "zh" ? "评估后书面报价" : "Written quote after assessment"), "Custom tiers must remain scoped quotations");
  assert.ok(pricing.includes(locale === "zh" ? "不保证录取" : "admission is not guaranteed"), "Non-guarantee wording is missing");
  assert.ok(!pricing.includes("<form") && !pricing.includes('href="/checkout') && !pricing.includes('href="/payment'), "Pricing preview cannot expose a checkout or payment route");
  assert.ok(pricing.includes(locale === "zh" ? "香港小学入学" : "Hong Kong Primary School"), "Primary entry/transfer package is missing");
  assert.ok(pricing.includes(locale === "zh" ? "内地高考报读香港本科" : "Mainland Gaokao"), "Gaokao HK undergraduate package is missing");
  assert.ok(pricing.includes(locale === "zh" ? "最多10所学校" : "up to 10 schools"), "Primary school scope must be bounded");
  assert.ok(pricing.includes(locale === "zh" ? "12个专业申请项目" : "12 programme applications"), "Masters programme scope must be bounded");
  assert.ok(pricing.includes(locale === "zh" ? "评估费用与抵扣" : "Assessment fees and credits"), "Assessment credit explanation is missing");
  assert.ok(pricing.includes(locale === "zh" ? "¥39.9" : "RMB 39.9"), "Independent Discovery fee must be distinguished");
  assert.ok(pricing.includes(locale === "zh" ? "¥980" : "RMB 980"), "Human Review fee must be explained");
  assert.ok(pricing.includes(locale === "zh" ? "交付后7天" : "seven days after delivery"), "Credit window must start after review delivery");
  assert.ok(pricing.includes(locale === "zh" ? "第三方费用" : "Third-party costs"), "Third-party exclusions must be explained");
  assert.match(html.slice(compassAt, academyAt), /education-compass-controlled/i, `${locale}: controlled Education Compass marker is missing`);
  assert.match(html.slice(compassAt, academyAt), unavailableCopy, `${locale}: Compass state must be truthful and unavailable`);
  assert.match(html, hasAttribute("select", "id", "education-direction"), `${locale}: consultation direction select is missing`);
  for (const value of ["planning", "hong-kong", "global", "academic", "academy"]) {
    assert.match(html, new RegExp(`<option\\b(?=[^>]*\\bvalue=["']${escapeRegExp(value)}["'])[^>]*>`, "i"), `${locale}: consultation option ${value} is missing`);
  }
  const compass = html.slice(compassAt, academyAt);
  assert.match(compass, /<button\b(?=[^>]*\bdisabled(?:=|\s|>))[^>]*>[\s\S]{0,500}(?:开始(?:教育规划)?(?:评估|测评)|Start(?: education planning)? assessment)/i, `${locale}: controlled Compass action must be disabled and explain its state in SSR`);
  assert.match(html, /<div\b(?=[^>]*\brole=["']status["'])(?=[^>]*data-testid=["']education-preparation-status["'])[^>]*>/i, `${locale}: preparation status needs an accessible live region`);
  assert.match(html, /(?:尚未发送咨询|No enquiry has been sent)/i, `${locale}: initial preparation status is missing`);
  assert.doesNotMatch(html, noSensitiveField, `${locale}: Education page must not expose a questionnaire or sensitive field`);
  assert.doesNotMatch(html, noQuestionnaireRoute, `${locale}: Education page must not invent a questionnaire/result route`);
  assert.doesNotMatch(html, /href=["'][^"']*\?/i, `${locale}: links must not carry query-sensitive data`);
}

function assertEducationFooter(html, locale) {
  const footerStart = html.indexOf('<footer class="site-footer');
  assert.ok(footerStart >= 0, `${locale}: shared V3 footer is missing`);
  const footer = html.slice(footerStart, html.indexOf("</footer>", footerStart) + "</footer>".length);
  assert.equal((footer.match(/<details\b/gi) ?? []).length, 5, `${locale}: Footer must retain five groups`);
  for (const label of locale === "zh"
    ? ["凤启学苑", "ASKWISE", "学苑约课管理系统", "学员入口", "导师入口", "教育与学习平台"]
    : ["Phoenix Academy", "ASKWISE", "Academy booking platform", "Student entry", "Tutor entry", "Education & learning"]) {
    assert.ok(footer.includes(label.replaceAll("&", "&amp;")), `${locale}: Footer label ${label} is missing`);
  }
  assert.match(footer, new RegExp(`href=["']/${locale}/education#academy["']`, "i"), `${locale}: Academy footer link must target Education`);
  assert.match(footer, new RegExp(`href=["']/${locale}/education#askwise["']`, "i"), `${locale}: ASKWISE footer link must target Education`);
  assert.match(footer, new RegExp(`href=["']/${locale}/education#academy-booking["']`, "i"), `${locale}: booking capability link must target Education`);
  assert.match(footer, new RegExp(`href=["']/${locale}/education#consultation["']`, "i"), `${locale}: contact link must keep Education consultation context`);
  assert.doesNotMatch(footer, /启明堂|Qiming Learning/i, `${locale}: retired Qiming label remains in Footer`);
  assert.doesNotMatch(footer, /href=["'][^"']*(?:admin|dashboard|student|tutor)[^"']*["']/i, `${locale}: Footer must not expose admin/student/tutor routes`);
}

function assertNoTransportSource() {
  const componentsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../components");
  const files = readdirSync(componentsDir)
    .filter(name => /^education.*\.(?:tsx|ts)$/.test(name))
    .map(name => resolve(componentsDir, name));
  assert.ok(files.length > 0, "Education source component is missing");
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /fetch\s*\(|window\.fetch|sendBeacon|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage|document\.cookie|indexedDB/i, `${file} must remain local-only`);
    assert.doesNotMatch(source, /<form\b|type=["'](?:file|email|tel|password)["']/i, `${file} must not collect sensitive fields`);
  }
}

test("Education bilingual landing has independent routes, SEO and complete structure", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());
  assertBrandSource();
  for (const locale of ["zh", "en"]) {
    const response = await request(worker, `/${locale}/education`);
    assert.equal(response.status, 200, `/${locale}/education must be a real route`);
    const html = await response.text();
    assertEducationStructure(html, locale);
    assertSeoMarkup(html, locale);
    assertLocaleNavigation(html, locale);
    assertBrandMarkup(html, `/${locale}/education`);
    assertEducationFooter(html, locale);
  }
});

test("Education Compass stays controlled under both Health flag states and consultation remains local", async t => {
  assertNoTransportSource();
  for (const healthFlag of ["0", "1"]) {
    const worker = createV5Worker({ HEALTH_COMPASS_PREVIEW: healthFlag });
    t.after(() => worker.dispose());
    for (const locale of ["zh", "en"]) {
      const response = await request(worker, `/${locale}/education`);
      assert.equal(response.status, 200, `${locale}: Education route failed with HEALTH_COMPASS_PREVIEW=${healthFlag}`);
      const html = await response.text();
      const compassStart = html.indexOf('id="education-compass"');
      const academyStart = html.indexOf('id="academy"');
      const compass = html.slice(compassStart, academyStart);
      assert.match(compass, /education-compass-controlled/i, `${locale}: controlled marker disappeared under Health flag ${healthFlag}`);
      assert.match(compass, unavailableCopy, `${locale}: unavailable Compass copy changed under Health flag ${healthFlag}`);
      assert.doesNotMatch(html, noQuestionnaireRoute, `${locale}: no assessment/result route may be linked`);
      assert.doesNotMatch(html, noSensitiveField, `${locale}: no PII collection may appear`);
      assert.doesNotMatch(html, /(?:fetch\s*\(|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|document\.cookie)/i, `${locale}: SSR must not advertise data transport`);
      assert.match(html, /(?:尚未发送咨询|No enquiry has been sent)/i, `${locale}: local status must remain truthful`);
    }
  }
});

test("Education addition preserves Health probe and legacy Compass routes", async t => {
  const worker = createV5Worker();
  t.after(() => worker.dispose());
  for (const locale of ["zh", "en"]) {
    for (const path of [`/${locale}/health`, `/${locale}/compass`, `/${locale}/identity`]) {
      const response = await request(worker, path);
      assert.equal(response.status, 200, `${path} compatibility probe failed`);
      const html = await response.text();
      assert.match(html, /<h1\b[^>]*>[\s\S]*?[^\s<][\s\S]*?<\/h1>/i, `${path} lost its readable heading`);
    }
  }
  for (const path of ["/education", "/fr/education", "/zh/education/assessment", "/en/education/result"]) {
    assert.equal((await request(worker, path)).status, 404, `${path} must not become an unreviewed public route`);
  }
});
