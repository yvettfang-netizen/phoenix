import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLaunch } from "../scripts/official-launch-preflight.mjs";

const origin = "https://phoenixnova.com.cn";
function fixture({ indexed = false, brokenPrivacy = false } = {}) {
  return async address => {
    const url = new URL(address);
    if (url.protocol === "http:") return new Response(null, { status: 308, headers: { location: origin + "/zh" } });
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n" + (indexed ? "Allow: /zh$\nAllow: /en$\n" : ""));
    if (url.pathname === "/sitemap.xml") return new Response(indexed
      ? "<urlset><loc>" + origin + "/zh</loc><loc>" + origin + "/en</loc></urlset>" : "<sitemapindex />");
    if (url.pathname.endsWith("/privacy")) return new Response("Synthetic policy", { status: brokenPrivacy ? 404 : 200 });
    if (url.pathname.endsWith("/consultation")) return new Response('<input name="email"><a href="' + url.pathname.replace("/consultation", "/privacy") + '">Privacy</a>');
    const locale = url.pathname.slice(1);
    return new Response('<html lang="' + (locale === "zh" ? "zh-Hans" : "en") + '">' +
      '<link rel="canonical" href="' + address + '"><link rel="alternate" hreflang="zh-Hans" href="' + origin + '/zh">' +
      '<link rel="alternate" hreflang="en" href="' + origin + '/en">' +
      '<meta name="robots" content="' + (indexed ? "index, follow" : "noindex, nofollow") + '">');
  };
}

test("verifies only read-only page and index expectations for both rollout states", async () => {
  for (const indexed of [false, true]) {
    const checks = await checkLaunch({ send: fixture({ indexed }), indexApproved: indexed });
    assert.equal(checks.length, 6);
    assert.ok(checks.every(check => check.passed));
  }
});

test("reports unavailable privacy and unapproved public indexing as distinct failures", async () => {
  const checks = await checkLaunch({ send: fixture({ indexed: true, brokenPrivacy: true }) });
  assert.deepEqual(checks.filter(check => !check.passed).map(check => check.name).sort(),
    ["en consultation and privacy", "en homepage", "index policy", "zh consultation and privacy", "zh homepage"].sort());
});
