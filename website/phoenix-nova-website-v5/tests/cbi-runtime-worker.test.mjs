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
    for (const path of ["/zh/identity/import-review", "/en/identity/import-review/", "/zh/identity/%69mport-review", "/zh/identity/%2569mport-review", "/zh/identity/import-review/nested", "/zh/identity/%ZZ", "/api/identity/cbi/import", "/api/identity/cbi/import%2Fnested", "/api/identity/cbi/%2569mport/nested", "/api/identity/cbi/publish/version", "/api/identity/cbi/rollback/version"]) {
      for (const method of ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"]) {
        const response = await mf.dispatchFetch("https://identity-test.example" + path, {
          method, headers: { "content-type": "application/json", authorization: "Bearer forged", "x-role": "FOUNDER", "x-user-id": "forged", "idempotency-key": "retry-same-key" },
          ...(["GET","HEAD"].includes(method) ? {} : { body: '{"role":"FOUNDER","content_status":"PUBLISHED",invalid-json' }),
        });
        assert.equal(response.status, 404, `${method} ${path}`);
        assertHeaders(response);
        assert.doesNotMatch(await response.text(), /file_hash|approved_by|stack|SQL|password|token/i);
      }
    }
    const after = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    assert.deepEqual(after.results, before.results, "Denied requests must not initialize import/database tables");
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
