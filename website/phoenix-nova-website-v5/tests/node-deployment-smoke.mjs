import assert from "node:assert/strict";

const base = new URL(process.env.NODE_SMOKE_ORIGIN || "http://127.0.0.1:4315");
const publicOrigin = process.env.NEXT_PUBLIC_MAIN_ORIGIN || "https://phoenixnova.com.cn";
async function get(path, options) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30_000), ...options });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  // Consume every response before shutdown, including asset checks whose
  // callers only need the status. This also detects interrupted transfers.
  const body = await response.arrayBuffer();
  return new Response(body, { status: response.status, headers: response.headers });
}

for (const locale of ["zh", "en"]) {
  const home = await (await get(`/${locale}`)).text();
  assert.match(home, /<html\b/);
  assert.ok(home.includes(`${publicOrigin}/${locale}`), `${locale} canonical uses deployed origin`);
  const assets = [...home.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^" ]*)?)"/g)].map(x => x[1]);
  assert.ok(assets.length > 0, "built client assets are referenced");
  for (const asset of [...new Set(assets)].slice(0, 3)) await get(asset);
  for (const path of ["education", "identity", "health", "wealth", "account", "family-center"]) {
    const html = await (await get(`/${locale}/${path}`)).text();
    assert.match(html, /<html\b/, `${locale}/${path} renders HTML`);
    if (path === "health") assert.match(html, locale === "en" ? /<html[^>]*lang="en"/ : /<html[^>]*lang="zh-Hans"/);
  }
}
await get("/brand/official/v3/phoenix-nova-bilingual-b@2x.png");
const api = await fetch(new URL("/api/customer-auth/session", base), { signal: AbortSignal.timeout(15_000) });
assert.equal(api.status, 503, "customer authentication remains unavailable without a database");
assert.equal(api.headers.has("set-cookie"), false);
assert.equal((await api.json()).error, "AUTH_NOT_CONFIGURED");
const spoofed = await (await get("/en/health", { headers: {
  "x-phoenix-health-locale": "zh", "x-phoenix-surface": "wealth", "oai-authenticated-user-email": "forged@example.com",
} })).text();
assert.match(spoofed, /<html[^>]*lang="en"/);
const wealthSpoof = await (await get("/en/wealth", { headers: { "x-phoenix-surface": "wealth" } })).text();
assert.ok(wealthSpoof.includes("/en/wealth/assessment"), "a caller cannot turn the main-domain page into the dedicated Wealth surface");
console.log("Node deployment smoke passed: bilingual pages, production assets, canonical origin, Health locale and disabled authentication.");
