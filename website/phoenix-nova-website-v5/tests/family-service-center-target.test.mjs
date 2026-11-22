import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 serviceCenterPreviewEnabled, availableNotices, availableTasks,
 canSeeLearnerData, previewAssistantAnswer, previewTasks, targetCase,
 TARGET_IS_SYNTHETIC
} from "../lib/family-service-center-target.ts";

const component=readFileSync(new URL("../components/family-service-center-target.tsx",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/[locale]/family-service-center-target/page.tsx",import.meta.url),"utf8");

test("target preview requires both development and explicit off-by-default flag",()=>{
  assert.equal(serviceCenterPreviewEnabled({},"development"),false);
  assert.equal(serviceCenterPreviewEnabled({FAMILY_SERVICE_CENTER_PREVIEW_ENABLED:"true"},"development"),true);
  assert.equal(serviceCenterPreviewEnabled({FAMILY_SERVICE_CENTER_PREVIEW_ENABLED:"true"},"production"),false);
  assert.equal(serviceCenterPreviewEnabled({FAMILY_SERVICE_CENTER_PREVIEW_ENABLED:"false"},"development"),false);
  assert.match(route,/notFound\(\)/);
  assert.match(route,/serviceCenterPreviewEnabled/);
  assert.match(route,/index:false/);
});

test("role simulation never gives access without matching guardian consent",()=>{
  for(const role of ["student","guardian","unassigned"]){
    for(const granted of [true,false]){
      const expected=role==="student"||(role==="guardian"&&granted);
      assert.equal(canSeeLearnerData(role,granted),expected);
      assert.equal(availableTasks(role,granted).length,expected?previewTasks.length:0);
      if(!expected)assert.equal(availableNotices(role,granted).every(x=>x.category==="security"),true);
      else assert.equal(availableNotices(role,granted).every(x=>x.category!=="security"),true);
    }
  }
  assert.equal(targetCase.id,"SYN-FOS-Y8-001");
  assert.equal(TARGET_IS_SYNTHETIC,true);
});

test("demo assistant cannot leak task data to revoked or unassigned role",()=>{
  for(const role of ["guardian","unassigned"]){
    for(const intent of ["today","materials","milestone"]){
      const message=previewAssistantAnswer(intent,role,false,"zh");
      assert.match(message,/无权/);
      assert.doesNotMatch(message,/SYN-FOS-Y8-001/);
      assert.doesNotMatch(message,/申请材料清单/);
    }
  }
  assert.match(previewAssistantAnswer("today","student",false,"zh"),/SYN-FOS-Y8-001/);
  assert.match(previewAssistantAnswer("materials","guardian",true,"en"),/synthetic/i);
});

test("client is visibly synthetic and has no outbound services, storage or fake writes",()=>{
  assert.match(component,/data-mode="synthetic-preview"/);
  assert.match(component,/Synthetic preview/);
  assert.match(component,/模拟撤回访问权/);
  assert.match(component,/no AI model/);
  assert.match(component,/onClick=.*?setTab/s);
  assert.doesNotMatch(component,/fetch\s*\(/);
  assert.doesNotMatch(component,/localStorage|sessionStorage|navigator\.sendBeacon/);
  assert.doesNotMatch(component,/\.post\s*\(|\.patch\s*\(|create_grant\s*\(/);
});
