import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const playwrightPath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = playwrightPath && !playwrightPath.endsWith(".mjs")
  ? createRequire(import.meta.url)(playwrightPath)
  : await import(playwrightPath ? pathToFileURL(playwrightPath).href : "playwright");
const out = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v31");
await mkdir(out, { recursive: true });
const origins = [process.env.IDENTITY_V31_ORIGIN || "http://127.0.0.1:44631", process.env.IDENTITY_V31_PUBLIC_ORIGIN || "http://127.0.0.1:44632"];
const browser = await chromium.launch({ headless: true, ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}) });
const results = [];
try {
  const page = await browser.newPage();
  for (const origin of origins) for (const locale of ["zh", "en"]) {
    const response = await page.goto(`${origin}/${locale}/identity/import-review`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 404, "Import must remain unavailable even with the legacy import flag enabled");
    assert.equal(await page.locator('input[type="file"]').count(), 0);
    assert.equal(await page.locator('#cbi-import-file').count(), 0);
    assert.equal(await page.getByRole("button", { name: /批准发布|Publish|导入|Import/i }).count(), 0);
    results.push({ origin, locale, status: "PASS", import: "DISABLED" });
  }
} finally {
  await writeFile(resolve(out, "import-browser-results.json"), JSON.stringify({ results }, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results));
