import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

const site = new URL("../../../../website/phoenix-nova-website-v5/", import.meta.url);
const types = { js: "text/javascript", css: "text/css", png: "image/png", webp: "image/webp", svg: "image/svg+xml", woff2: "font/woff2" };

export async function verifyBrowserConsultation({ browser, config, receiver }) {
  const origin = config.WEBSITE_CONSULTATION_PUBLIC_ORIGIN;
  const envModule = "data:text/javascript," + encodeURIComponent("export const env = " + JSON.stringify(config) + ";");
  const hook = registerHooks({ resolve(specifier, context, next) {
    if (specifier === "cloudflare:workers") return { url: envModule, shortCircuit: true };
    return next(specifier, context);
  } });
  const fetchOriginal = globalThis.fetch;
  let rejectNext = false;
  globalThis.fetch = async (url, init) => {
    const request = new Request(url, init);
    if (request.url === config.WEBSITE_CONSULTATION_RECEIVER_URL) {
      if (rejectNext) {
        rejectNext = false;
        return Response.json({ code: "SYNTHETIC_RETRY" }, { status: 503 });
      }
      return receiver(request);
    }
    return fetchOriginal(url, init);
  };
  try {
    const { default: worker } = await import(new URL("dist/server/index.js", site).href);
    const assets = async request => {
      const path = new URL(request.url).pathname;
      if (!/^\/(?:_next\/static|images|brand)\/[a-zA-Z0-9@_./-]+$/.test(path)) return new Response(null, { status: 404 });
      const contentType = types[path.split(".").at(-1)];
      if (!contentType) return new Response(null, { status: 404 });
      for (const directory of ["dist/client", "dist/server"]) {
        try {
          const bytes = await readFile(new URL(directory + path, site));
          return new Response(bytes, { headers: { "Content-Type": contentType } });
        } catch { /* Next build output location. */ }
      }
      return new Response(null, { status: 404 });
    };
    for (const [locale, width] of [["zh", 320], ["en", 390]]) {
      const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: true, hasTouch: true });
      try {
        await context.route(origin + "/**", async route => {
          const inbound = route.request();
          const body = inbound.postDataBuffer();
          const request = new Request(inbound.url(), { method: inbound.method(),
            headers: await inbound.allHeaders(), ...(body ? { body } : {}) });
          let response = await assets(request);
          if (response.status === 404) {
            response = await worker.fetch(request, { ASSETS: { fetch: assets } }, { waitUntil() {}, passThroughOnException() {} });
          }
          await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers),
            body: Buffer.from(await response.arrayBuffer()) });
        });
        const page = await context.newPage();
        assert.equal((await page.goto(origin + "/" + locale + "/consultation")).status(), 200);
        const zh = locale === "zh";
        const policy = page.getByRole("link", { name: zh ? "阅读隐私政策" : "Read the privacy policy" });
        assert.equal(await policy.getAttribute("href"), config[zh ? "WEBSITE_CONSULTATION_PRIVACY_ZH_URL" : "WEBSITE_CONSULTATION_PRIVACY_EN_URL"]);
        assert.equal(await page.locator("html").getAttribute("lang"), zh ? "zh-Hans" : "en");
        await Promise.all([page.waitForURL(origin + "/" + locale + "/privacy"), policy.click()]);
        await page.getByText(config[zh ? "WEBSITE_PRIVACY_POLICY_ZH" : "WEBSITE_PRIVACY_POLICY_EN"], { exact: true }).waitFor();
        assert.equal(await page.locator("html").getAttribute("lang"), zh ? "zh-Hans" : "en");
        await page.goto(origin + "/" + locale + "/consultation");
        await page.getByLabel(zh ? "咨询方向" : "Service area").selectOption("wealth");
        const email = page.getByRole("textbox", { name: zh ? "电子邮箱" : "Email address", exact: true });
        await email.fill("browser-" + locale + "@example.test");
        await page.getByRole("checkbox").check();
        const submit = page.getByRole("button", { name: zh ? "提交咨询" : "Submit enquiry" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (zh) {
          rejectNext = true;
          await submit.click();
          await page.getByRole("status").filter({ hasText: "暂时无法确认收到" }).waitFor({ timeout: 10000 });
        }
        await submit.click();
        await page.getByRole("status").filter({ hasText: zh ? "已收到您的咨询" : "Your enquiry was received" }).waitFor({ timeout: 10000 });
        assert.equal(await email.count(), 0);
      } finally {
        await context.close();
      }
    }
  } finally {
    globalThis.fetch = fetchOriginal;
    hook.deregister();
  }
}
