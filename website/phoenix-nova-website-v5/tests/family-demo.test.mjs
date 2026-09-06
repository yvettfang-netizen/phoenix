import assert from "node:assert/strict";
import test from "node:test";
import {initialDocuments, daysUntil, renewDemoDocument, upsertDemoApplication, subjectRecords, allowedGoal} from "../lib/family-demo.ts";

test("undated identity records never acquire an invented expiry or countdown", () => {
  const id = initialDocuments().find(x => x.id === "identity-xiao");
  assert.equal(daysUntil(id.date), null);
  assert.equal(daysUntil("not-a-date"), null);
  assert.deepEqual(renewDemoDocument(id), id);
});

test("renewal replaces a milestone while preserving history and is idempotent", () => {
  const visa = initialDocuments()[0];
  const renewed = renewDemoDocument(visa);
  assert.equal(renewed.previousDate, visa.date);
  assert.notEqual(renewed.date, visa.date);
  assert.equal(renewed.renewed, true);
  assert.deepEqual(renewDemoDocument(renewed), renewed);
  assert.equal(daysUntil(visa.date), 22);
});

test("repeated confirmation deduplicates while member, target and year remain independent", () => {
  const intake = {memberId:"demo-xiao",goal:"masters",year:"2027",status:"submitted",material:false,consent:true};
  let records = upsertDemoApplication([], intake);
  records = upsertDemoApplication(records, intake);
  assert.equal(records.length, 1);
  records = upsertDemoApplication(records, {...intake,goal:"doctorate"});
  records = upsertDemoApplication(records, {...intake,memberId:"demo-he",goal:"undergraduate"});
  records = upsertDemoApplication(records, {...intake,year:"2028"});
  assert.equal(records.length, 4);
  assert.equal(subjectRecords(records,"demo-xiao").length, 3);
  assert.equal(subjectRecords(records,"demo-he").length, 1);
  assert.equal(subjectRecords(records,"unknown").length, 0);
});

test("minor preview cannot enter the adult-only graduate intake", () => {
  assert.equal(allowedGoal(true,"undergraduate"),true);
  assert.equal(allowedGoal(true,"masters"),false);
  assert.equal(allowedGoal(true,"doctorate"),false);
  for (const goal of ["undergraduate","masters","doctorate"]) assert.equal(allowedGoal(false,goal),true);
});
