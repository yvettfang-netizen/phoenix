import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const BRAND_SYMBOL_URL = "/brand/official/v3/phoenix-nova-symbol-transparent.png";
export const BRAND_HEADER_URL = BRAND_SYMBOL_URL;
export const BRAND_FOOTER_URL = BRAND_HEADER_URL;
export const BRAND_URL = BRAND_HEADER_URL;
export const BRAND_SOURCE_URL = "/brand/official/v3/phoenix-nova-primary-original.png";
export const BRAND_SOURCE_SHA256 = "A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E";
export const BRAND_RENDERED_SHA256 = "EB2C03880227E5C840048D1F13DD030FE6182ED7DE6C201A3DF2704D5BCFF573";
export const BRAND_HEADER_SIZE = { width: 632, height: 784 };
export const BRAND_FOOTER_SIZE = { width: 632, height: 784 };

const brandSource = new URL("../public/brand/official/v3/phoenix-nova-primary-original.png", import.meta.url);
const brandHeader = new URL("../public/brand/official/v3/phoenix-nova-symbol-transparent.png", import.meta.url);
const brandFooter = brandHeader;
const renderedBrandImage = /<img\b[^>]*brand-mark__symbol[^>]*>/gi;
const legacyBrandImage = /(?:phoenix-nova-logo-master|phoenix-nova-(?:mark-official|logo-official|official-logo-system-v1))\.png/i;
const faviconLink = /<link\b[^>]*rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*>/i;

export function assertBrandSource() {
  const digest = createHash("sha256").update(readFileSync(brandSource)).digest("hex").toUpperCase();
  assert.equal(digest, BRAND_SOURCE_SHA256, "canonical Phoenix Nova logo source SHA-256 changed");
  assertPngAsset(brandHeader, BRAND_HEADER_SIZE, { alpha: true, sha256: BRAND_RENDERED_SHA256, label: "Header" });
  assertPngAsset(brandFooter, BRAND_FOOTER_SIZE, { alpha: true, sha256: BRAND_RENDERED_SHA256, label: "Footer" });
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
  const header = images.find(image => image.includes(BRAND_HEADER_URL));
  assert.ok(header, `${route}: Header must use ${BRAND_HEADER_URL}`);
  assert.match(header, /\bwidth=["']632["']/i, `${route}: Header width metadata changed`);
  assert.match(header, /\bheight=["']784["']/i, `${route}: Header height metadata changed`);
  if (minimum >= 2) {
    const footer = images.find(image => image.includes(BRAND_FOOTER_URL));
    assert.ok(footer, `${route}: Footer must use ${BRAND_FOOTER_URL}`);
    assert.match(footer, /\bwidth=["']632["']/i, `${route}: Footer width metadata changed`);
    assert.match(footer, /\bheight=["']784["']/i, `${route}: Footer height metadata changed`);
  }
  assert.ok(images.every(image => image.includes(BRAND_HEADER_URL) || image.includes(BRAND_FOOTER_URL)), `${route}: unexpected brand image asset`);
  assert.ok((html.match(/class="brand-mark__divider"/g) ?? []).length >= minimum, `${route}: B gold divider is missing`);
  assert.ok((html.match(/class="brand-cn"/g) ?? []).length >= minimum, `${route}: B Chinese wordmark is missing`);
  assert.ok((html.match(/class="brand-en"/g) ?? []).length >= minimum, `${route}: B English wordmark is missing`);
  assert.doesNotMatch(html, legacyBrandImage, `${route}: legacy mark/logo is still rendered`);
  assert.doesNotMatch(html, faviconLink, `${route}: favicon markup must remain disabled this round`);
}

