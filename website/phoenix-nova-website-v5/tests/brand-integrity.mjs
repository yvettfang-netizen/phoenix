import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const BRAND_HEADER_URL = "/brand/official/v3/phoenix-nova-header@2x.png";
export const BRAND_FOOTER_URL = BRAND_HEADER_URL;
export const BRAND_SYMBOL_URL = "/brand/official/v3/phoenix-nova-symbol-transparent.png";
export const BRAND_URL = BRAND_HEADER_URL;
export const BRAND_SOURCE_URL = "/brand/official/v3/phoenix-nova-primary-original.png";
export const BRAND_SOURCE_SHA256 = "A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E";
export const BRAND_RENDERED_SHA256 = "C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA";
export const BRAND_SYMBOL_SHA256 = "EB2C03880227E5C840048D1F13DD030FE6182ED7DE6C201A3DF2704D5BCFF573";
export const BRAND_HEADER_SIZE = { width: 1040, height: 320 };
export const BRAND_FOOTER_SIZE = { width: 1040, height: 320 };
export const BRAND_SYMBOL_SIZE = { width: 632, height: 784 };

const brandSource = new URL("../public/brand/official/v3/phoenix-nova-primary-original.png", import.meta.url);
const brandHeader = new URL("../public/brand/official/v3/phoenix-nova-header@2x.png", import.meta.url);
const brandFooter = brandHeader;
const brandSymbol = new URL("../public/brand/official/v3/phoenix-nova-symbol-transparent.png", import.meta.url);
const renderedBrandImage = /<img\b[^>]*brand-asset[^>]*>/gi;
const legacyBrandImage = /(?:phoenix-nova-logo-master|phoenix-nova-(?:mark-official|logo-official|official-logo-system-v1))\.png/i;
const faviconLink = /<link\b[^>]*rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*>/i;

export function assertBrandSource() {
  const digest = createHash("sha256").update(readFileSync(brandSource)).digest("hex").toUpperCase();
  assert.equal(digest, BRAND_SOURCE_SHA256, "canonical Phoenix Nova logo source SHA-256 changed");
  assertPngAsset(brandHeader, BRAND_HEADER_SIZE, { alpha: true, sha256: BRAND_RENDERED_SHA256, label: "Header" });
  assertPngAsset(brandFooter, BRAND_FOOTER_SIZE, { alpha: true, sha256: BRAND_RENDERED_SHA256, label: "Footer" });
  assertPngAsset(brandSymbol, BRAND_SYMBOL_SIZE, { alpha: true, sha256: BRAND_SYMBOL_SHA256, label: "Chinese symbol" });
}

function assertPngAsset(url, size, { alpha = false, sha256, label }) {
  const bytes = readFileSync(url);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${label} brand asset is not a PNG`);
  assert.equal(bytes.readUInt32BE(16), size.width, `${label} brand asset width changed`);
  assert.equal(bytes.readUInt32BE(20), size.height, `${label} brand asset height changed`);
  if (sha256) assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), sha256, `${label} brand asset SHA-256 changed`);
  if (alpha) {
    // PNG IHDR colour types 4 and 6 carry an alpha channel.
    assert.ok([4, 6].includes(bytes[25]), `${label} brand asset must retain transparency`);
  }
}

export function assertBrandMarkup(html, route, { minimum = 2 } = {}) {
  const images = html.match(renderedBrandImage) ?? [];
  assert.ok(images.length >= minimum, `${route}: expected at least ${minimum} shared brand images`);
  const localizedChinese = /\bbrand-mark--zh\b/.test(html);
  const expectedUrl = localizedChinese ? BRAND_SYMBOL_URL : BRAND_HEADER_URL;
  const expectedSize = localizedChinese ? BRAND_SYMBOL_SIZE : BRAND_HEADER_SIZE;
  assert.ok(images.every(image => image.includes(expectedUrl)), `${route}: brand markup must use ${expectedUrl}`);
  const header = images.find(image => image.includes(expectedUrl));
  assert.ok(header, `${route}: Header must use ${expectedUrl}`);
  assert.match(header, new RegExp(`\\bwidth=["']${expectedSize.width}["']`, "i"), `${route}: Header width metadata changed`);
  assert.match(header, new RegExp(`\\bheight=["']${expectedSize.height}["']`, "i"), `${route}: Header height metadata changed`);
  if (minimum >= 2) {
    const footer = images.find(image => image.includes(expectedUrl));
    assert.ok(footer, `${route}: Footer must use ${expectedUrl}`);
    assert.match(footer, new RegExp(`\\bwidth=["']${expectedSize.width}["']`, "i"), `${route}: Footer width metadata changed`);
    assert.match(footer, new RegExp(`\\bheight=["']${expectedSize.height}["']`, "i"), `${route}: Footer height metadata changed`);
  }
  if (localizedChinese) {
    assert.match(html, /<span[^>]+class=["'][^"']*wordmark[^"']*["'][^>]*>凤启环球/i, `${route}: Chinese live wordmark is missing`);
    assert.match(html, /<small[^>]*>PHOENIX NOVA™<\/small>/i, `${route}: Chinese English wordmark is missing`);
  } else {
    assert.doesNotMatch(html, /\bbrand-mark--zh\b/, `${route}: non-localized brand markup unexpectedly uses Chinese symbol`);
  }
  assert.doesNotMatch(html, legacyBrandImage, `${route}: legacy mark/logo is still rendered`);
  assert.doesNotMatch(html, faviconLink, `${route}: favicon markup must remain disabled this round`);
}
