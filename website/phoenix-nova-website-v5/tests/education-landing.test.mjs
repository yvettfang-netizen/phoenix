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
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${locale}: Education needs one h1`);
  assert.equal(testIdCount(html, "education-service"), 4, `${locale}: Education needs four services`);
  assert.equal(testIdCount(html, "education-value"), 5, `${locale}: Education needs five values`);
  assert.equal(testIdCount(html, "learning-step"), 7, `${locale}: Education needs seven ordered learning steps`);
  assert.equal(testIdCount(html, "education-consultation"), 1, `${locale}: Education consultation panel must be unique`);
  assert.equal(testIdCount(html, "education-preparation-status"), 1, `${locale}: Education preparation status must be unique`);
  for (const id of ["education-services", "education-compass", "academy", "academy-booking", "askwise", "family-growth", "consultation"]) {
    assert.equal((html.match(new RegExp(`\\bid=["']${escapeRegExp(id)}["']`, "gi")) ?? []).length, 1, `${locale}: #${id} must be unique`);
  }
  const servicesAt = html.indexOf('id="education-services"');
  const compassAt = html.indexOf('id="education-compass"');
  const academyAt = html.indexOf('id="academy"');
  assert.ok(servicesAt >= 0 && servicesAt < compassAt && compassAt < academyAt, `${locale}: education Compass section order changed`);
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
  const footer = html.slice(footerStart);
  assert.equal((footer.match(/<details\b/gi) ?? []).length, 5, `${locale}: Footer must retain five groups`);
  for (const label of locale === "zh"
    ? ["凤启学苑", "ASKWISE", "学苑约课管理系统", "学员入口", "导师入口", "教育与学习平台"]
    : ["Phoenix Academy", "ASKWISE", "Academy booking platform", "Student entry", "Tutor entry", "Education & learning"]) {
    assert.ok(footer.includes(label), `${locale}: Footer label ${label} is missing`);
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
