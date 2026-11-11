import test from "node:test";
import assert from "node:assert/strict";
import { createV5Worker } from "./worker-fixture.mjs";

const assertHeaders = response => {
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
};

test("actual Worker denies import/publication/rollback before parsing, despite flags and forged staff headers", async () => {
  const mf = createV5Worker({ IDENTITY_CBI_IMPORT_REVIEW: "1", IDENTITY_CBI_REVIEW_PREVIEW: "1" });
  try {
    const db = await mf.getD1Database("DB");
    // Initialize Workers/D1 platform services before the baseline. D1 creates
    // its own _cf_METADATA lazily; do not exclude any tables from the assertion.
    await db.prepare("SELECT 1").all();
    const warmup = await mf.dispatchFetch("https://identity-test.example/robots.txt");
    assert.equal(warmup.status, 200);
    await warmup.text();
    const before = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    for (const origin of ["https://identity-test.example", "https://wealth.phoenixnova.com.cn"]) {
      for (const path of ["/zh/identity/import-review", "/en/identity/import-review/", "/zh/identity/%69mport-review", "/zh/identity/%2569mport-review", "/zh/identity/import-review/nested", "/zh/identity/%ZZ", "/api/identity/cbi/import", "/api/identity/cbi/import%2Fnested", "/api/identity/cbi/%2569mport/nested", "/api/identity/cbi/publish/version", "/api/identity/cbi/rollback/version"]) {
        for (const method of ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"]) {
          const response = await mf.dispatchFetch(origin + path, {
            method, headers: { "content-type": "application/json", authorization: "Bearer forged", "x-role": "FOUNDER", "x-user-id": "forged", "idempotency-key": "retry-same-key" },
            ...(["GET","HEAD"].includes(method) ? {} : { body: '{"role":"FOUNDER","content_status":"PUBLISHED",invalid-json' }),
          });
          assert.equal(response.status, 404, `${method} ${origin}${path}`);
          assertHeaders(response);
          assert.equal(response.headers.get("set-cookie"), null);
          assert.equal(response.headers.get("access-control-allow-origin"), null);
          assert.doesNotMatch(await response.text(), /file_hash|approved_by|stack|SQL|password|token/i);
        }
      }
    }
    const after = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    assert.deepEqual(after.results, before.results, "Denied requests must not initialize import/database tables");
  } finally { await mf.dispose(); }
});

test("actual Worker keeps Wealth host routing and server-derived Health locale alongside Identity denial", async () => {
  const mf = createV5Worker({ HEALTH_COMPASS_PREVIEW: "0" });
  try {
    for (const locale of ["zh", "en"]) {
      const wealth = await mf.dispatchFetch(`https://wealth.phoenixnova.com.cn/${locale}`);
      assert.equal(wealth.status, 200);
      assert.match(wealth.headers.get("x-robots-tag"), /noindex/);
      assert.match(wealth.headers.get("content-security-policy"), /form-action 'none'/);
      assert.match(await wealth.text(), new RegExp(`<html[^>]*lang="${locale === "en" ? "en" : "zh-CN"}"`));

      const health = await mf.dispatchFetch(`https://health-test.example/${locale}/health`, {
        headers: {
          "x-phoenix-health-locale": locale === "en" ? "zh" : "en",
          "x-phoenix-surface": "wealth",
          "x-forwarded-host": "wealth.phoenixnova.com.cn",
        },
      });
      assert.equal(health.status, 200);
      const html = await health.text();
      assert.match(html, new RegExp(`<html[^>]*lang="${locale === "en" ? "en" : "zh-Hans"}"`));
      assert.match(html, /noindex/);
      assert.match(html, /health\.phoenixnova\.com\.cn/);
    }
    const deniedApi = await mf.dispatchFetch("https://wealth.phoenixnova.com.cn/api/customer-auth/session");
    assert.equal(deniedApi.status, 404);
    assert.equal(deniedApi.headers.get("set-cookie"), null);
    const sitemap = await mf.dispatchFetch("https://identity-test.example/sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get("x-robots-tag"), /noindex/);
    assert.match(sitemap.headers.get("cache-control"), /no-store/);
    const xml = await sitemap.text();
    assert.match(xml, /<sitemapindex/);
    assert.doesNotMatch(xml, /<loc>/);
  } finally { await mf.dispose(); }
});

test("actual Worker applies noindex/no-store/nosniff/referrer policy to both Identity locales", async () => {
  const mf = createV5Worker();
  try {
    for (const path of ["/zh/identity", "/en/identity", "/zh/identity/explorer", "/en/identity/explorer/compare"]) {
      const response = await mf.dispatchFetch("https://identity-test.example" + path);
      assert.equal(response.status, 200);
      assertHeaders(response);
      const html = await response.text();
      assert.match(html, /noindex/);
      assert.doesNotMatch(html, /identity-cbi-review-20261102/);
    }
  } finally { await mf.dispose(); }
});

const repeatedSlashAliases = [
  "//api/identity/cbi/import",
  "/api//identity/cbi/import",
  "/api/identity//cbi/import",
  "/api/identity/cbi//import",
  "/api/identity/cbi/import//nested",
  "/api//identity/cbi/publish/version",
  "/api/identity/cbi//rollback/version",
  "//zh/identity/import-review",
  "/zh//identity/import-review",
  "/en/identity//import-review",
  "/en///identity/import-review/nested",
  "/api/%2Fidentity/cbi/import",
  "/api%2F%2Fidentity/cbi/%2569mport/nested",
  "/zh/%2Fidentity/import-review",
  "/en//identity/%ZZ",
  "/api//identity/cbi/%25ZZ",
];

for (const reviewPreview of ["0", "1"]) {
  for (const importReview of ["0", "1"]) {
    test(`actual Worker rejects slash aliases before redirects with review=${reviewPreview}, import=${importReview}`, async () => {
      const mf = createV5Worker({ IDENTITY_CBI_REVIEW_PREVIEW: reviewPreview, IDENTITY_CBI_IMPORT_REVIEW: importReview });
      try {
        const db = await mf.getD1Database("DB");
        await db.prepare("SELECT 1").all();
        const warmup = await mf.dispatchFetch("https://identity-test.example/robots.txt");
        assert.equal(warmup.status, 200);
        await warmup.text();
        const before = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        for (const origin of ["https://identity-test.example", "https://wealth.phoenixnova.com.cn"]) {
          for (const path of repeatedSlashAliases) {
            for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
              const label = `${method} ${origin}${path}`;
              const response = await mf.dispatchFetch(origin + path, {
                method,
                redirect: "manual",
                headers: { "content-type": "application/json", authorization: "Bearer forged", "x-role": "FOUNDER", "x-user-id": "forged", "x-forwarded-host": "identity-test.example", "idempotency-key": "retry-same-key" },
                ...(["GET", "HEAD"].includes(method) ? {} : { body: '{"role":"FOUNDER","content_status":"PUBLISHED",invalid-json' }),
              });
              assert.equal(response.status, 404, label);
              assert.equal(response.headers.get("location"), null, label);
              assertHeaders(response);
              assert.equal(response.headers.get("set-cookie"), null, label);
              assert.equal(response.headers.get("access-control-allow-origin"), null, label);
              assert.doesNotMatch(await response.text(), /file_hash|approved_by|stack|SQL|password|token/i, label);
            }
          }
        }
        const after = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        assert.deepEqual(after.results, before.results, "Denied aliases must not initialize import/database tables");
      } finally { await mf.dispose(); }
    });
  }
}
