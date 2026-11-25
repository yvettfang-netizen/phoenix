import assert from "node:assert/strict";
import { createRequire } from "node:module";

const origin = process.env.EDUCATION_ORIGIN ?? "http://127.0.0.1:4402";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch({ headless: true });

try {
  let result;
  for (const [width, height] of [[390, 844], [1440, 960]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390 });
    try {
      const page = await context.newPage();
      const writes = [];
      page.on("request", request => {
        if (request.method() === "POST") writes.push(request);
      });
      const target = origin + "/zh/education/free-assessment";
      assert.equal((await page.goto(origin + "/zh/education")).status(), 200);
      await page.getByRole("link", { name: "开始免费初评" }).click();
      await page.waitForURL(target);
      await page.getByRole("button", { name: "不说明身份，直接开始" }).click();
      for (let i = 0; i < 3; i += 1) {
        const question = page.getByRole("group").getByRole("button").first();
        await question.click();
        await page.getByRole("button", { name: "下一题" }).click();
      }
      const evaluation = page.waitForResponse(response => response.url() === origin + "/api/free-education-assessment");
      const total = Number(await page.getByRole("progressbar", { name: "初评进度" }).getAttribute("max"));
      assert(total >= 8 && total <= 12);
      for (let i = 3; i < total; i += 1) await page.getByRole("button", { name: "跳过", exact: true }).click();
      const response = await evaluation;
      assert.equal(response.status(), 200);
      assert.match(await response.headerValue("cache-control"), /no-store/);
      const snapshot = await response.json();
      await page.getByRole("heading", { name: "成长快照" }).waitFor();
      assert.equal(await page.locator("main article").count(), 4);
      assert.deepEqual(writes.map(request => new URL(request.url()).pathname), ["/api/free-education-assessment"]);
      assert.equal((await writes[0].allHeaders()).authorization, undefined);
      assert.equal((await writes[0].allHeaders()).cookie, undefined);
      assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => /assessment|snapshot/i.test(key))), false);
      assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(key => /assessment|snapshot/i.test(key))), false);
      if (result) assert.deepEqual(snapshot, result);
      result = snapshot;
      await page.getByRole("button", { name: "回看并修改" }).click();
      await page.getByRole("group").getByRole("button").first().waitFor();
      await page.reload();
      await page.getByRole("button", { name: "不说明身份，直接开始" }).waitFor();
      console.log(`PASS anonymous Education 8+4 ${width}x${height}, four cards, memory only`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
