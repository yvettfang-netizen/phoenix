import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const BRAND_HEADER_URL = "/brand/official/v3/phoenix-nova-header@2x.png";
export const BRAND_FOOTER_URL = "/brand/official/v3/phoenix-nova-primary-trimmed.png";
export const BRAND_URL = BRAND_HEADER_URL;
export const BRAND_SOURCE_URL = "/brand/official/v3/phoenix-nova-primary-original.png";
export const BRAND_SOURCE_SHA256 = "A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E";

const brandSource = new URL("../public/brand/official/v3/phoenix-nova-primary-original.png", import.meta.url);
const renderedBrandImage = /<img\b[^>]*brand-asset[^>]*>/gi;
const legacyBrandImage = /(?:phoenix-nova-logo-master|phoenix-nova-(?:mark-official|logo-official|official-logo-system-v1))\.png/i;
const faviconLink = /<link\b[^>]*rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*>/i;

export function assertBrandSource() {
  const digest = createHash("sha256").update(readFileSync(brandSource)).digest("hex").toUpperCase();
  assert.equal(digest, BRAND_SOURCE_SHA256, "canonical Phoenix Nova logo source SHA-256 changed");
}

export function assertBrandMarkup(html, route, { minimum = 2 } = {}) {
  const images = html.match(renderedBrandImage) ?? [];
  assert.ok(images.length >= minimum, `${route}: expected at least ${minimum} shared brand images`);
  assert.ok(images.some(image => image.includes(BRAND_HEADER_URL)), `${route}: Header must use ${BRAND_HEADER_URL}`);
  if (minimum >= 2) assert.ok(images.some(image => image.includes(BRAND_FOOTER_URL)), `${route}: Footer must use ${BRAND_FOOTER_URL}`);
  assert.ok(images.every(image => image.includes(BRAND_HEADER_URL) || image.includes(BRAND_FOOTER_URL)), `${route}: unexpected brand image asset`);
  assert.doesNotMatch(html, legacyBrandImage, `${route}: legacy mark/logo is still rendered`);
  assert.doesNotMatch(html, faviconLink, `${route}: favicon markup must remain disabled this round`);
}
