import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const website = fileURLToPath(new URL("../../../../website/phoenix-nova-website-v5/", import.meta.url));
const require = createRequire(join(website, "package.json"));

async function bundleFamilyCenter(view) {
  const { build } = require("esbuild");
  const result = await build({
    stdin: {
      loader: "tsx",
      resolveDir: website,
      contents: `
        import { createRoot } from "react-dom/client";
        import { FamilyCenterV2 } from "./components/family-center-v2";
        const locale = location.pathname.startsWith("/zh") ? "zh" : "en";
        document.documentElement.lang = locale;
        createRoot(document.getElementById("root")).render(
          <FamilyCenterV2 locale={locale} account workbench
            identityInbox={${view === "inbox"}} identityTimeline={${view === "timeline"}}
            identityResidence={${view === "residence"}} identityProfile={${view === "profile" || view === "member-residence" || view === "review-planning"}}
            identityMemberResidence={${view === "member-residence"}} identityReviewPlanning={${view === "review-planning"}} />
        );`,
    },
    bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", jsx: "automatic",
    alias: { "@": website },
    plugins: [{
      name: "isolated-next-components",
      setup(builder) {
        builder.onResolve({ filter: /^next\/(link|image)$/ }, ({ path }) => ({ path, namespace: "framework" }));
        builder.onLoad({ filter: /.*/, namespace: "framework" }, ({ path }) => ({
          loader: "jsx", resolveDir: website,
          contents: path.endsWith("/link")
            ? 'export default function Link({ children, prefetch, ...props }) { return <a {...props}>{children}</a>; }'
            : 'export default function Image({ unoptimized, ...props }) { return <img {...props}/>; }',
        }));
        builder.onLoad({ filter: /\.css$/ }, () => ({ loader: "js", contents: "" }));
      },
    }],
  });
  return result.outputFiles[0].text;
}

async function withFamilyView({ handle, apiPath, view, secondary }, verify) {
  const output = process.env.IDENTITY_BROWSER_EVIDENCE_DIR;
  await mkdir(output, { recursive: true });
  const { chromium } = await import(pathToFileURL(join(process.env.PLAYWRIGHT_MODULE, "index.mjs")).href);
  const bundle = await bundleFamilyCenter(view);
  const css = (await Promise.all(["family-center-v2.css", "family-service-center-panels.css", "family-service-overview.css"]
    .map(file => readFile(join(website, "components", file), "utf8")))).join("\n");
  const publicRoot = resolve(website, "public");
  const sessionCookie = "synthetic-identity-inbox";
  let origin;
  const server = createServer(async (request, response) => {
    const send = (status, body, type) => {
      response.writeHead(status, { "content-type": type, "cache-control": "private, no-store" });
      response.end(body);
    };
    try {
      const url = new URL(request.url, origin);
      if (url.pathname === "/assets/identity-inbox.js") return send(200, bundle, "text/javascript");
      if (url.pathname === "/assets/identity-inbox.css") return send(200, css, "text/css");
      const handler = url.pathname === apiPath ? handle : url.pathname === secondary?.path ? secondary.handle : undefined;
      if (handler) {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const verifiedCookie = String(request.headers.cookie ?? "").split(";").some(cookie => cookie.trim() === `inbox=${sessionCookie}`);
        const upstream = await handler(new Request(url, {
          method: request.method, headers: request.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
        }), origin, verifiedCookie);
        response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
        response.end(Buffer.from(await upstream.arrayBuffer()));
        return;
      }
      if (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/images/")) {
        const asset = resolve(publicRoot, "." + decodeURIComponent(url.pathname));
        if (!asset.startsWith(publicRoot + sep)) return send(404, "", "text/plain");
        const type = asset.endsWith(".png") ? "image/png" : asset.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
        return send(200, await readFile(asset), type);
      }
      if (!/^\/(en|zh)\/family-center$/.test(url.pathname)) return send(404, "", "text/plain");
      return send(200, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Family OS synthetic browser acceptance</title><link rel="stylesheet" href="/assets/identity-inbox.css"></head>
        <body><div id="root"></div><script src="/assets/identity-inbox.js"></script></body></html>`, "text/html; charset=utf-8");
    } catch {
      send(503, "Isolated browser server unavailable", "text/plain");
    }
  });
  await new Promise((ready, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", ready);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
    const pageFor = async (locale, width) => {
      const context = await browser.newContext({ viewport: { width, height: 940 }, locale, timezoneId: "Europe/London" });
      await context.addCookies([{ name: "inbox", value: sessionCookie, url: origin, httpOnly: true, sameSite: "Lax" }]);
      const page = await context.newPage();
      await page.goto(`${origin}/${locale}/family-center`);
      return page;
    };
    await verify({ pageFor, output });
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(done => server.close(done));
  }
}

export async function verifyFamilyInboxBrowser({ handle, noticePath, revokeGrant, receiptCount }) {
  await withFamilyView({ handle, apiPath: noticePath, view: "inbox" }, async ({ pageFor, output }) => {
    const run = async (locale, width, label) => {
      const page = await pageFor(locale, width);
      const heading = locale === "zh" ? "身份提醒" : "Identity notifications";
      const bell = page.getByRole("button", { name: locale === "zh" ? "通知" : "Notifications", exact: true });
      await bell.click();
      const inbox = page.getByRole("region", { name: heading });
      const items = inbox.getByRole("listitem");
      await items.first().waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.equal(await items.count(), 3);
      await page.screenshot({ path: join(output, label + ".png"), fullPage: true });
      return { page, inbox, bell };
    };
    const desktop = await run("en", 1440, "family-inbox-en-desktop-1440");
    assert.equal(receiptCount(), 2);
    const readButton = desktop.inbox.getByRole("button", { name: "Mark as read" });
    const post = desktop.page.waitForResponse(response => response.url().endsWith(noticePath) && response.request().method() === "POST");
    await readButton.click();
    const acknowledged = await post;
    assert.equal(acknowledged.status(), 200);
    assert.equal(acknowledged.headers()["cache-control"], "private, no-store");
    assert.equal(receiptCount(), 3);
    await readButton.waitFor({ state: "hidden" });
    assert.equal(await desktop.inbox.getByText("Read", { exact: true }).count(), 3);
    const mobile = await run("zh", 390, "family-inbox-zh-mobile-390");
    assert.equal(await mobile.inbox.getByText("已读", { exact: true }).count(), 3);
    revokeGrant();
    await mobile.page.reload();
    await mobile.bell.click();
    await mobile.inbox.getByText("当前会话无法读取提醒。", { exact: true }).waitFor();
    assert.equal(await mobile.inbox.getByRole("listitem").count(), 0);
    assert.equal(receiptCount(), 3);
    await mobile.page.screenshot({ path: join(output, "family-inbox-zh-mobile-revoked.png"), fullPage: true });
    await writeFile(join(output, "ACCEPTANCE.json"), JSON.stringify({
      status: "PASS", harness: "FamilyCenterV2 Chromium, real HTTP handler and isolated PostgreSQL, synthetic trusted session",
      viewports: ["en desktop 1440", "zh mobile 390"], checks: ["open notification bell", "no auto-acknowledgement",
        "explicit acknowledgement persists across locales", "revoked consent removes notice list", "no horizontal overflow"],
    }, null, 2));
  });
}

export async function verifyFamilyTimelineBrowser({ handle, apiPath, expectedDate, revoke }) {
  await withFamilyView({ handle, apiPath, view: "timeline" }, async ({ pageFor, output }) => {
    const open = async (locale, width, filename) => {
      const page = await pageFor(locale, width);
      const nav = page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ });
      const timeline = page.getByRole("region", { name: locale === "zh" ? "获准逗留期限" : "Permitted stay timeline" });
      await nav.click();
      await timeline.locator('[data-date-status="current"] time').first().waitFor();
      assert.equal(await timeline.locator('[data-date-status="current"] time').first().getAttribute("datetime"), expectedDate);
      assert.equal(await timeline.locator('[data-date-status="historical"]').count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: join(output, filename), fullPage: true });
      return { page, nav, timeline };
    };
    await open("en", 1440, "identity-timeline-en-desktop.png");
    const mobile = await open("zh", 390, "identity-timeline-zh-mobile.png");
    revoke();
    await mobile.page.reload();
    await mobile.nav.click();
    await mobile.timeline.getByText("当前会话无法读取期限。", { exact: true }).waitFor();
    assert.equal(await mobile.timeline.locator("time").count(), 0);
    console.log("PASS Chromium Family OS permitted stay timeline, history, responsive and revoked access");
  });
}

export async function verifyFamilyResidenceBrowser({ handle, apiPath, revokeRead }) {
  await withFamilyView({ handle, apiPath, view: "residence" }, async ({ pageFor, output }) => {
    const open = async (locale, width) => {
      const page = await pageFor(locale, width);
      const nav = page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ });
      const residence = page.getByRole("region", { name: locale === "zh"
        ? "出入境与通常居住记录" : "Travel, entry and ordinary residence records" });
      await nav.click();
      await residence.getByText(locale === "zh" ? "护照资格：需人工核验" : "Passport eligibility: human review required").waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      return { page, residence };
    };
    const desktop = await open("en", 1440);
    const begin = desktop.residence.getByLabel("Start date (inclusive)");
    const end = desktop.residence.getByLabel("End date (exclusive)");
    const asOf = Date.parse((await end.getAttribute("max")) + "T00:00:00Z");
    const fromDay = new Date(asOf - 50 * 86_400_000).toISOString().slice(0, 10);
    const toDay = new Date(asOf - 49 * 86_400_000).toISOString().slice(0, 10);
    await begin.fill(fromDay);
    await end.fill(toDay);
    await desktop.residence.getByLabel("Location", { exact: true }).selectOption("HK");
    const pending = desktop.page.waitForResponse(response => response.url().endsWith(apiPath) && response.request().method() === "POST");
    await desktop.residence.getByRole("button", { name: "Submit record" }).click();
    assert.equal((await pending).status(), 201);
    await desktop.residence.locator(`time[datetime="${fromDay}"]`).waitFor();
    await desktop.page.screenshot({ path: join(output, "identity-residence-en-desktop.png"), fullPage: true });
    const mobile = await open("zh", 390);
    await mobile.residence.locator(`time[datetime="${toDay}"]`).waitFor();
    assert.ok(await mobile.residence.locator(".fc-residence-dates time").evaluateAll(dates => dates.length > 0 &&
      dates.every(date => getComputedStyle(date).whiteSpace === "nowrap" && date.scrollWidth <= date.clientWidth)));
    await mobile.residence.getByText("待核验区间", { exact: false }).first().click();
    await mobile.page.screenshot({ path: join(output, "identity-residence-zh-mobile.png"), fullPage: true });
    revokeRead();
    await mobile.residence.getByRole("button", { name: "刷新记录" }).click();
    await mobile.residence.getByText("当前会话无法读取这些记录。", { exact: true }).waitFor();
    assert.equal(await mobile.residence.locator("time").count(), 0);
    assert.equal(await mobile.residence.getByRole("button", { name: "提交记录" }).count(), 0);
    console.log("PASS Chromium Family OS residence reporting, bilingual history, no overflow and revoked access");
  });
}

export async function verifyOfficialTravelBrowser({ handle, apiPath, arrivalDate, departureDate }) {
  await withFamilyView({ handle, apiPath, view: "residence" }, async ({ pageFor, output }) => {
    for (const [locale, width, title, arrival, departure] of [
      ["en", 1440, "Verified travel dates", "Arrival", "Departure"],
      ["zh", 390, "已核验出入境日期", "入境／抵港", "出境／离港"],
    ]) {
      const page = await pageFor(locale, width);
      await page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ }).click();
      const panel = page.getByRole("region", { name: title });
      await panel.locator("article").filter({ hasText: arrival }).locator(`time[datetime="${arrivalDate}"]`).waitFor();
      await panel.locator("article").filter({ hasText: departure }).locator(`time[datetime="${departureDate}"]`).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: join(output, `identity-official-travel-${locale}-${width}.png`), fullPage: true });
    }
    console.log("PASS Chromium Family OS verified travel dates in English desktop and Chinese mobile");
  });
}

export async function verifyFamilyMemberProfileBrowser({ handle, apiPath, revokeGuardian, guardianLabel, selfLabel, childDate, selfDate }) {
  assert.notEqual(childDate, selfDate);
  await withFamilyView({ handle, apiPath, view: "profile" }, async ({ pageFor, output }) => {
    const open = async (locale, width) => {
      const page = await pageFor(locale, width);
      const nav = page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ });
      await nav.click();
      const panel = page.getByRole("region", { name: locale === "zh" ? "成员身份档案" : "Member identity profile" });
      const self = panel.getByRole("button", { name: new RegExp(selfLabel) });
      const dependent = panel.getByRole("button", { name: new RegExp(guardianLabel) });
      return { page, panel, self, dependent };
    };
    const desktop = await open("en", 1440);
    await desktop.self.click();
    await desktop.panel.locator(`time[datetime="${selfDate}"]`).waitFor();
    assert.equal(await desktop.panel.locator(`time[datetime="${childDate}"]`).count(), 0);
    await desktop.dependent.click();
    await desktop.panel.locator(`time[datetime="${childDate}"]`).waitFor();
    assert.equal(await desktop.panel.locator(`time[datetime="${selfDate}"]`).count(), 0);
    await desktop.page.screenshot({ path: join(output, "identity-profile-en-desktop.png"), fullPage: true });

    const mobile = await open("zh", 390);
    await mobile.dependent.click();
    await mobile.panel.locator(`time[datetime="${childDate}"]`).waitFor();
    assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await mobile.page.screenshot({ path: join(output, "identity-profile-zh-mobile.png"), fullPage: true });
    revokeGuardian();
    await mobile.dependent.click();
    await mobile.panel.getByText("此资料未获授权，暂不显示。", { exact: true }).waitFor();
    assert.equal(await mobile.panel.locator("time").count(), 0);
    assert.equal(await mobile.dependent.count(), 0);
    console.log("PASS Chromium Family OS switches between authorized member histories and clears revoked guardian profile");
  });
}

export async function verifyOpenEndedIdentityBrowser({ handle, apiPath, withdrawEvidence }) {
  await withFamilyView({ handle, apiPath, view: "profile" }, async ({ pageFor, output }) => {
    async function open(locale, width, caption, label) {
      const page = await pageFor(locale, width);
      const title = locale === "zh" ? "成员身份档案" : "Member identity profile";
      await page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ }).click();
      const panel = page.getByRole("region", { name: title });
      const self = panel.getByRole("button", { name: /Synthetic member/ });
      await self.click();
      const verified = panel.getByText(caption, { exact: true });
      await verified.waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: join(output, label + ".png"), fullPage: true });
      return { page, panel, self, verified };
    }
    await open("en", 1440, "The verified decision for this stage specifies no fixed limit of stay.",
      "identity-open-ended-en-desktop");
    const mobile = await open("zh", 390, "该阶段的已核验决定未设固定逗留期限。",
      "identity-open-ended-zh-mobile");
    withdrawEvidence();
    const response = mobile.page.waitForResponse(reply =>
      reply.url().endsWith(apiPath) && reply.request().method() === "POST");
    await mobile.self.click();
    assert.equal((await response).status(), 200);
    await mobile.verified.waitFor({ state: "hidden" });
    await mobile.panel.getByText("未显示获准逗留期限。", { exact: true }).waitFor();
    assert.equal(await mobile.panel.getByRole("heading", { name: "香港永久居民身份" }).count(), 0);
    await mobile.page.screenshot({ path: join(output, "identity-open-ended-withdrawn-zh-mobile.png"), fullPage: true });
  });
  console.log("PASS Chromium verified no fixed stay expiry on English desktop and Chinese mobile, with withdrawal");
}

export async function verifySponsorshipBrowser({ handle, apiPath, sponsorship }) {
  await withFamilyView({ handle, apiPath, view: "profile" }, async ({ pageFor, output }) => {
    const ended = sponsorship.status === "ENDED";
    for (const [locale, width, title, caption] of [
      ["en", 1440, "Member identity profile", ended ? "Verified end of sponsorship" : "Verified sponsorship recorded"],
      ["zh", 390, "成员身份档案", ended ? "已核验的保证关系结束" : "已核验的保证关系记录"],
    ]) {
      const page = await pageFor(locale, width);
      await page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ }).click();
      const panel = page.getByRole("region", { name: title });
      await panel.getByRole("button", { name: /Synthetic member/ }).click();
      await panel.getByText(caption, { exact: true }).waitFor();
      await panel.locator(`time[datetime="${sponsorship.effectiveOn}"]`).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: join(output, `identity-sponsorship-${locale}-${width}.png`), fullPage: true });
    }
  });
  console.log("PASS Chromium shows only verified dependant sponsorship status and effective date on English desktop and Chinese mobile");
}

export async function verifyFamilyMemberResidenceBrowser({
  profilePath, handleProfile, residencePath, handleResidence, guardianLabel, selfLabel,
  childFrom, revokeResidence, restoreResidence,
}) {
  const secondary = { path: residencePath, handle: handleResidence };
  let holdProfileResponse = null;
  async function handle(request, origin, hasSession) {
    if (request.method === "POST" && holdProfileResponse) await holdProfileResponse;
    return handleProfile(request, origin, hasSession);
  }
  await withFamilyView({ handle, apiPath: profilePath, view: "member-residence", secondary }, async ({ pageFor, output }) => {
    const open = async (locale, width) => {
      const page = await pageFor(locale, width);
      await page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ }).click();
      const profile = page.getByRole("region", { name: locale === "zh" ? "成员身份档案" : "Member identity profile" });
      const guardian = profile.getByRole("button", { name: new RegExp(guardianLabel) });
      const self = profile.getByRole("button", { name: new RegExp(selfLabel) });
      await guardian.click();
      const residence = profile.locator("[data-identity-member-residence]");
      await residence.locator(`time[datetime="${childFrom}"]`).waitFor();
      assert.equal(await residence.locator("form").count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: join(output, `identity-member-residence-${locale}-${width}.png`), fullPage: true });
      return { profile, guardian, self, residence };
    };
    const desktop = await open("en", 1440);
    const { promise, resolve } = Promise.withResolvers();
    holdProfileResponse = promise;
    try {
      await desktop.self.click();
      await desktop.residence.waitFor({ state: "hidden" });
    } finally {
      holdProfileResponse = null;
      resolve();
    }
    const mobile = await open("zh", 390);
    await revokeResidence();
    try {
      await mobile.residence.getByRole("button", { name: "刷新记录" }).click();
      await mobile.residence.getByRole("status").filter({ hasText: /无法读取/ }).waitFor();
      assert.equal(await mobile.residence.locator("time").count(), 0);
      assert.equal(await mobile.guardian.getAttribute("aria-pressed"), "true");
      await mobile.profile.getByRole("heading", { name: "受养人身份" }).waitFor();
    } finally {
      await restoreResidence();
    }
    console.log("PASS Chromium Family OS isolates selected member residence and clears a separately revoked residence grant");
  });
}

export async function verifyIdentityReviewPlanningBrowser({
  profilePath, planningPath, handleProfile, handlePlanning,
  ownLabel, guardianLabel, initialOn, saveOn, verifySaved,
}) {
  assert.equal(typeof profilePath, "string");
  assert.equal(typeof planningPath, "string");
  assert.equal(typeof handleProfile, "function");
  assert.equal(typeof handlePlanning, "function");
  assert.equal(typeof verifySaved, "function");
  assert.match(initialOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(saveOn, /^\d{4}-\d{2}-\d{2}$/);

  const secondary = { path: planningPath, handle: handlePlanning };
  await withFamilyView({ handle: handleProfile, apiPath: profilePath, view: "review-planning", secondary }, async ({ pageFor, output }) => {
    const open = async (locale, width) => {
      const page = await pageFor(locale, width);
      await page.getByRole("button", { name: locale === "zh" ? /我的身份/ : /My Identity/ }).click();
      const profile = page.getByRole("region", { name: locale === "zh" ? "成员身份档案" : "Member identity profile" });
      const own = profile.getByRole("button", { name: new RegExp(ownLabel) });
      const guardian = profile.getByRole("button", { name: new RegExp(guardianLabel) });
      return { page, profile, own, guardian };
    };

    const desktop = await open("en", 1440);
    await desktop.own.click();
    const desktopPlanner = desktop.profile.getByRole("region", { name: "Identity planning" });
    await desktopPlanner.waitFor();
    await desktopPlanner.getByText(`Current date: ${initialOn}`).waitFor();
    const ownPlan = desktopPlanner.getByRole("button").filter({ hasText: initialOn }).first();
    await ownPlan.click();
    const date = desktopPlanner.getByLabel("Planning date", { exact: true });
    await date.fill(saveOn);
    const reminder = desktopPlanner.getByRole("checkbox", { name: "7 days before", exact: true });
    await reminder.check();
    assert.equal(await reminder.isChecked(), true);
    const saveButton = desktopPlanner.getByRole("button", { name: "Save planning date", exact: true });
    assert.equal(await saveButton.isDisabled(), true);
    await desktopPlanner.getByRole("checkbox", { name: /I confirm this date/ }).check();

    const isSave = request => request.url().endsWith(planningPath) && request.method() === "POST" &&
      request.postDataJSON()?.action === "save";
    const saveRequest = desktop.page.waitForRequest(isSave);
    const saveResponse = desktop.page.waitForResponse(response =>
      isSave(response.request()));
    await saveButton.click();
    const request = await saveRequest;
    const payload = JSON.parse(request.postData() ?? "{}");
    assert.equal(payload.action, "save");
    assert.equal(payload.on, saveOn);
    assert.equal(payload.confirmed, true);
    assert.ok(Array.isArray(payload.offsets) && payload.offsets.length > 0);
    assert.equal((await saveResponse).status(), 200);
    await desktopPlanner.getByText("Planning date saved.", { exact: true }).waitFor();
    await desktopPlanner.getByText(`Current date: ${saveOn}`).waitFor();
    await verifySaved();
    assert.ok(await desktop.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await desktop.page.screenshot({ path: join(output, "identity-review-planning-en-desktop.png"), fullPage: true });

    const mobile = await open("zh", 390);
    await mobile.own.click();
    const mobilePlanner = mobile.profile.getByRole("region", { name: "身份规划" });
    await mobilePlanner.waitFor();
    await mobilePlanner.getByText(`当前日期：${saveOn}`).waitFor();
    assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await mobile.page.screenshot({ path: join(output, "identity-review-planning-zh-mobile.png"), fullPage: true });

    await mobile.guardian.click();
    await mobilePlanner.waitFor({ state: "hidden" });
    assert.equal(await mobile.profile.getByRole("region", { name: "身份规划" }).count(), 0);
    assert.equal(await mobile.guardian.getAttribute("aria-pressed"), "true");
    assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await mobile.page.screenshot({ path: join(output, "identity-review-planning-zh-mobile-guardian.png"), fullPage: true });
    console.log("PASS Chromium Family OS identity review planning, consented save, persisted date, guardian isolation and responsive layout");
  });
}
