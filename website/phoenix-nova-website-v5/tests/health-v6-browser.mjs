import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.HEALTH_ORIGIN || "http://127.0.0.1:4388";
const out = process.env.HEALTH_EVIDENCE_DIR || "health-evidence/v6";
const expectedEnabled = process.env.HEALTH_EXPECT_ENABLED === "1";
mkdirSync(out, { recursive: true });

const results = [];
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HEALTH_BROWSER_PATH ? { executablePath: process.env.HEALTH_BROWSER_PATH } : {}),
});

try {
  for (const locale of ["zh", "en"]) {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(`${origin}/${locale}/health`, { waitUntil: "networkidle" });
      assert.ok(await page.locator("meta[name=robots]").getAttribute("content").then(value => /noindex/i.test(value || "")), `${locale}/${width}: noindex required`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${width}: horizontal overflow`);

      const landing = page.locator("[data-health-landing]");
      assert.equal(await landing.count(), 1);
      if (expectedEnabled) assert.equal(await page.locator('[data-testid="health-landing-assessment"]').count(), 1);
      else assert.equal(await page.locator('[data-testid="health-landing-closed"]').count(), 1);

      const apec = page.locator("#brand-origin");
      assert.equal(await apec.count(), 1);
      const apecText = await apec.innerText();
      assert.match(apecText, /APEC/i);
      assert.match(apecText, locale === "zh" ? /会后|计划启动|首发/ : /Post-APEC|after APEC|planned|launching/i);
      assert.doesNotMatch(apecText, /倒计时|报名|开幕|18.?19|countdown|registration|opening ceremony/i);

      const insurance = page.locator('[data-testid="health-v6-insurance"]');
      assert.equal(await insurance.count(), 1);
      const brandSelect = insurance.locator('[data-testid="health-v6-insurance-brand"]');
      const specialtySelect = insurance.locator('[data-testid="health-v6-insurance-specialty"]');
      assert.equal(await brandSelect.locator("option").count(), 12, `${locale}/${width}: eleven brands plus placeholder`);
      assert.equal(await specialtySelect.locator("option").count(), 5, `${locale}/${width}: four specialties plus placeholder`);
      assert.equal(await insurance.locator('input[type="file"]').count(), 0, `${locale}/${width}: insurance selector must not accept files`);
      const result = insurance.locator('[data-testid="health-v6-insurance-result"]');
      const initialResult = await result.innerText();
      assert.match(initialResult, /UNVERIFIED/);
      assert.doesNotMatch(initialResult, /Manulife|宏利/i, `${locale}/${width}: initial result must not imply a selected insurer`);
      const requests = [];
      const listener = request => {
        if (!request.url().startsWith(origin) || request.method() !== "GET") requests.push(`${request.method()} ${request.url()}`);
      };
      page.on("request", listener);
      await brandSelect.selectOption({ index: 1 });
      await specialtySelect.selectOption({ index: 1 });
      await page.waitForTimeout(50);
      assert.equal(requests.length, 0, `${locale}/${width}: selector emitted external requests`);
      assert.match(await insurance.innerText(), /UNVERIFIED/);
      assert.match(await insurance.innerText(), locale === "zh" ? /请提供具体保险计划/ : /specific insurance plan/i);
      await insurance.locator('[data-testid="health-v6-insurance-reset"]').click();
      assert.equal(await brandSelect.inputValue(), "", `${locale}/${width}: insurer reset failed`);
      assert.equal(await specialtySelect.inputValue(), "", `${locale}/${width}: specialty reset failed`);
      assert.doesNotMatch(await result.innerText(), /Manulife|宏利|AIA|友邦/i, `${locale}/${width}: reset left a selected insurer visible`);

      const specialties = page.locator('[data-testid="health-v6-specialties"]');
      assert.equal(await specialties.count(), 1);
      const tabs = specialties.locator('[role="tab"]');
      assert.equal(await tabs.count(), 4);
      await tabs.nth(0).focus();
      await tabs.nth(0).press("ArrowRight");
      assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true", `${locale}/${width}: ArrowRight did not advance specialty tab`);
      await tabs.nth(1).press("End");
      assert.equal(await tabs.nth(3).getAttribute("aria-selected"), "true", `${locale}/${width}: End did not select final specialty tab`);
      await tabs.nth(3).press("Home");
      assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true", `${locale}/${width}: Home did not select first specialty tab`);
      for (let i = 0; i < 4; i += 1) {
        await tabs.nth(i).click();
        assert.equal(await tabs.nth(i).getAttribute("aria-selected"), "true");
        assert.equal(await specialties.locator('[role="tabpanel"]').count(), 1);
      }
      assert.match(await specialties.innerText(), locale === "zh" ? /由医疗机构|医生|待核实/ : /provider|clinician|confirm/i);

      const faq = page.locator('[data-testid="health-v6-faq"]');
      assert.equal(await faq.count(), 1);
      assert.equal(await faq.locator("details").count(), 12);
      assert.match(await faq.innerText(), locale === "zh" ? /隐私|理赔|预约/ : /privacy|claims|booking/i);
      const firstFaq = faq.locator("details").first();
      assert.equal(await firstFaq.evaluate(element => element.open), false, `${locale}/${width}: FAQ should start closed`);
      await firstFaq.locator("summary").click();
      assert.equal(await firstFaq.evaluate(element => element.open), true, `${locale}/${width}: FAQ did not open`);
      await firstFaq.locator("summary").click();
      assert.equal(await firstFaq.evaluate(element => element.open), false, `${locale}/${width}: FAQ did not close`);

      page.off("request", listener);
      assert.equal(requests.length, 0, `${locale}/${width}: V6 interactions emitted a network request or submission`);

      await page.screenshot({ path: `${out}/${locale}-${width}.png`, fullPage: true });
      results.push({ locale, width, enabled: expectedEnabled, status: "PASS" });
      await page.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
}

console.log(JSON.stringify(results));
