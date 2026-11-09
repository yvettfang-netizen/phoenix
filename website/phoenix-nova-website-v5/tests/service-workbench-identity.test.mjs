import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workbench = readFileSync(new URL("../components/service-workbench.tsx", import.meta.url), "utf8");
const overview = readFileSync(new URL("../components/family-service-overview.tsx", import.meta.url), "utf8");

test("Hong Kong identity workbench uses a server-recorded workflow", () => {
  assert.match(workbench, /template==="HK_IDENTITY"/);
  for (const stage of [
    "IDENTITY_ELIGIBILITY", "IDENTITY_DOCUMENTS", "IDENTITY_SUBMISSION",
    "IDENTITY_APPOINTMENT", "IDENTITY_DECISION", "IDENTITY_COMPLETION",
  ]) assert.match(workbench, new RegExp(stage));
  assert.match(workbench, /Hong Kong identity service workflow/);
  assert.match(workbench, /External government systems are not connected yet/);
  assert.match(workbench, /command\("STAGE"/);
  assert.doesNotMatch(workbench, /APPLICATION_CREATE.*HK_IDENTITY/);
});

test("Family Service summary labels identity workflow stages in both locales", () => {
  for (const stage of [
    "IDENTITY_ELIGIBILITY", "IDENTITY_DOCUMENTS", "IDENTITY_SUBMISSION",
    "IDENTITY_APPOINTMENT", "IDENTITY_DECISION", "IDENTITY_COMPLETION",
  ]) assert.match(overview, new RegExp(stage));
  assert.match(overview, /Identity documents/);
  assert.match(overview, /身份材料准备/);
});
