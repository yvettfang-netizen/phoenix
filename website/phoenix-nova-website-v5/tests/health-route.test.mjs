import assert from "node:assert/strict";
import test from "node:test";
const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = path => worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" }, redirect: "manual" }), env, ctx);

test("Health preview is absent by default, including direct URLs", async () => {
  delete process.env.HEALTH_COMPASS_PREVIEW;
  for (const path of ["/compass/health", "/zh/compass/health", "/en/compass/health"]) assert.equal((await get(path)).status, 404, path);
  for (const path of ["/zh", "/en", "/zh/compass", "/en/compass"]) assert.doesNotMatch(await (await get(path)).text(), /data-testid="health-entry"/);
});
test("explicit candidate switch enables both locales, safe alias and noindex", async () => {
  process.env.HEALTH_COMPASS_PREVIEW = "1";
  try {
    for (const locale of ["zh", "en"]) {
      const response = await get(`/${locale}/compass/health`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /data-health-compass/);
      assert.match(html, /noindex/);
      assert.match(html, /phoenix-nova-mark-official/);
      for (const path of [`/${locale}`, `/${locale}/compass`]) {
        const entry = await (await get(path)).text();
        assert.match(entry, new RegExp(`href="/${locale}/compass/health"`));
      }
    }
    const alias = await get("/compass/health");
    assert.ok([301, 302, 307, 308].includes(alias.status));
    assert.equal(new URL(alias.headers.get("location"), "http://localhost").pathname, "/zh/compass/health");
    assert.equal((await get("/fr/compass/health")).status, 404);
    assert.equal((await get("/health")).status, 404, "Do not occupy the separate backend health probe");
  } finally { delete process.env.HEALTH_COMPASS_PREVIEW; }
});
test("switch can be disabled again without changing existing destinations", async () => {
  delete process.env.HEALTH_COMPASS_PREVIEW;
  assert.equal((await get("/zh/compass/health")).status, 404);
  for (const path of ["/zh/services", "/en/compass", "/zh/family-center"]) assert.equal((await get(path)).status, 200);
});

