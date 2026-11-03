/** Run against the built, frontend-only Host rehearsal. No production connectivity claim. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wealthArticles,
  wealthRegions,
  wealthServices,
} from "../lib/wealth-content.ts";
const integrationTest = process.env.WEALTH_TEST_ORIGIN ? test : test.skip;
const local = process.env.WEALTH_TEST_ORIGIN || "http://127.0.0.1:4481",
  canonical = "https://wealth.phoenixnova.com.cn";
integrationTest("all forty bilingual public routes have content, individual canonical/hreflang and noindex", async () => {
  for (const locale of ["zh", "en"]) {
    const paths = [
      `/${locale}`,
      `/${locale}/compass`,
      `/${locale}/knowledge`,
      ...wealthServices.map((s) => `/${locale}/services/${s.slug}`),
      ...wealthRegions.map((s) => `/${locale}/regions/${s.slug}`),
      ...wealthArticles.map((s) => `/${locale}/knowledge/${s.slug}`),
    ];
    for (const path of paths) {
      const response = await fetch(local + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.match(html, /<h1\b/, path);
      assert.ok(
        html.includes(`href="${canonical}${path}"`),
        `${path}: canonical`,
      );
      assert.match(html, /hreflang="zh-CN"/i, path);
      assert.match(html, /hreflang="en"/i, path);
      assert.match(response.headers.get("x-robots-tag"), /noindex/, path);
      assert.match(
        html,
        new RegExp(`<html[^>]*lang="${locale === "en" ? "en" : "zh-CN"}"`),
        path,
      );
      assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
      if (!path.endsWith("/compass"))
        assert.match(html, /application\/ld\+json/, path);
    }
  }
});
integrationTest("all knowledge routes have valid JSON-LD matching their canonical", async () => {
  for (const a of wealthArticles) {
    const path = "/en/knowledge/" + a.slug,
      html = await (await fetch(local + path)).text();
    const chunks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((x) => JSON.parse(x[1]));
    assert.ok(
      chunks.some(
        (x) => x["@type"] === "Article" && x.url === canonical + path,
      ),
    );
  }
});
integrationTest("unknown locale/slug and data APIs are not exposed", async () => {
  for (const path of [
    "/fr",
    "/zh/knowledge/not-a-guide",
    "/en/services/not-a-service",
    "/zh/compass/unexpected",
    "/api/customer-auth/session",
    "/internal",
  ]) {
    assert.equal((await fetch(local + path)).status, 404, path);
  }
  for (const method of ["POST", "OPTIONS"]) {
    const r = await fetch(local + "/api/wealth", {
      method,
      headers: { Origin: "https://unapproved.example" },
    });
    assert.ok([403, 405].includes(r.status));
    assert.equal(r.headers.get("access-control-allow-origin"), null);
    assert.equal(r.headers.get("set-cookie"), null);
  }
});
