import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/wealth-routing.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const routing = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const {
  MAIN_ORIGIN,
  MAIN_ORIGIN_VERIFIED,
  WEALTH_HOST,
  WEALTH_ORIGIN,
  WEALTH_ROBOTS_TXT,
  buildWealthSitemap,
  routeWealthRequest,
  wealthPublicPath,
} = routing;

test("constants keep the dedicated host and unverified main origin explicit", () => {
  assert.equal(WEALTH_ORIGIN, "https://wealth.phoenixnova.com.cn");
  assert.equal(WEALTH_HOST, "wealth.phoenixnova.com.cn");
  assert.equal(typeof MAIN_ORIGIN, "string");
  assert.equal(MAIN_ORIGIN_VERIFIED, false);
});

test("public path mapping is stable for compass, knowledge, services and regions", () => {
  assert.equal(wealthPublicPath("zh", "compass"), "/zh/compass");
  assert.equal(
    wealthPublicPath("en", "guides", "family-goals"),
    "/en/knowledge/family-goals",
  );
  assert.equal(wealthPublicPath("zh", "knowledge"), "/zh/knowledge");
  assert.equal(
    wealthPublicPath("en", "services", "family-wealth-planning"),
    "/en/services/family-wealth-planning",
  );
  assert.equal(
    wealthPublicPath("zh", "regions", "hong-kong"),
    "/zh/regions/hong-kong",
  );
  assert.throws(
    () => wealthPublicPath("fr", "compass"),
    /Unsupported Wealth locale/,
  );
});

test("host matching is exact and does not trust a spoofed hostname", () => {
  assert.deepEqual(routeWealthRequest("https://phoenixnova.com.cn/zh"), {
    kind: "pass",
  });
  assert.deepEqual(
    routeWealthRequest("https://wealth.phoenixnova.com.cn.evil.example/zh"),
    { kind: "pass" },
  );
  assert.deepEqual(routeWealthRequest("https://wealth.phoenixnova.com.cn/zh"), {
    kind: "rewrite",
    path: "/zh/wealth",
  });
});

test("http is upgraded and client query/fragment input never leaks into canonical redirects", () => {
  const result = routeWealthRequest(
    "http://wealth.phoenixnova.com.cn/?utm_source=client#fragment",
  );
  assert.deepEqual(result, {
    kind: "redirect",
    location: `${WEALTH_ORIGIN}/zh`,
    status: 308,
  });
  assert.doesNotMatch(result.location, /utm_source|fragment/);
});

test("public paths rewrite to internal Wealth paths", () => {
  assert.deepEqual(routeWealthRequest("https://wealth.phoenixnova.com.cn/zh"), {
    kind: "rewrite",
    path: "/zh/wealth",
  });
  assert.deepEqual(
    routeWealthRequest("https://wealth.phoenixnova.com.cn/en/compass"),
    { kind: "rewrite", path: "/en/wealth/assessment" },
  );
  assert.deepEqual(
    routeWealthRequest("https://wealth.phoenixnova.com.cn/zh/knowledge"),
    { kind: "rewrite", path: "/zh/wealth/knowledge" },
  );
  assert.deepEqual(
    routeWealthRequest(
      "https://wealth.phoenixnova.com.cn/en/knowledge/succession",
    ),
    { kind: "rewrite", path: "/en/wealth/guides/succession" },
  );
  assert.deepEqual(
    routeWealthRequest(
      "https://wealth.phoenixnova.com.cn/zh/services/family-protection",
    ),
    { kind: "rewrite", path: "/zh/wealth/services/family-protection" },
  );
  assert.deepEqual(
    routeWealthRequest("https://wealth.phoenixnova.com.cn/en/regions/global"),
    { kind: "rewrite", path: "/en/wealth/regions/global" },
  );
});

test("nested aliases redirect to public paths and strip query strings", () => {
  const cases = [
    ["/zh/wealth", "/zh"],
    ["/en/wealth/assessment", "/en/compass"],
    ["/zh/wealth/knowledge", "/zh/knowledge"],
    ["/en/wealth/guides/succession", "/en/knowledge/succession"],
    ["/zh/wealth/services/family-legacy", "/zh/services/family-legacy"],
    ["/en/wealth/regions/hong-kong", "/en/regions/hong-kong"],
  ];
  for (const [path, expected] of cases) {
    const result = routeWealthRequest(
      `${WEALTH_ORIGIN}${path}?return_to=https://evil.example/#x`,
    );
    assert.deepEqual(
      result,
      {
        kind: "redirect",
        location: `${WEALTH_ORIGIN}${expected}`,
        status: 308,
      },
      path,
    );
  }
});

test("resources pass through while API and private application prefixes deny", () => {
  for (const path of [
    "/_vinext/client.js",
    "/assets/site.css",
    "/images/hero.png",
    "/brand/logo.png",
    "/favicon.ico",
  ]) {
    assert.deepEqual(
      routeWealthRequest(`${WEALTH_ORIGIN}${path}`),
      { kind: "pass" },
      path,
    );
  }
  for (const path of [
    "/api/wealth",
    "/auth/callback",
    "/account",
    "/internal/debug",
  ]) {
    assert.deepEqual(
      routeWealthRequest(`${WEALTH_ORIGIN}${path}`),
      { kind: "deny", status: 404 },
      path,
    );
  }
});

test("robots and sitemap are explicit noindex endpoints", () => {
  assert.deepEqual(routeWealthRequest(`${WEALTH_ORIGIN}/robots.txt`), {
    kind: "robots",
  });
  assert.deepEqual(routeWealthRequest(`${WEALTH_ORIGIN}/sitemap.xml`), {
    kind: "sitemap",
  });
  assert.match(WEALTH_ROBOTS_TXT, /Disallow: \/\n/);
  assert.match(WEALTH_ROBOTS_TXT, /Disallow: \//);
});

test("sitemap has the requested bilingual inventory, alternates and XML escaping", () => {
  const xml = buildWealthSitemap(
    [
      "family-wealth-planning",
      "asset-structure",
      "family-protection",
      "family-legacy",
      "cross-border-planning",
    ],
    [
      "hong-kong",
      "gba",
      "singapore",
      "united-kingdom",
      "united-states",
      "global",
    ],
    [
      "family-goals",
      "asset-structure",
      "emergency-reserve",
      "protection-review",
      "cross-border",
      "succession",
    ],
  );
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.equal((xml.match(/<url>/g) || []).length, 40);
  assert.equal((xml.match(/hreflang="zh-CN"/g) || []).length, 40);
  assert.equal((xml.match(/hreflang="en"/g) || []).length, 40);
  const escaped = buildWealthSitemap(["a&b"], [], []);
  assert.match(escaped, /a&amp;b/);
  assert.doesNotMatch(escaped, /<loc>[^<]*a&b/);
});
