import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../lib/health-integration-contract.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const contract = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const trustedAll = {
  actorVerified: true,
  canonicalIdentityResolved: true,
  canonicalFamilyIdVerified: true,
  canonicalClientIdVerified: true,
  canonicalPartnerRefVerified: true,
  patientScopeVerified: true,
  familyScopeApproved: true,
  founderRoleApproved: true,
  partnerScopeApproved: true,
  sourceChannelValidated: true,
  destinationValidated: true,
  insuranceChannelValidated: true,
  contactConsentRecorded: true,
  handoffConsentRecorded: true,
  recordConsentRecorded: true,
  consultationSourcePersisted: true,
  endpointEnabled: true,
  outboxEnabled: true,
};
const completeContext = {
  sourceChannel: "self-or-recommendation",
  referralPartnerRef: "source-qualified:partner-1",
  currentRegion: "hong-kong",
  careDestination: "shenzhen",
  insuranceChannel: "hong-kong-insurance",
};

test("the contract is pure and never performs network, storage, upload or payment actions", () => {
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|\bPOST\b|payment\s*\(/i);
  assert.match(source, /authorized:\s*false/);
  assert.match(source, /canPersist:\s*false/);
  assert.match(source, /canUpload:\s*false/);
  assert.match(source, /canPay:\s*false/);
});

test("source, referral, current region, destination and insurance remain separate dimensions", () => {
  const valid = contract.validateContextDimensions(completeContext);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.missing, []);
  assert.deepEqual([...contract.CONTEXT_DIMENSION_NAMES], ["sourceChannel", "referralPartnerRef", "currentRegion", "careDestination", "insuranceChannel"]);
  const missing = contract.validateContextDimensions({ ...completeContext, careDestination: null });
  assert.equal(missing.valid, false);
  assert.deepEqual(missing.missing, ["careDestination"]);
});

test("contact, handoff and patient-record permissions are independent and never authorise in the browser", () => {
  const summary = contract.summarizeIndependentAuthorizations(trustedAll);
  assert.deepEqual(summary, { contact: true, handoff: true, patientRecords: true, distinctPurposes: true, authorizesAnyAction: false });
});

test("complete trusted evidence remains a candidate or hold, never an authorization", () => {
  const input = { operation: "consultation.request", client: { requested: true, context: completeContext }, trusted: trustedAll };
  const result = contract.evaluateHealthIntegrationReadiness(input);
  assert.equal(result.decision, "CANDIDATE");
  assert.equal(result.authorized, false);
  assert.equal(result.canPersist, false);
  assert.equal(result.canUpload, false);
  assert.equal(result.canPay, false);
});

test("all dangerous operations remain denied", () => {
  for (const operation of ["medical.document.upload", "finance.write"]) {
    const result = contract.evaluateHealthIntegrationReadiness({ operation, client: { requested: true, context: completeContext }, trusted: trustedAll });
    assert.equal(result.decision, "DENY", operation);
    assert.equal(result.authorized, false, operation);
  }
});

test("URL partner IDs and browser role claims cannot determine access", () => {
  for (const operation of ["consultation.request", "partner.source.validation", "partner.workbench.read", "founder.projection.read"]) {
    const result = contract.evaluateHealthIntegrationReadiness({
      operation,
      client: { requested: true, context: completeContext, urlPartnerId: "partner-evil", frontendRole: "founder" },
      trusted: trustedAll,
    });
    assert.equal(result.decision, "DENY", operation);
    assert.deepEqual(result.reasons.slice(0, 2), ["FRONTEND_ROLE_IS_NOT_AUTHORITY", "URL_PARTNER_ID_IS_NOT_AUTHORITY"]);
  }
});

test("missing independent consent, patient scope or canonical refs cannot be inferred", () => {
  const noConsent = contract.evaluateHealthIntegrationReadiness({
    operation: "consultation.request",
    client: { requested: true, context: completeContext },
    trusted: { ...trustedAll, contactConsentRecorded: false },
  });
  assert.equal(noConsent.decision, "HOLD");
  assert.ok(noConsent.reasons.includes("CONTACT_CONSENT_NOT_SERVER_RECORDED"));

  const noPatientScope = contract.evaluateHealthIntegrationReadiness({
    operation: "record.authorization",
    client: { requested: true, context: completeContext },
    trusted: { ...trustedAll, patientScopeVerified: false },
  });
  assert.equal(noPatientScope.decision, "DENY");
  assert.ok(noPatientScope.reasons.includes("PATIENT_SCOPE_AND_EXPLICIT_RECORD_CONSENT_REQUIRED"));

  const noFamilyRef = contract.evaluateHealthIntegrationReadiness({
    operation: "family.projection.read",
    client: { requested: true, context: completeContext },
    trusted: { ...trustedAll, canonicalFamilyIdVerified: false },
  });
  assert.equal(noFamilyRef.decision, "DENY");
  assert.ok(noFamilyRef.reasons.includes("VERIFIED_FAMILY_AND_PATIENT_SCOPE_REQUIRED"));
});

test("projection fields are minimum summaries and candidate event names are server-side only", () => {
  assert.ok(contract.FAMILY_PROJECTION_FIELDS.includes("consent_reference"));
  assert.ok(contract.FOUNDER_PROJECTION_FIELDS.includes("service_project_id"));
  assert.ok(contract.PARTNER_PROJECTION_FIELDS.includes("verified_partner_id"));
  assert.ok(!contract.FAMILY_PROJECTION_FIELDS.includes("medical_record"));
  assert.ok(!contract.FOUNDER_PROJECTION_FIELDS.includes("medical_record"));
  assert.ok(contract.CANDIDATE_EVENT_TYPES.includes("crm.consultation.requested"));
});

test("internal commercial policy is not imported into client or public route code", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const codeRoots = ["components", "app", "lib"];
  const sources = [];
  const visit = directory => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) visit(path);
      else if (/\.(?:ts|tsx|mts|mjs|js)$/.test(entry)) sources.push(readFileSync(path, "utf8"));
    }
  };
  for (const directory of codeRoots) visit(join(root, directory));
  const joined = sources.join("\n");
  assert.doesNotMatch(joined, /HEALTH_V31_INTERNAL_POLICY_HOLD|(?:外部预算|凤启留存|合作方)\s*\d+(?:\.\d+)?%/);
});
