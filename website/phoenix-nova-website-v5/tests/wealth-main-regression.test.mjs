import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBrandSource, assertBrandMarkup } from "./brand-integrity.mjs";
const integrationTest = process.env.MAIN_TEST_ORIGIN ? test : test.skip;
const origin = process.env.MAIN_TEST_ORIGIN || "http://127.0.0.1:4480";
integrationTest("existing bilingual home, Education, Identity and Health retain routes and the shared B logo", async () => {
  assertBrandSource();
  for (const locale of ["zh", "en"])
    for (const page of ["", "/education", "/identity", "/health"]) {
      const path = `/${locale}${page}`,
        response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assertBrandMarkup(html, path);
      assert.match(html, /<h1\b/, path);
      assert.ok(
        html.includes(`https://wealth.phoenixnova.com.cn/${locale}`),
        `${path}: official Wealth destination`,
      );
    }
});
