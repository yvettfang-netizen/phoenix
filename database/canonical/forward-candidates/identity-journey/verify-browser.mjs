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
            identityInbox={${view === "inbox"}} identityTimeline={${view === "timeline"}} />
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

async function withFamilyView({ handle, apiPath, view }, verify) {
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
      if (url.pathname === apiPath) {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const verifiedCookie = String(request.headers.cookie ?? "").split(";").some(cookie => cookie.trim() === `inbox=${sessionCookie}`);
        const upstream = await handle(new Request(url, {
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
