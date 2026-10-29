// Isolated review-page checks; never opens or modifies the production website.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assets = path.join(site, 'public/brand/official/v3');
const output = path.join(assets, 'review');
const reviewUrl = process.env.BRAND_REVIEW_URL || 'http://127.0.0.1:4392/review.html';
assert.equal(new URL(reviewUrl).hostname, '127.0.0.1', 'Use a local review server');
const { chromium } = await import(process.env.BRAND_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.BRAND_PLAYWRIGHT_PATH).href : 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.BRAND_BROWSER_PATH ? { executablePath: process.env.BRAND_BROWSER_PATH } : {}) });
const checks = [];
const screenshots = [];
await mkdir(output, { recursive: true });
async function capture(locator, file) {
  const target = path.join(output, file);
  await locator.screenshot({ path: target });
  const bytes = await readFile(target);
  screenshots.push({ file: `review/${file}`, sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), transparent_background: false,
    source: 'review.html with Logo V3 review candidates', version: '3.0-review-candidate', date: '2026-10-30' });
}
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    const remoteRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (new URL(request.url()).hostname !== '127.0.0.1') remoteRequests.push(request.url());
    });
    assert.equal((await page.goto(reviewUrl)).status(), 200);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    assert.equal(await page.locator('img:not([alt]), img[alt=""]').count(), 0);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    for (const link of await page.locator('a').all()) {
      const href = await link.getAttribute('href');
      if (href.startsWith('#')) assert.equal(await page.locator(href).count(), 1, href);
      else assert.equal((await page.request.get(new URL(href, reviewUrl).href)).status(), 200, href);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
    checks.push({ width, imagesDecoded: true, noHorizontalOverflow: true, allLinksResolved: true, noRuntimeErrors: true, noExternalRequests: true });
    if (width === 1440) {
      await capture(page.locator('#versions'), 'logo-three-versions.png');
      await capture(page.locator('#transparency'), 'logo-transparency-check.png');
      await capture(page.locator('#desktop-header'), 'header-desktop.png');
      await capture(page.locator('#icons'), 'icons-actual-size.png');
    }
    if (width === 390) await capture(page.locator('#mobile-header'), 'header-mobile.png');
    await page.close();
  }
  const result = { date: '2026-10-30', status: 'PASS', scope: 'Isolated asset review only; not live website validation',
    browser: await browser.version(), checks, screenshots };
  await writeFile(path.join(assets, 'review-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
