import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath && !modulePath.endsWith(".mjs") ? createRequire(import.meta.url)(modulePath) : await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const origin = process.env.IDENTITY_V31_ORIGIN || "http://127.0.0.1:44631";
const publicOrigin = process.env.IDENTITY_V31_PUBLIC_ORIGIN || "http://127.0.0.1:44632";
const out = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v31");
const browser = await chromium.launch({ headless: true, ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}) });
const results = [];
try {
  const page = await browser.newPage();
  const titles = new Set();
  for (const locale of ["zh", "en"]) {
    for (const suffix of ["explorer", ...["saint-kitts-and-nevis", "argentina", "vanuatu", "sao-tome-and-principe"].map(slug => `countries/${slug}`)]) {
      const path = `/${locale}/identity/${suffix}`;
      const response = await page.goto(origin + path, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      const html = await response.text();
      assert.match(html, /<h1[\s>]/, "H1 must be server-rendered");
      assert.equal(await page.locator("h1").count(), 1);
      const title = await page.title();
      assert.ok(title.length > 5 && !titles.has(title), "Each bilingual page needs a unique title");
      titles.add(title);
      assert.ok((await page.locator('meta[name="description"]').getAttribute("content")).length > 15);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      assert.equal(new URL(canonical, origin).pathname, path);
      for (const [language, lang] of [["zh-Hans", "zh"], ["en", "en"]]) {
        const href = await page.locator(`link[hreflang="${language}"]`).getAttribute("href");
        assert.equal(new URL(href, origin).pathname, `/${lang}/identity/${suffix}`);
      }
      assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
      const json = await page.locator('script[type="application/ld+json"]').allTextContents();
      assert.ok(json.length > 0);
      for (const item of json) {
        const data = JSON.parse(item);
        assert.equal(data["@context"], "https://schema.org");
        assert.equal(data["@type"], "WebPage");
        assert.equal(data.publisher["@type"], "Organization");
        assert.equal(data.publisher.name, "Phoenix Nova™");
        assert.equal(data.breadcrumb["@type"], "BreadcrumbList");
        assert.equal(data.url, path);
        assert.doesNotMatch(item, /GovernmentOrganization|GovernmentOffice|governmentEndorsement/);
      }
      results.push({ path, title, canonical, schema: "WebPage/Organization/BreadcrumbList", status: "PASS" });
    }
  }
  for (const host of [origin, publicOrigin]) {
    const robots = await page.request.get(host + "/robots.txt");
    assert.equal(robots.status(), 200);
    assert.match(await robots.text(), /Disallow: \/\s/);
    const sitemap = await page.request.get(host + "/sitemap.xml");
    assert.equal(sitemap.status(), 200);
    assert.doesNotMatch(await sitemap.text(), /<loc>/, "No unapproved URLs may enter the sitemap");
  }
  const hiddenImport = await page.request.get(publicOrigin + "/zh/identity/import-review");
  assert.equal(hiddenImport.status(), 404);
  console.log(`PASS ${results.length} bilingual GEO pages, structured data shape, release robots/sitemap and import gate`);
} finally {
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, "geo-results.json"), JSON.stringify({ origin, publicOrigin, validation: "Local structural validation; not Google Rich Results certification or production discoverability approval", results }, null, 2));
  await browser.close();
}
