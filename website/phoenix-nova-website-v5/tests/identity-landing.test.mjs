import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createV5Worker } from "./worker-fixture.mjs";
import { assertBrandMarkup, assertBrandSource } from "./brand-integrity.mjs";

const request = (worker, path) => worker.dispatchFetch(`http://localhost${path}`, { headers: { accept: "text/html" }, redirect: "manual" });

test("Identity bilingual landing is a real route with independent SEO and complete service structure", async t => {
  const worker = createV5Worker(); t.after(() => worker.dispose());
  assertBrandSource();
  for (const locale of ["zh", "en"]) {
    const response = await request(worker, `/${locale}/identity`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-identity-landing/);
    assert.match(html, /GLOBAL RESIDENCY PLANNING/);
    assert.match(html, /阳光下未雨绸缪/);
    assert.match(html, /风雨中闲庭信步/);
    assert.match(html, /Prepare in the sunshine/);
    assert.match(html, /Walk with confidence through the storm/);
    assert.equal((html.match(/data-testid="identity-service"/g) ?? []).length, 4);
    assert.equal((html.match(/data-testid="identity-step"/g) ?? []).length, 5);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:image"[^>]+identity-hero/);
    assert.match(html, /name="twitter:card"[^>]+summary_large_image/);
    assert.match(html, /noindex/);
    assert.match(html, new RegExp(`href="/${locale === "zh" ? "en" : "zh"}/identity"`));
    assert.match(html, /aria-current="page"[^>]*href="\/(zh|en)\/identity"/);
    assertBrandMarkup(html, `/${locale}/identity`);
  }
});

test("Identity remains controlled without a questionnaire, invented results or collection endpoint", async t => {
  const worker = createV5Worker({ HEALTH_COMPASS_PREVIEW: "1" }); t.after(() => worker.dispose());
  for (const locale of ["zh", "en"]) {
    const html = await (await request(worker, `/${locale}/identity`)).text();
    assert.match(html, /identity-compass-controlled/);
    assert.doesNotMatch(html, /href="[^\"]*\/identity\/(assessment|result)/);
    assert.doesNotMatch(html, /<form\b|type="file"|type="email"/);
    assert.match(html, locale === "zh" ? /尚未发送咨询/ : /No enquiry has been sent/);
    assert.match(html, locale === "zh" ? /不承诺身份获批/ : /not guaranteed/);
  }
  for (const path of ["/identity", "/fr/identity", "/zh/identity/assessment", "/en/identity/result"]) assert.equal((await request(worker, path)).status, 404, path);
  const consultation = readFileSync(new URL("../components/identity-consultation.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(consultation, /fetch\s*\(|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|URLSearchParams|<form\b|type=["']file/);
  assert.match(consultation, /type="button"/);
});

test("Shared V3 footer has five product groups and no fabricated product or internal links", async t => {
  const worker = createV5Worker(); t.after(() => worker.dispose());
  const html = await (await request(worker, "/zh/identity")).text();
  for (const label of ["规划与专业服务", "教育与学习平台", "家庭与会员服务", "凤启世界", "关于凤启", "Phoenix Academy", "ASKWISE", "启明堂", "学苑约课管理系统", "学员入口", "导师入口", "Family OS", "NOVA DIGITAL"]) assert.ok(html.includes(label), label);
  assert.match(html, /凤启环球信息科技（深圳）有限公司/);
  const footer = html.slice(html.indexOf('<footer class="site-footer'));
  assert.doesNotMatch(footer, /href="[^\"]*(?:dashboard|founder|internal|tutor-admin|teacher-admin)/i);
  assert.doesNotMatch(footer, /href="[^\"]*\/(academy|askwise|booking|student|tutor)"/i);
  for (const path of ["/zh", "/zh/compass", "/zh/health", "/zh/health/family", "/en/about"]) assert.equal((await request(worker, path)).status, 200, path);
});
