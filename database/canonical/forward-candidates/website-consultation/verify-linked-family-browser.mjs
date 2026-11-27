import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bundleComponents } from "../../verification/p1/browser.mjs";

const site = new URL("../../../../website/phoenix-nova-website-v5/", import.meta.url);
const projectTitle = "Synthetic linked education service";
const brandPath = "/brand/official/v3/phoenix-nova-header@2x.png";

export async function verifyLinkedFamilyBrowser({ origin, project, bridge, revoke, openBrowser }) {
  const bundle = await bundleComponents();
  const css = (await Promise.all(["family-center-v2.css", "family-service-overview.css", "service-workbench.css"]
    .map(name => readFile(new URL("components/" + name, site), "utf8")))).join("\n");
  const logo = await readFile(new URL("public" + brandPath, site));
  const html = '<!doctype html><html lang="en"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="stylesheet" href="/fixture.css"><body>' +
    '<p>Isolated synthetic browser component harness</p><div id="root"></div><script src="/fixture.js"></script></body></html>';
  const output = process.env.CRM_FIXTURE_PREVIEW_DIR;
  if (output) await mkdir(output, { recursive: true });
  const browser = await openBrowser();
  try {
    for (const [locale, width] of [["en", 1440], ["zh", 390]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: "Asia/Shanghai" });
      try {
        await context.addCookies([{ name: "fixture-session", value: "linked-family", url: origin, httpOnly: true }]);
        await context.route("**/*", async route => {
          const inbound = route.request();
          const url = new URL(inbound.url());
          if (url.origin !== origin) return route.abort();
          if (url.pathname === "/fixture.js") return route.fulfill({ body: bundle, contentType: "text/javascript; charset=utf-8" });
          if (url.pathname === "/fixture.css") return route.fulfill({ body: css, contentType: "text/css; charset=utf-8" });
          if (url.pathname === brandPath) return route.fulfill({ body: logo, contentType: "image/png" });
          const match = /^\/api\/(?:family-services|service-workbench)\/(.+)$/.exec(url.pathname);
          if (match) {
            const request = new Request(url, { method: inbound.method(), headers: await inbound.allHeaders() });
            const response = await bridge(request, match[1]);
            return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers),
              body: Buffer.from(await response.arrayBuffer()) });
          }
          if (url.pathname === "/" + locale + "/family-center" || url.pathname === "/" + locale + "/my-services/" + project) {
            return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
          }
          return route.fulfill({ status: 404, body: "Fixture route unavailable" });
        });
        const page = await context.newPage();
        const home = origin + "/" + locale + "/family-center";
        const detail = "/" + locale + "/my-services/" + project;
        await page.goto(home);
        const overview = page.locator("[data-family-service-overview]");
        await overview.getByRole("heading", { name: projectTitle, exact: true }).waitFor();
        await page.waitForFunction(path => Array.from(document.images).some(image =>
          new URL(image.currentSrc || image.src).pathname === path && image.complete && image.naturalWidth > 0), brandPath);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if (output) await page.screenshot({ path: resolve(output, "linked-family-" + locale + "-" + width + ".png"), fullPage: true });
        await overview.locator('a[href="' + detail + '"]').first().click();
        await page.getByRole("heading", { name: projectTitle, exact: true }).waitFor();
        await page.getByRole("button", { name: locale === "en" ? "Messages" : "顾问沟通", exact: true }).click();
        await page.getByText("Synthetic feedback on the first delivery milestone", { exact: true }).waitFor();
        if (locale === "zh") {
          revoke();
          await page.goto(home);
          await overview.getByRole("alert").waitFor();
          assert.equal(await page.getByText(projectTitle, { exact: true }).count(), 0);
        }
      } finally {
        await context.close();
      }
    }
    console.log("PASS Family component browser on the same CRM project: 1440px English, 390px Chinese, feedback and revocation");
  } finally {
    await browser.close();
  }
}
