import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { corporateOsPreviewEnabled } from "../lib/corporate-os-preview.ts";

const env = {
  SERVICE_WORKBENCH_ENABLED: "true",
  SERVICE_WORKBENCH_SYNTHETIC_PREVIEW: "true",
};

test("Corporate OS preview remains closed outside the existing synthetic development boundary", () => {
  for (const mode of [undefined, "test", "production", "private-staging"])
    assert.equal(corporateOsPreviewEnabled(env, mode, "localhost:3000"), false);
  assert.equal(corporateOsPreviewEnabled({}, "development", "localhost:3000"), false);
  assert.equal(corporateOsPreviewEnabled({ SERVICE_WORKBENCH_ENABLED: "true" }, "development", "localhost:3000"), false);
  assert.equal(corporateOsPreviewEnabled({ ...env, CUSTOMER_CANONICAL_BRIDGE_ENABLED: "true" }, "development", "localhost:3000"), false);
  assert.equal(corporateOsPreviewEnabled({ ...env, SERVICE_WORKBENCH_ENABLED: true }, "development", "localhost:3000"), false);
});

test("Corporate OS preview accepts only the actual loopback host without authority or path injection", () => {
  for (const host of ["localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:4677"])
    assert.equal(corporateOsPreviewEnabled(env, "development", host), true, host);
  for (const host of [null, "", "preview.example.invalid", "localhost.example.invalid", "127.0.0.1.example.invalid", "user@localhost", "localhost/path", "localhost?role=founder", "localhost#fragment", "localhost,preview.example.invalid", "localhost:99999", "127.1", "2130706433"])
    assert.equal(corporateOsPreviewEnabled(env, "development", host), false, String(host));
});

test("Corporate OS canonical and legacy routes share the same fail-closed preview gate", async () => {
  const [canonicalRoute, legacyRoute] = await Promise.all([
    readFile(new URL("../app/[locale]/corporate-os/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/company-os/page.tsx", import.meta.url), "utf8"),
  ]);

  for (const [name, source] of [["canonical", canonicalRoute], ["legacy", legacyRoute]]) {
    assert.match(source, /locale !== "zh" && locale !== "en"/u, `${name} route must reject unsupported locales`);
    assert.match(source, /corporateOsPreviewEnabled\(/u, `${name} route must apply the controlled preview gate`);
    assert.match(source, /notFound\(\)/u, `${name} route must fail closed`);
  }
  assert.match(legacyRoute, /redirect\(`\/\$\{locale\}\/corporate-os`\)/u, "legacy route must redirect to the canonical Corporate OS path");
  assert.doesNotMatch(legacyRoute, /<CorporateOsPreview/u, "legacy route must not render a second Corporate OS page");
});
