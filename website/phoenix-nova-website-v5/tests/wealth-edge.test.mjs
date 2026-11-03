import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (
      context.parentURL?.includes("/lib/wealth-edge.ts") &&
      ["./wealth-routing", "./wealth-content"].includes(specifier)
    )
      return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});
const { wealthEdgeRequest, wealthEdgeResponse } = await import(
  "../lib/wealth-edge.ts"
);
const origin = "https://wealth.phoenixnova.com.cn";
test("exact Host routing strips injected surface headers on the main site", () => {
  const other = wealthEdgeRequest(
    new Request("https://example.com/zh", {
      headers: {
        "x-phoenix-surface": "wealth",
        "x-forwarded-host": "wealth.phoenixnova.com.cn",
      },
    }),
  );
  assert.ok(other instanceof Request);
  assert.equal(other.url, "https://example.com/zh");
  assert.equal(other.headers.get("x-phoenix-surface"), null);
  const own = wealthEdgeRequest(
    new Request(origin + "/en/services/asset-structure?private=discard"),
  );
  assert.ok(own instanceof Request);
  assert.equal(
    new URL(own.url).pathname,
    "/en/wealth/services/asset-structure",
  );
  assert.equal(new URL(own.url).search, "");
  assert.equal(own.headers.get("x-phoenix-surface"), "wealth");
});
test("assessment, CRM, Family OS and internal APIs fail closed without exposing auth cookies", async () => {
  for (const path of [
    "/api/wealth",
    "/api/customer-auth/session",
    "/internal",
    "/account",
    "/auth",
    "/v1/family-os",
  ]) {
    const response = wealthEdgeRequest(new Request(origin + path));
    assert.ok(response instanceof Response);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = wealthEdgeRequest(
      new Request(origin + "/zh/compass", {
        method,
        headers: { origin: "https://evil.example" },
      }),
    );
    assert.ok(response instanceof Response);
    assert.ok([403, 405].includes(response.status));
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
});
test("independent sitemap and robots are served with noindex at the edge", async () => {
  const robots = wealthEdgeRequest(new Request(origin + "/robots.txt"));
  assert.match(await robots.text(), /Disallow: \/\n/);
  assert.match(robots.headers.get("x-robots-tag"), /noindex/);
  const sitemap = wealthEdgeRequest(new Request(origin + "/sitemap.xml")),
    xml = await sitemap.text();
  assert.equal((xml.match(/<url>/g) || []).length, 40);
  assert.match(xml, /family-wealth-planning/);
  assert.match(xml, /family-legacy/);
  assert.match(xml, /hreflang="zh-CN"/);
});
test("Wealth HTML uses hash-based CSP, exact language, no parent-domain cookies or permissive CORS", async () => {
  const response = await wealthEdgeResponse(
    new Response(
      '<html lang="zh-Hans"><script>console.log("bootstrap")</script></html>',
      {
        headers: {
          "content-type": "text/html",
          "set-cookie": "secret=x; Domain=.phoenixnova.com.cn",
          "access-control-allow-origin": "*",
        },
      },
    ),
    new Request(origin + "/en"),
  );
  const policy = response.headers.get("content-security-policy");
  assert.match(policy, /script-src 'self' 'sha256-/);
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.match(policy, /form-action 'none'/);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.match(await response.text(), /<html lang="en">/);
});
test("main-site responses retain their existing headers and session behavior", async () => {
  const response = new Response("main", {
    headers: { "set-cookie": "main-session=x; Secure; HttpOnly" },
  });
  assert.equal(
    await wealthEdgeResponse(response, new Request("https://example.com/zh")),
    response,
  );
});
