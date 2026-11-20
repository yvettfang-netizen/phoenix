import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const previewDir = resolve(here, "../../../website/phoenix-nova-website-v5/docs/previews/academic-studio-v21");
const moduleRef = process.env.PLAYWRIGHT_MODULE_PATH;
const playwright = moduleRef ? await import(pathToFileURL(resolve(moduleRef)).href) : await import("playwright");
const edge = process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await playwright.chromium.launch({ executablePath: edge, headless: true });
const pages = ["student-center", "course-detail", "student-timetable", "parent-growth", "teacher-workbench", "admin-workbench"];
const results = [];
try {
  for (const id of pages) {
    for (const mode of ["desktop", "mobile"]) {
      const viewport = mode === "desktop" ? { width: 1365, height: 900 } : { width: 390, height: 844 };
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(pathToFileURL(resolve(previewDir, `${id}.html`)).href);
      await page.locator("#page-title").waitFor();
      const metrics = await page.evaluate(() => {
        const logo = document.querySelector(".brand-card img");
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          heading: document.querySelector("#page-title")?.textContent,
          logoLoaded: Boolean(logo?.complete && logo.naturalWidth > 0),
          disabledButtons: document.querySelectorAll("button[disabled]").length,
        };
      });
      if (errors.length || !metrics.logoLoaded || metrics.documentWidth > metrics.viewportWidth) {
        throw new Error(`${id}/${mode}: ${JSON.stringify({ metrics, errors })}`);
      }
      const file = resolve(here, `evidence/${id}-${mode}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
      results.push({ id, mode, ...metrics, screenshot: `evidence/${id}-${mode}.png`, sha256, errors });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(resolve(here, "evidence/preview-browser-results.json"), JSON.stringify({
  schemaVersion: "academic-studio-v21-p0-preview-browser.v1",
  capturedAt: new Date().toISOString(),
  browser: "Microsoft Edge Chromium headless",
  results,
}, null, 2) + "\n");
console.log(JSON.stringify({ pages: pages.length, captures: results.length, desktop: 6, mobile: 6, overflow: 0, pageErrors: 0, logoLoaded: 12 }));
