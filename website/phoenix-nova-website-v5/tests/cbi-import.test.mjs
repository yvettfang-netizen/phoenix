import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compileTs = async (relativePath, replacements = {}) => {
  const sourceUrl = new URL(relativePath, import.meta.url);
  let source = readFileSync(sourceUrl, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  source = compiled.replace(/from ["']\.\/cbi-schema\.ts["']/g, `from ${JSON.stringify(replacements.schemaUrl ?? "./cbi-schema.ts")}`);
  const excelJsUrl = pathToFileURL(require.resolve("exceljs")).href;
  source = source.replace(/import\(["']exceljs["']\)/g, `import(${JSON.stringify(excelJsUrl)})`);
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return { module: await import(moduleUrl), moduleUrl };
};

const schemaModule = await compileTs("../lib/cbi-schema.ts");
const importerModule = await compileTs("../lib/cbi-import.ts", { schemaUrl: schemaModule.moduleUrl });
const { CBI_ALLOWED_COUNTRY_CODES, CBI_PASSPORT_ISSUANCE_STATUS, validateCountryRecord } = schemaModule.module;
const { exportCbiErrorReport, previewCbiImport, releaseCbiImport } = importerModule.module;

const bilingual = (en, zh = null) => ({ en, zh });
const source = (code = "KN", status = "CURRENT") => ({
  source_type: "OFFICIAL",
  source: "National authority",
  official_url: `https://www.gov.${code.toLowerCase()}/cbi`,
  verified_at: "2026-11-02",
  effective_scope: "CBI programme",
  effective_status: status,
  owner: "National authority",
});

const record = (code = "KN", programmeId = "kn-cbi", overrides = {}) => ({
  country_id: `${code.toLowerCase()}-country`,
  country_code: code,
  country_name_zh: code === "KN" ? "圣基茨和尼维斯" : code,
  country_name_en: code === "KN" ? "Saint Kitts and Nevis" : code,
  official_name: code === "KN" ? "Federation of Saint Kitts and Nevis" : code,
  flag_asset: null,
  programme_name: bilingual("Citizenship by Investment", "投资入籍"),
  programme_type: "CITIZENSHIP_BY_INVESTMENT",
  legal_basis: null,
  investment_options: null,
  minimum_investment: null,
  currency: null,
  government_fees: null,
  due_diligence_fees: null,
  family_eligibility: null,
  residence_requirement: null,
  interview_requirement: null,
  source_of_funds_requirement: null,
  processing_time: null,
  dual_nationality_policy: null,
  passport_validity: null,
  passport_renewal: null,
  travel_access_data: null,
  legal_status: "LEGAL_REVIEW",
  operational_status: "UNKNOWN",
  application_status: "NOT_VERIFIED",
  passport_issuance_status: "UNKNOWN",
  official_authority: null,
  official_sources: [source(code)],
  last_verified_at: null,
  next_review_at: null,
  content_status: "IMPORT_REVIEW",
  programme_id: programmeId,
  data_version: "cbi-v1",
  ...overrides,
});

const csvEscape = value => {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

test("CBI schema locks the four-country allowlist and independent enum values", () => {
  assert.deepEqual(CBI_ALLOWED_COUNTRY_CODES, ["KN", "AR", "VU", "ST"]);
  assert.equal(CBI_PASSPORT_ISSUANCE_STATUS.length, 5);
  assert.deepEqual(CBI_PASSPORT_ISSUANCE_STATUS, [
    "CITIZEN_PASSPORT_AVAILABLE_AFTER_APPROVAL",
    "ISSUANCE_PENDING",
    "NON_CITIZEN_TRAVEL_DOCUMENT",
    "NOT_APPLICABLE",
    "UNKNOWN",
  ]);
  assert.equal(validateCountryRecord(record("HK")).ok, false);
  assert.ok(validateCountryRecord(record("HK")).errors.some(error => error.code === "COUNTRY_NOT_ALLOWLISTED"));
});

test("ACTIVE and travel-access data require evidence instead of being inferred", () => {
  const active = record("KN", "kn-active", {
    legal_status: "LAW_ENACTED",
    operational_status: "ACTIVE",
    application_status: "ACCEPTING",
    legal_basis: bilingual("Law", "法律"),
    official_authority: bilingual("Authority", "主管机关"),
    last_verified_at: "2026-11-02",
    next_review_at: "2099-11-02",
  });
  assert.equal(validateCountryRecord(active).ok, true);
  const unsupportedActive = validateCountryRecord({ ...active, official_sources: [], official_authority: null });
  assert.ok(unsupportedActive.errors.some(error => error.code === "ACTIVE_CURRENT_OFFICIAL_SOURCE_REQUIRED"));
  assert.ok(unsupportedActive.errors.some(error => error.code === "ACTIVE_OFFICIAL_AUTHORITY_REQUIRED"));
  const unsupportedTravel = validateCountryRecord({
    ...record(),
    travel_access_data: { passport_class: "ordinary", visa_free_count: 1, visa_on_arrival_count: null, evisa_count: null, statistics_date: null, statistics_method: null, source_name: null, source_url: null },
  });
  assert.ok(unsupportedTravel.errors.some(error => error.code === "TRAVEL_SOURCE_URL_REQUIRED"));
  assert.ok(unsupportedTravel.errors.some(error => error.code === "TRAVEL_STATISTICS_METHOD_REQUIRED"));
});

test("a review-only record may lack an official source, but the gap is explicit and cannot publish", () => {
  const result = validateCountryRecord(record("ST", "st-review", { official_sources: [] }));
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some(warning => warning.code === "OFFICIAL_SOURCE_PENDING_REVIEW"));
});

test("CSV preview reads real CSV bytes, preserves nulls, hashes the original and starts in IMPORT_REVIEW", async () => {
  const value = record("ST", "st-cbi", { country_name_zh: "圣多美和普林西比", country_name_en: "São Tomé and Príncipe", official_name: "São Tomé and Príncipe", legal_basis: bilingual("Decree-Law reference", "法令依据") });
  const headers = Object.keys(value);
  const csv = `${headers.join(",")}\n${headers.map(key => csvEscape(value[key] === null || value[key] === undefined ? "" : Array.isArray(value[key]) || typeof value[key] === "object" ? JSON.stringify(value[key]) : value[key])).join(",")}\n`;
  const preview = await previewCbiImport({ filename: "cbi.csv", bytes: new TextEncoder().encode(csv) }, { source_version: "source-1" });
  assert.equal(preview.format, "CSV");
  assert.equal(preview.records.length, 1);
  assert.equal(preview.records[0].flag_asset, null);
  assert.deepEqual(preview.records[0].programme_name, bilingual("Citizenship by Investment", "投资入籍"));
  assert.deepEqual(preview.records[0].legal_basis, bilingual("Decree-Law reference", "法令依据"));
  assert.equal(preview.records[0].official_name, "São Tomé and Príncipe");
  assert.equal(preview.status, "IMPORT_REVIEW");
  assert.equal(preview.audit.approval_status, "IMPORT_REVIEW");
  assert.equal(preview.audit.verification_status, "UNVERIFIED");
  assert.equal(preview.audit.provenance, "UNKNOWN");
  assert.match(preview.file_hash, /^[0-9a-f]{64}$/);
});

test("JSON preview rejects expired/non-current sources without guessing a current conclusion", async () => {
  const preview = await previewCbiImport({ filename: "cbi.json", bytes: JSON.stringify([record("KN", "kn-cbi", { official_sources: [source("KN", "EXPIRED")] })]) });
  assert.equal(preview.format, "JSON");
  assert.equal(preview.records.length, 1);
  assert.ok(preview.issues.some(error => error.code === "SOURCE_NOT_CURRENT_OFFICIAL"));
});

test("real XLSX preview uses the workbook reader and does not trust formula cells", async () => {
  let ExcelJS;
  try {
    ExcelJS = await import("exceljs");
  } catch {
    assert.fail("exceljs must be installed by the main agent before the CBI XLSX test can run");
  }
  const loadedModule = ExcelJS.default ?? ExcelJS;
  const workbook = new loadedModule.Workbook();
  const sheet = workbook.addWorksheet("CBI");
  const value = record("ST", "st-cbi", { country_name_zh: "圣多美和普林西比", country_name_en: "São Tomé and Príncipe", official_name: "São Tomé and Príncipe", legal_basis: bilingual("Decree-Law reference", "法令依据") });
  const headers = Object.keys(value);
  sheet.addRow(headers);
  sheet.addRow(headers.map(key => value[key] === null || value[key] === undefined ? "" : Array.isArray(value[key]) || typeof value[key] === "object" ? JSON.stringify(value[key]) : value[key]));
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  const preview = await previewCbiImport({ filename: "cbi.xlsx", bytes });
  assert.equal(preview.format, "XLSX");
  assert.equal(preview.records.length, 1);
  assert.deepEqual(preview.records[0].programme_name, bilingual("Citizenship by Investment", "投资入籍"));
  assert.deepEqual(preview.records[0].legal_basis, bilingual("Decree-Law reference", "法令依据"));
  assert.equal(preview.records[0].official_name, "São Tomé and Príncipe");
  assert.equal(preview.issues.filter(error => error.severity === "error").length, 0);
});

test("duplicates are keyed by country plus programme and conflicts export a safe error report", async () => {
  const first = record("KN", "programme-a");
  const second = record("KN", "programme-a", { official_name: "Conflicting name" });
  const preview = await previewCbiImport({ filename: "duplicates.json", bytes: JSON.stringify([first, second]) });
  assert.ok(preview.issues.some(error => error.code === "DUPLICATE_CONFLICT"));
  const csv = exportCbiErrorReport(preview, "csv");
  assert.match(csv, /DUPLICATE_CONFLICT/);
  assert.match(exportCbiErrorReport(preview, "json"), /DUPLICATE_CONFLICT/);
});

test("country identity is canonicalized by ISO code and rejects a second id for the same country/programme", async () => {
  const preview = await previewCbiImport({ filename: "country-id-conflict.json", bytes: JSON.stringify([
    record("KN", "programme-a"),
    record("KN", "programme-a", { country_id: "another-kn-id" }),
  ]) });
  assert.ok(preview.issues.some(error => error.code === "COUNTRY_ID_CONFLICT"));
});

test("publication fails closed without a repository and requires server Founder authorization", async () => {
  const preview = await previewCbiImport({ filename: "review.json", bytes: JSON.stringify([record()]) });
  assert.deepEqual(await releaseCbiImport(preview), { ok: false, code: "REPOSITORY_INTERFACE_MISSING" });
  const blocked = await releaseCbiImport(preview, {
    transactional: true,
    loadVerifiedReview: async () => ({ immutable: true, batch_id: preview.batch_id, file_hash: preview.file_hash, audit: preview.audit, records: preview.records }),
    authorizeImportReview: async () => ({ authorized: false, reason: "client_role_not_trusted" }),
    appendVersion: async () => ({ version_id: "should-not-write" }),
  });
  assert.equal(blocked.code, "IMPORT_REVIEW_BLOCKED");
});

test("server-authorized release appends a published version and never overwrites history", async () => {
  const preview = await previewCbiImport({ filename: "approved.json", bytes: JSON.stringify([record("KN", "kn-cbi", { last_verified_at: "2026-11-02", next_review_at: "2099-11-02" })]) });
  const review = {
    ...preview,
    audit: { ...preview.audit, verification_status: "VERIFIED", provenance: "OFFICIAL" },
  };
  const versions = [];
  const result = await releaseCbiImport(review, {
    transactional: true,
    loadVerifiedReview: async () => ({ immutable: true, batch_id: preview.batch_id, file_hash: preview.file_hash, audit: review.audit, records: review.records }),
    authorizeImportReview: async () => ({ authorized: true, actor_id: "founder-server-id", actor_role: "FOUNDER", authorization_source: "SERVER_RBAC" }),
    appendVersion: async version => { versions.push(version); return { version_id: version.version_id }; },
  });
  assert.equal(result.ok, true);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].append_only, true);
  assert.equal(versions[0].records[0].content_status, "PUBLISHED");
});

test("publication uses the server snapshot, not tampered browser records, and rejects empty or failed appends", async () => {
  const preview = await previewCbiImport({ filename: "tamper.json", bytes: JSON.stringify([record("KN", "kn-cbi", { last_verified_at: "2026-11-02", next_review_at: "2099-11-02" })]) });
  const trustedReview = { ...preview, audit: { ...preview.audit, verification_status: "VERIFIED", provenance: "OFFICIAL" } };
  const tampered = { ...trustedReview, records: [{ ...trustedReview.records[0], country_name_en: "Tampered in browser" }] };
  const versions = [];
  const repository = {
    transactional: true,
    loadVerifiedReview: async () => ({ immutable: true, batch_id: preview.batch_id, file_hash: preview.file_hash, audit: trustedReview.audit, records: trustedReview.records }),
    authorizeImportReview: async () => ({ authorized: true, actor_id: "server-founder", actor_role: "FOUNDER", authorization_source: "SERVER_RBAC" }),
    appendVersion: async version => { versions.push(version); return { version_id: version.version_id }; },
  };
  const result = await releaseCbiImport(tampered, repository);
  assert.equal(result.ok, true);
  assert.equal(versions[0].records[0].country_name_en, "Saint Kitts and Nevis");

  const emptyPreview = { ...trustedReview, records: [] };
  const emptyResult = await releaseCbiImport(emptyPreview, {
    ...repository,
    loadVerifiedReview: async () => ({ immutable: true, batch_id: emptyPreview.batch_id, file_hash: emptyPreview.file_hash, audit: trustedReview.audit, records: [] }),
  });
  assert.equal(emptyResult.code, "IMPORT_REVIEW_BLOCKED");

  const noSourcePreview = await previewCbiImport({ filename: "no-source.json", bytes: JSON.stringify([record("KN", "kn-cbi", { official_sources: [], last_verified_at: "2026-11-02", next_review_at: "2099-11-02" })]) });
  const noSourceReview = { ...noSourcePreview, audit: { ...noSourcePreview.audit, verification_status: "VERIFIED", provenance: "OFFICIAL" } };
  const noSourceResult = await releaseCbiImport(noSourceReview, {
    ...repository,
    loadVerifiedReview: async () => ({ immutable: true, batch_id: noSourcePreview.batch_id, file_hash: noSourcePreview.file_hash, audit: noSourceReview.audit, records: noSourceReview.records }),
  });
  assert.equal(noSourceResult.code, "IMPORT_REVIEW_BLOCKED");

  const failedResult = await releaseCbiImport(trustedReview, {
    ...repository,
    appendVersion: async () => { throw new Error("transaction aborted"); },
  });
  assert.deepEqual(failedResult, { ok: false, code: "RELEASE_APPEND_FAILED" });
});
