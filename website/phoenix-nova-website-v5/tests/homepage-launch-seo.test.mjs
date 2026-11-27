import assert from "node:assert/strict";
import { test } from "node:test";
import { HOME_ORIGIN, PUBLIC_HOME_ORIGIN, homepageMetadata, homepageStructuredData } from "../lib/homepage-v6-seo.ts";
import { websiteRobots, websiteSitemap } from "../lib/website-crawl-policy.ts";

test("official homepage metadata uses the official host for each locale and keeps indexing closed", () => {
  for (const locale of ["zh", "en"]) {
    const metadata = homepageMetadata(locale, PUBLIC_HOME_ORIGIN);
    assert.equal(metadata.alternates.canonical, `${PUBLIC_HOME_ORIGIN}/${locale}`);
    assert.equal(metadata.alternates.languages["zh-Hans"], `${PUBLIC_HOME_ORIGIN}/zh`);
    assert.equal(metadata.alternates.languages.en, `${PUBLIC_HOME_ORIGIN}/en`);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
    assert.equal(metadata.robots.index, false);
    assert.equal(homepageStructuredData(locale, PUBLIC_HOME_ORIGIN)["@graph"][1].url, PUBLIC_HOME_ORIGIN);
  }
});

test("preview and unknown origins retain candidate metadata", () => {
  for (const origin of [null, HOME_ORIGIN, "https://phoenixnova.com.cn.example.test", "http://phoenixnova.com.cn"]) {
    const metadata = homepageMetadata("en", origin, "true");
    assert.equal(metadata.alternates.canonical, `${HOME_ORIGIN}/en`);
    assert.equal(metadata.robots.index, false);
  }
});

test("explicit approval exposes only the bilingual homepages on the official origin", async () => {
  assert.equal(homepageMetadata("en", PUBLIC_HOME_ORIGIN, "true").robots.index, true);
  const robots = await websiteRobots(new Request(PUBLIC_HOME_ORIGIN + "/robots.txt"), "true").text();
  assert.equal(robots, "User-agent: *\nDisallow: /\nAllow: /zh$\nAllow: /en$\nSitemap: https://phoenixnova.com.cn/sitemap.xml\n");
  const sitemap = await websiteSitemap(new Request(PUBLIC_HOME_ORIGIN + "/sitemap.xml"), "true").text();
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), [
    PUBLIC_HOME_ORIGIN + "/zh", PUBLIC_HOME_ORIGIN + "/en",
  ]);
});

test("preview and unapproved official sitemap stay empty", async () => {
  for (const [host, approval] of [[HOME_ORIGIN, "true"], [PUBLIC_HOME_ORIGIN, undefined], [PUBLIC_HOME_ORIGIN, true]]) {
    assert.equal(await websiteRobots(new Request(host + "/robots.txt"), approval).text(), "User-agent: *\nDisallow: /\n");
    const sitemap = websiteSitemap(new Request(host + "/sitemap.xml"), approval);
    assert.equal(sitemap.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.doesNotMatch(await sitemap.text(), /<loc>/);
  }
});
