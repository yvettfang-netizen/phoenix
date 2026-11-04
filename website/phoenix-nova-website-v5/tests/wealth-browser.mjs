/**
 * Synthetic Playwright regression for the browser-local Wealth Compass flow.
 * The preview origin is deliberately configurable and defaults to port 4481.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath ? pathToFileURL(resolve(modulePath, "index.mjs")).href : "playwright",
);
const origin = process.env.WEALTH_ORIGIN || "http://127.0.0.1:4481";
const evidenceDir = resolve(process.env.WEALTH_EVIDENCE_DIR || "outputs/wealth-v30");
const widths = [320, 390, 768, 1440];
const locales = ["zh", "en"];
const DRAFT_KEY = "phoenix-wealth-frozen-v1-draft";

const personas = {
  persona1: {
    Q01: ["B"], Q02: ["EDUCATION", "LIQUIDITY", "SUCCESSION"], Q03: ["A"], Q04: ["B"],
    Q05: ["B"], Q06: ["CASH", "PROPERTY", "PROTECTION"], Q07: ["B"], Q08: ["B"],
    Q09: ["B"], Q10: ["MARKET"], Q11: ["A"], Q12: ["B"], Q13: ["C"], Q14: ["C"],
  },
  persona2: {
    Q01: ["C"], Q02: ["IDENTITY", "BUSINESS", "CROSS_BORDER"], Q03: ["D"], Q04: ["C"],
    Q05: ["C"], Q06: ["BUSINESS", "PROPERTY", "INVESTMENT", "DEBT"], Q07: ["D"], Q08: ["C"],
    Q09: ["D"], Q10: ["LEGAL_TAX_DISPUTE", "GUARANTEE"], Q11: ["D"], Q12: ["D"],
    Q13: ["B"], Q14: ["C"],
  },
  persona3: {
    Q01: ["A"], Q02: ["BUSINESS", "CROSS_BORDER", "SUCCESSION"], Q03: ["B"], Q04: ["A"],
    Q05: ["A"], Q06: ["CASH", "PROPERTY", "BUSINESS", "INVESTMENT", "PROTECTION"], Q07: ["A"],
    Q08: ["A"], Q09: ["A"], Q10: ["NONE"], Q11: ["B"], Q12: ["B"], Q13: ["A"], Q14: ["A"],
  },
};

const expected = {
  persona1: { readiness: ["79", "79", "76", "70", "88", "38"], risks: 1, report: "READY", actions: 3 },
  persona2: { readiness: ["54", "61", "29", "0", "15", "50"], risks: 5, report: "NEEDS_MORE_INFO", actions: 0 },
  persona3: { readiness: ["100", "100", "100", "100", "73", "100"], risks: 0, report: "READY", actions: 1 },
};

const results = [];
const passed = (name) => {
  results.push({ name, status: "PASS" });
  console.log("PASS " + name);
};

async function loaded(page) {
  await page.locator("[data-wealth-page]").waitFor();
  await page.waitForLoadState("networkidle");
}

async function noOverflow(page, label) {
  const info = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    offenders: [...document.querySelectorAll("body *")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, id: element.id, right: rect.right, left: rect.left };
    }).filter(({ right, left }) => right > innerWidth + 1 || left < -1),
  }));
  assert.ok(info.scrollWidth <= info.innerWidth + 1, label + ": horizontal overflow " + JSON.stringify(info));
}

async function noindex(page, label) {
  const robots = ((await page.locator('meta[name="robots"]').getAttribute("content")) || "").toLowerCase();
  assert.match(robots, /noindex/, label + ": noindex missing");
  assert.match(robots, /nofollow/, label + ": nofollow missing");
}

async function goto(page, path, label) {
  const response = await page.goto(origin + path, { waitUntil: "networkidle" });
  assert.ok(response, label + ": no response");
  assert.equal(response.status(), 200, label + ": unexpected status");
  await loaded(page);
  await noOverflow(page, label);
}

async function landingChecks(page, locale, width) {
  const label = locale + " " + width + "px landing";
  await goto(page, "/" + locale, label);
  assert.equal(await page.locator("#wealth-title").count(), 1);
  assert.equal(await page.getByTestId("wealth-service").count(), 5, locale + ": five services");
  assert.equal(await page.locator("#global a").count(), 6, locale + ": six regions");
  assert.equal(await page.getByTestId("wealth-explorer").count(), 1);
  await noindex(page, locale + " landing");
  const search = page.locator("#wealth-search");
  await search.fill(locale === "zh" ? "跨境" : "cross-border");
  assert.ok(await page.locator('[data-testid="wealth-explorer"] h3').count() > 0, locale + ": search returned no guide");
  assert.match((await page.getByRole("status").innerText()).toLowerCase(), locale === "zh" ? /找到/ : /showing/);
  await page.getByRole("button", { name: locale === "zh" ? "清空筛选" : "Clear filters" }).click();
  assert.equal(await search.inputValue(), "");
  passed(label + ": structure, search and no overflow");
}

async function assessmentShell(page, locale, width) {
  const label = locale + " " + width + "px assessment";
  await goto(page, "/" + locale + "/compass", label);
  assert.equal(await page.getByTestId("wealth-assessment").count(), 1);
  await noindex(page, label);
  const consent = page.getByTestId("wealth-consent");
  assert.equal(await consent.isChecked(), false, locale + ": consent defaults off");
  assert.equal(await page.getByTestId("wealth-start").isDisabled(), true, locale + ": start gate");
  const privacy = await page.getByTestId("wealth-consent-panel").innerText();
  assert.match(privacy, locale === "zh" ? /不在服务器保存/ : /not saved on a server/i);
  assert.match(privacy, locale === "zh" ? /不上传/ : /not .*uploaded/i);
  assert.match(privacy, locale === "zh" ? /不构成投资建议/ : /not investment advice/i);
  assert.equal(
    await page.locator("header .locale-switch").getAttribute("href"),
    "/" + (locale === "zh" ? "en" : "zh") + "/compass",
    locale + ": locale switch route",
  );
  if (width === 390) {
    await page.locator("header .locale-switch").click();
    await loaded(page);
    assert.equal(new URL(page.url()).pathname, "/" + (locale === "zh" ? "en" : "zh") + "/compass");
  }
  passed(label + ": consent gate, noindex and language switch");
}

async function start(page) {
  await page.getByTestId("wealth-consent").check();
  await page.getByTestId("wealth-start").click();
  await page.locator('[role="progressbar"]').waitFor();
  assert.equal(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "0");
}

async function choose(page, codes) {
  const step = Number(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"));
  const id = "Q" + String(step + 1).padStart(2, "0");
  assert.match(id, /^Q\d{2}$/);
  for (const code of codes) {
    const input = page.locator('input[name="' + id + '"][value="' + code + '"]');
    assert.equal(await input.count(), 1, id + ": missing option " + code);
    await input.check();
  }
}

async function answerAll(page, answers) {
  for (let index = 1; index <= 14; index += 1) {
    const id = "Q" + String(index).padStart(2, "0");
    assert.equal(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"), String(index - 1), id + ": progress");
    await choose(page, answers[id]);
    await page.getByTestId("wealth-next").click();
    if (index < 14) await page.locator('[role="progressbar"]').waitFor();
  }
  await page.getByTestId("wealth-result").waitFor();
}

async function result(page) {
  const dimensions = await page.getByTestId("wealth-dimension").evaluateAll((cards) => cards.map((card) => ({
    code: card.querySelector("small")?.textContent?.trim() || "",
    value: card.querySelector("strong")?.textContent?.trim() || "",
  })));
  const resultText = await page.getByTestId("wealth-result").innerText();
  return {
    codes: dimensions.map((item) => item.code),
    readiness: dimensions.map((item) => item.value),
    risks: await page.locator('[data-testid="wealth-result"] ul li').count(),
    report: /结果已整理|results are ready/i.test(resultText) ? "READY" : "NEEDS_MORE_INFO",
    actions: await page.locator('[data-testid="wealth-result"] ol li').count(),
  };
}

async function personaFlow(page, locale, name, answers) {
  await goto(page, "/" + locale + "/compass", locale + " " + name);
  await start(page);
  await answerAll(page, answers);
  const actual = await result(page);
  assert.deepEqual(actual.codes, ["D1", "D2", "D3", "D4", "D5", "D6"]);
  assert.deepEqual(
    { readiness: actual.readiness, risks: actual.risks, report: actual.report, actions: actual.actions },
    expected[name],
    locale + " " + name + ": frozen fixture drift",
  );
  passed(locale + ": " + name + " frozen dimensions, risks and report state");
}

async function draftRestore(page, locale) {
  await goto(page, "/" + locale + "/compass", locale + " draft");
  await start(page);
  await choose(page, personas.persona1.Q01);
  await page.getByTestId("wealth-next").click();
  await choose(page, personas.persona1.Q02);
  await page.getByRole("button", { name: locale === "zh" ? "保存本次会话进度" : "Save this session's progress" }).click();
  assert.match(await page.getByRole("status").innerText(), locale === "zh" ? /已保存/ : /saved/i);
  assert.ok(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY));
  await page.reload({ waitUntil: "networkidle" });
  await loaded(page);
  const resume = page.getByRole("button", { name: locale === "zh" ? "继续已保存的进度" : "Resume saved progress" });
  assert.equal(await page.getByTestId("wealth-consent").isChecked(), false);
  assert.equal(await resume.isDisabled(), true, locale + ": draft must not bypass consent");
  await page.getByTestId("wealth-consent").check();
  await resume.click();
  assert.equal(await page.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "1");
  for (const code of personas.persona1.Q02) assert.equal(await page.locator('input[name="Q02"][value="' + code + '"]').isChecked(), true);
  passed(locale + ": draft save, reload, consent gate and restore");
  await page.getByRole("button", { name: locale === "zh" ? "退出并清除" : "Exit and clear" }).click();
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY), null);
}

async function allSkip(page, locale) {
  const answers = {};
  for (let i = 1; i <= 14; i += 1) answers["Q" + String(i).padStart(2, "0")] = ["SKIP"];
  await goto(page, "/" + locale + "/compass", locale + " all skip");
  await start(page);
  await answerAll(page, answers);
  const actual = await result(page);
  assert.deepEqual(actual.readiness, ["—", "—", "—", "—", "—", "—"]);
  assert.equal(actual.report, "NEEDS_MORE_INFO");
  assert.equal(actual.risks, 0);
  passed(locale + ": SKIP through all 14 questions stays incomplete");
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.WEALTH_BROWSER_PATH ? { executablePath: process.env.WEALTH_BROWSER_PATH } : {}),
});
const errors = [];
try {
  const shell = await browser.newContext();
  const shellPage = await shell.newPage();
  shellPage.on("pageerror", (error) => errors.push(error.message));
  for (const locale of locales) {
    for (const width of widths) {
      await shellPage.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
      await landingChecks(shellPage, locale, width);
      await assessmentShell(shellPage, locale, width);
    }
  }
  await shell.close();

  for (const locale of locales) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await draftRestore(page, locale);
    await personaFlow(page, locale, "persona1", personas.persona1);
    await context.close();
  }
  for (const name of ["persona2", "persona3"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await personaFlow(page, "zh", name, personas[name]);
    await context.close();
  }
  const skipContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const skipPage = await skipContext.newPage();
  skipPage.on("pageerror", (error) => errors.push(error.message));
  await allSkip(skipPage, "en");
  await skipContext.close();
  assert.deepEqual(errors, [], "browser runtime errors: " + errors.join("; "));
  passed("No browser runtime errors");
} catch (error) {
  results.push({ name: String(error), status: "FAIL" });
  throw error;
} finally {
  await writeFile(
    resolve(evidenceDir, "wealth-browser-results.json"),
    JSON.stringify({ origin, widths, locales, results, errors }, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify({
    passed: results.filter((item) => item.status === "PASS").length,
    failed: results.filter((item) => item.status === "FAIL").length,
    evidence: resolve(evidenceDir, "wealth-browser-results.json"),
  }));
}
