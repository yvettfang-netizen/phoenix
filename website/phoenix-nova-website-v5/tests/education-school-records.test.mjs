import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dataset = JSON.parse(readFileSync(new URL("../lib/data/education-schools-official.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../lib/education-school-records.ts", import.meta.url), "utf8");

test("official school evidence preserves the source hash, rows and duplicate keys", () => {
  assert.equal(dataset.schemaVersion, "education-schools-official.v1");
  assert.equal(dataset.source.sourceUrl, "https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json");
  assert.equal(dataset.source.sourceLastModified, "2026-10-02");
  assert.equal(dataset.source.sourceSha256, "6CE338319E4E09482CA2CD19DCFE909FFBD3203C6D6F299F2BA96E0402395709");
  assert.equal(dataset.source.sourceRecordCount, 3496);
  assert.equal(dataset.records.length, 3496);
  assert.equal(new Set(dataset.records.map(record => record.sourceKey)).size, 3481);
  assert.equal(new Set(dataset.records.map(record => record.entityId)).size, dataset.records.length);
  const duplicateRecords = dataset.records.filter(record => record.sourceDuplicateCount > 1);
  assert.equal(duplicateRecords.length, 30);
  assert.deepEqual(new Set(duplicateRecords.map(record => record.sourceKey)).size, 15);
  for (const record of dataset.records) {
    assert.ok(record.sourceSchoolCode);
    assert.ok(record.sourceSession);
    assert.ok(record.sourceDistrict);
    assert.ok(record.sourceSchoolLevel);
    assert.ok(record.sourceFinanceType);
    assert.ok(record.sourceGender);
    assert.ok(record.name.zh && record.name.en);
    assert.match(record.sourceProvenance.sourceSha256, /^[A-F0-9]{64}$/);
    assert.ok(record.website === null || /^https?:\/\//.test(record.website));
    assert.equal(record.sourceProvenance.sourceRecordCount, 3496);
  }
});

test("source mapping is explicit and leaves unsupported dimensions unmodeled", () => {
  const stageCounts = Object.groupBy(dataset.records, record => record.stageId);
  assert.equal(stageCounts.kindergarten.length, 2152);
  assert.equal(stageCounts["primary-schools"].length, 697);
  assert.equal(stageCounts["secondary-schools"].length, 647);
  const districtIds = new Set(dataset.records.map(record => record.district));
  assert.equal(districtIds.size, 18);
  for (const record of dataset.records) {
    assert.ok(["government", "aided", "direct-subsidy", "private", "other"].includes(record.funding));
    assert.ok(["coeducational", "girls", "boys"].includes(record.gender));
    assert.equal(Object.hasOwn(record, "curriculum"), false);
    assert.equal(Object.hasOwn(record, "languageOfInstruction"), false);
    assert.equal(Object.hasOwn(record, "fees"), false);
    assert.equal(Object.hasOwn(record, "legal"), false);
  }
});

test("typed record module avoids a runtime cycle and retains candidate/noindex boundary", () => {
  assert.match(source, /import type[\s\S]*from ["']\.\/education-knowledge["']/);
  assert.match(source, /export const SCHOOL_INSTITUTIONS/);
  assert.match(source, /state:\s*["']candidate["']/);
  assert.match(source, /curricula:\s*\[\]/);
  assert.match(source, /languageOfInstruction:\s*null/);
  assert.match(source, /fees:\s*null/);
});
