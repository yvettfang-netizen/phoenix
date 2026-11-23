import test from "node:test";
import assert from "node:assert/strict";
import {inspectPrivateFamilyRuntime} from "../lib/family-runtime-readiness.ts";

const origin="http://127.0.0.1:4699";
function syntheticBindings(){
  return {
    FAMILY_CENTER_V2_ENABLED:"true",
    CANONICAL_CUSTOMER_AUTH_ENABLED:"1",
    SERVICE_WORKBENCH_ENABLED:"true",
    CUSTOMER_CANONICAL_BRIDGE_ENABLED:"true",
    CUSTOMER_AUTH_ORIGIN:origin,
    CANONICAL_CUSTOMER_AUTH_PROVIDER:{
      async verifySession(){return null;},
      async recordAccess(){}
    },
    CUSTOMER_CANONICAL_PROVIDER:{
      async resolve(){return null;}
    },
    SERVICE_WORKBENCH_API_ORIGIN:"http://127.0.0.1:4698"
  };
}
test("private synthetic binding preflight is complete but never asserts live readiness",()=>{
  const a=inspectPrivateFamilyRuntime(syntheticBindings(),"development",origin);
  assert.equal(a.scope,"SYNTHETIC_PRIVATE_NONPRODUCTION_ONLY");
  assert.equal(a.status,"CONFIG_COMPLETE_NEEDS_LIVE_EVIDENCE");
  assert.deepEqual(a.blockers,[]);
});

test("production cannot bypass the existing Workbench/Customer bridge gate",()=>{
  const a=inspectPrivateFamilyRuntime(syntheticBindings(),"production",origin);
  assert.equal(a.status,"HOLD");
  assert(a.blockers.includes("PRIVATE_DEVELOPMENT_MODE_REQUIRED"));
  assert(a.blockers.includes("SERVICE_WORKBENCH_CLOSED"));
  assert(a.blockers.includes("CUSTOMER_BRIDGE_CLOSED"));
});

test("missing identity, service mapping, and disabled UI are not considered operational",()=>{
  const a=inspectPrivateFamilyRuntime({FAMILY_CENTER_V2_ENABLED:"true"},"development",origin);
  assert.equal(a.status,"HOLD");
  for(const code of ["CANONICAL_CUSTOMER_AUTH_DISABLED","TRUSTED_AUTH_VERIFIER_NOT_BOUND",
    "SUBJECT_SCOPED_CUSTOMER_MAPPING_NOT_BOUND","PRIVATE_LOOPBACK_BFF_ORIGIN_NOT_BOUND"])
    assert(a.blockers.includes(code));
  const b=inspectPrivateFamilyRuntime({...syntheticBindings(),FAMILY_CENTER_V2_ENABLED:"false"},"development",origin);
  assert(b.blockers.includes("FAMILY_CENTER_V2_FLAG_CLOSED"));
});

test("never accept forged public/credentialed BFF origin or mismatched customer origin",()=>{
  for(const bad of [
    "https://public.example/api","http://127.0.0.1:4698@evil.test",
    "http://127.0.0.1:4698/path","http://127.0.0.1:4698/?token=secret",
    "http://localhost:4698","http://127.0.0.1:4698#token"
  ]){
    const a=inspectPrivateFamilyRuntime({...syntheticBindings(),SERVICE_WORKBENCH_API_ORIGIN:bad},
      "development",origin);
    assert(a.blockers.includes("PRIVATE_LOOPBACK_BFF_ORIGIN_NOT_BOUND"),bad);
    assert.equal(JSON.stringify(a).includes("secret"),false);
  }
  const mismatch=inspectPrivateFamilyRuntime(syntheticBindings(),"development","http://127.0.0.1:4700");
  assert(mismatch.blockers.includes("TRUSTED_CUSTOMER_ORIGIN_UNVERIFIED"));
});
