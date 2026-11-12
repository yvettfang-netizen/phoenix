import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const overview = readFileSync(new URL("../components/family-service-overview.tsx", import.meta.url), "utf8");
const center = readFileSync(new URL("../components/family-center-v2.tsx", import.meta.url), "utf8");

test("P1 Family Service Overview uses a strict, no-store authorized summary contract", () => {
  for (const field of [
    "service_project_id", "name", "compass", "status", "current_stage", "adviser",
    "next_milestone", "customer_todo_count", "overdue_count", "latest_progress", "detail_href",
  ]) assert.match(overview, new RegExp(field.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  assert.match(overview, /\/api\/family-services\/summary/);
  assert.match(overview, /cache:\s*"no-store"/);
  assert.match(overview, /new AbortController\(\)/);
  assert.match(overview, /activeController\.current\?\.abort\(\)/);
  assert.match(overview, /validFamilyServiceSummary/);
  assert.match(overview, /schemaVersion: "service-project-summary\.v1"/);
  assert.match(overview, /next_milestone: project\.next_milestone/);
  assert.match(overview, /STAGE_LABELS/);
  assert.match(overview, /progressText/);
  assert.match(overview, /new URLSearchParams\(\{ limit: "20" \}\)/);
  assert.match(overview, /query\.set\("cursor", cursor\)/);
  assert.match(overview, /expires - asOf > 60000/);
  assert.match(overview, /Math\.min\(expiryRef\.current, expiry\)/);
  assert.match(overview, /expires_at/);
  assert.match(overview, /clear\("stale"\)/);
  assert.match(overview, /document\.addEventListener\("visibilitychange"/);
  assert.match(overview, /window\.addEventListener\("blur"/);
  assert.match(overview, /window\.addEventListener\("pagehide"/);
  assert.match(overview, /window\.addEventListener\("pageshow"/);
});

test("P1 Family Center selects the real summary only for authenticated workbench accounts", () => {
  assert.match(center, /const p1AccountWorkbench=workbench&&account&&!demo/);
  assert.match(center, /p1AccountWorkbench\?<FamilyServiceOverview locale=\{locale\} requireDeliveryReceipt=\{requireDeliveryReceipt\}\/>/);
  assert.match(center, /workbench&&!account&&!demo\?<ServiceProjectCards locale=\{locale\}\/>/);
  assert.match(center, /!p1AccountWorkbench&&view==='overview'.*fc-priority/);
  assert.match(center, /!p1AccountWorkbench&&<div className="fc-lower">/);
  assert.match(overview, /hrefFor\(locale, project\)/);
  assert.doesNotMatch(overview, /diagnosis|medicalRecord|insuranceClaim|raw病历|原始病历/i);
});

test("P1 summary UI preserves closed history and the no-data exploration path", () => {
  assert.match(overview, /Service history/);
  assert.match(overview, /历史服务/);
  assert.match(overview, /There are no service projects to show yet/);
  assert.match(overview, /目前没有可显示的服务项目/);
  assert.match(overview, /my-services\/\$\{project\.service_project_id\}/);
});
