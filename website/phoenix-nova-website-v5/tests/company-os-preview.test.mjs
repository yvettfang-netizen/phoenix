import test from "node:test";
import assert from "node:assert/strict";
import { companyOsPreviewEnabled } from "../lib/company-os-preview.ts";

const env = {
  SERVICE_WORKBENCH_ENABLED: "true",
  SERVICE_WORKBENCH_SYNTHETIC_PREVIEW: "true",
};

test("Company OS preview remains closed outside the existing synthetic development boundary", () => {
  for (const mode of [undefined, "test", "production", "private-staging"])
    assert.equal(companyOsPreviewEnabled(env, mode, "localhost:3000"), false);
  assert.equal(companyOsPreviewEnabled({}, "development", "localhost:3000"), false);
  assert.equal(companyOsPreviewEnabled({ SERVICE_WORKBENCH_ENABLED: "true" }, "development", "localhost:3000"), false);
  assert.equal(companyOsPreviewEnabled({ ...env, CUSTOMER_CANONICAL_BRIDGE_ENABLED: "true" }, "development", "localhost:3000"), false);
  assert.equal(companyOsPreviewEnabled({ ...env, SERVICE_WORKBENCH_ENABLED: true }, "development", "localhost:3000"), false);
});

test("Company OS preview accepts only the actual loopback host without authority or path injection", () => {
  for (const host of ["localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:4677"])
    assert.equal(companyOsPreviewEnabled(env, "development", host), true, host);
  for (const host of [null, "", "preview.example.invalid", "localhost.example.invalid", "127.0.0.1.example.invalid", "user@localhost", "localhost/path", "localhost?role=founder", "localhost#fragment", "localhost,preview.example.invalid", "localhost:99999", "127.1", "2130706433"])
    assert.equal(companyOsPreviewEnabled(env, "development", host), false, String(host));
});
