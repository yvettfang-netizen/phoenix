import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import ExcelJS from "exceljs";

const playwrightPath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = playwrightPath && !playwrightPath.endsWith(".mjs")
  ? createRequire(import.meta.url)(playwrightPath)
  : await import(playwrightPath ? pathToFileURL(playwrightPath).href : "playwright");
const out = resolve(process.env.IDENTITY_EVIDENCE_DIR || "outputs/identity-v31");
await mkdir(resolve(out, "import-inputs"), { recursive: true });
const raw = await readFile(new URL("../lib/cbi-data.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { cbiCountries } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const row = cbiCountries[0];
const headers = Object.keys(row);
const cell = value => value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
const quote = value => '"' + cell(value).replaceAll('"', '""') + '"';
const jsonPath = resolve(out, "import-inputs/review-record.json");
const csvPath = resolve(out, "import-inputs/review-record.csv");
const xlsxPath = resolve(out, "import-inputs/review-record.xlsx");
await writeFile(jsonPath, JSON.stringify([row], null, 2));
await writeFile(csvPath, headers.join(",") + "\n" + headers.map(key => quote(row[key])).join(",") + "\n");
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Review");
sheet.addRow(headers);
sheet.addRow(headers.map(key => cell(row[key])));
await workbook.xlsx.writeFile(xlsxPath);
const origin = process.env.IDENTITY_V31_ORIGIN || "http://127.0.0.1:44631";
const browser = await chromium.launch({ headless: true, ...(process.env.IDENTITY_BROWSER ? { executablePath: process.env.IDENTITY_BROWSER } : {}) });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [format, file] of [["csv", csvPath], ["xlsx", xlsxPath], ["json", jsonPath]]) {
    const response = await page.goto(origin + "/zh/identity/import-review", { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, "Internal import preview must be explicitly enabled");
    const writes = [];
    page.on("request", request => { if (request.method() !== "GET") writes.push(request.url()); });
    await page.locator("#cbi-import-file").setInputFiles(file);
    await page.getByRole("heading", { name: "导入批次" }).waitFor();
    assert.match(await page.locator("main").textContent(), /IMPORT_REVIEW/);
    assert.match(await page.locator("main").textContent(), /不发布|不写入/);
    assert.equal(await page.getByRole("button", { name: /批准发布|Publish/i }).count(), 0);
    assert.deepEqual(writes, [], "File previews must not create API writes");
    await page.screenshot({ path: resolve(out, "import-" + format + "-preview.png"), fullPage: true });
    results.push({ format, status: "PASS", file: file.split(/[\\/]/).pop() });
  }
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
} finally {
  await writeFile(resolve(out, "import-browser-results.json"), JSON.stringify({ origin, results }, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results));
