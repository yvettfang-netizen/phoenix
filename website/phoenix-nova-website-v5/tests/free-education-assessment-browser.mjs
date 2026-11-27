import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { REGISTRY } from "../../../Phoenix Compass/education compass/models/free-education-assessment.js";

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
        const options = page.getByRole("group").getByRole("button");
        const question = i === 0 ? page.getByRole("group").getByRole("button", {
          name: REGISTRY[0].allowed_values.find(option => option.value === "HK_ADMISSION_GOAL").label,
          exact: true,
        }) : options.first();
        assert.equal(await page.getByRole("button", { name: "下一题" }).isDisabled(), true);
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
      const stageCard = page.locator("main article").filter({ has: page.getByRole("heading", { name: "教育阶段", exact: true }) });
      assert.equal(await stageCard.getByRole("heading", { name: "还需要了解" }).count(), 0);
      assert.ok(await page.getByRole("heading", { name: "还需要了解" }).count());
      const cards = page.locator("main article");
      assert.doesNotMatch((await cards.allInnerTexts()).join("\n"), /\b(?:L[1-4]|Q\d+|EDU-R\d+)\b|learning_state_self_reported/);
      assert.equal(await page.getByText("相关招生要求有待官方核实。", { exact: true }).isVisible(), true);
      const firstEvidence = stageCard.locator("details").first();
      assert.equal(await firstEvidence.getByText("已填写题目：孩子现在读几年级？").isVisible(), false);
      await firstEvidence.locator("summary").click();
      assert.equal(await firstEvidence.getByText("已填写题目：孩子现在读几年级？").isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
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
