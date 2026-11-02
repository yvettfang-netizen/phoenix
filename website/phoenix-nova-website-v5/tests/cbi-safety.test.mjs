import test from "node:test";
import assert from "node:assert/strict";
import { loadCbiTypescript as loadTypescript } from "./cbi-test-loader.mjs";

test("only the four Founder-selected countries are reviewed, and no approval is inferred", async () => {
  const data = await loadTypescript("../lib/cbi-data.ts");
  assert.deepEqual(data.cbiCountries.map(c => c.country_code), ["KN", "AR", "VU", "ST"]);
  assert.equal(new Set(data.cbiCountries.map(c => c.country_id)).size, 4);
  for (const country of data.cbiCountries) {
    assert.equal(country.content_status, "IMPORT_REVIEW");
    assert.notEqual(country.operational_status, "ACTIVE");
    assert.equal(country.application_status, "NOT_VERIFIED");
    assert.equal(country.passport_issuance_status, "UNKNOWN");
    assert.equal(country.minimum_investment, null);
    assert.equal(country.travel_access_data, null);
  }
  assert.deepEqual(data.getPublishedCbiCountries(), []);
  const argentina = data.getCbiCountry("argentina");
  assert.equal(argentina.operational_status, "PRE_LAUNCH");
  assert.notEqual(argentina.legal_status, argentina.operational_status);
});

test("review content is not selected by default and local preview requires explicit server opt-in", async () => {
  const data = await loadTypescript("../lib/cbi-data.ts");
  const before = process.env.IDENTITY_CBI_REVIEW_PREVIEW;
  try {
    delete process.env.IDENTITY_CBI_REVIEW_PREVIEW;
    assert.equal(data.getVisibleCbiCountries().length, 0);
    process.env.IDENTITY_CBI_REVIEW_PREVIEW = "true";
    assert.equal(data.getVisibleCbiCountries().length, 0);
    process.env.IDENTITY_CBI_REVIEW_PREVIEW = "1";
    assert.equal(data.getVisibleCbiCountries().length, 4);
  } finally {
    if (before === undefined) delete process.env.IDENTITY_CBI_REVIEW_PREVIEW;
    else process.env.IDENTITY_CBI_REVIEW_PREVIEW = before;
  }
});

test("country alternates retain the same entity and draft structured data cannot inject scripts", async () => {
  const seo = await loadTypescript("../lib/cbi-seo.ts");
  const path = "/en/identity/countries/argentina";
  const metadata = seo.cbiMetadata("en", path, "Argentina", "Reviewed information");
  assert.equal(metadata.alternates.canonical, path);
  assert.equal(metadata.alternates.languages["zh-Hans"], "/zh/identity/countries/argentina");
  assert.equal(metadata.robots.index, false);
  assert.ok(!seo.safeJsonLd({ text: "</script><script>alert(1)</script>" }).includes("<"));
  const graph = seo.cbiStructuredData("en", path, "Argentina", "Review");
  assert.equal(graph.publisher["@type"], "Organization");
  assert.notEqual(graph.publisher["@type"], "GovernmentOrganization");
});

test("electronic visa counts do not become ETA counts and missing translations stay pending", async () => {
  const data = await loadTypescript("../lib/cbi-data.ts");
  const { normalizeCbiCountry } = await loadTypescript("../components/cbi-types.ts");
  const record = { ...data.cbiCountries[0], family_eligibility: { zh: null, en: "Synthetic family condition" }, travel_access_data: { evisa_count: 7 } };
  const view = normalizeCbiCountry(record);
  assert.equal(view.travelPolicy.evisa, 7);
  assert.equal(view.travelPolicy.eta, null);
  assert.match(view.familyEligibility.zh, /待核实/);
  assert.doesNotMatch(view.familyEligibility.zh, /Synthetic/);
});
