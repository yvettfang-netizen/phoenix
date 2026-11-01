import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// The application is TypeScript-first.  Transpile the two pure modules into
// an isolated temporary ESM directory so these tests never import production
// data through a database, network, or browser runtime.
const sourceRoot = new URL("../lib/", import.meta.url);
const work = await mkdtemp(join(tmpdir(), "phoenix-education-knowledge-"));
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const knowledgeSource = await readFile(new URL("education-knowledge.ts", sourceRoot), "utf8");
const searchSource = await readFile(new URL("education-knowledge-search.ts", sourceRoot), "utf8");
await writeFile(join(work, "education-knowledge.mjs"), transpile(knowledgeSource));
await writeFile(join(work, "education-knowledge-search.mjs"), transpile(searchSource).replace(
  /from ["']\.\/education-knowledge["']/g,
  'from "./education-knowledge.mjs"',
));
const knowledge = await import(pathToFileURL(join(work, "education-knowledge.mjs")).href);
const search = await import(pathToFileURL(join(work, "education-knowledge-search.mjs")).href);

test.after(async () => rm(work, { recursive: true, force: true }));

const published = (state = "published", expiresAt = null, visibleIn = ["hub", "search"]) => ({
  state,
  visibleIn,
  publishedAt: "2026-01-01",
  expiresAt,
});

const verification = {
  status: "verified",
  verifiedFields: ["name"],
  lastVerifiedOn: "2026-01-01",
  sources: [],
  note: { zh: "测试夹具", en: "Synthetic fixture" },
};

// Synthetic records are deliberately labelled fixtures and never exported by
// the production dataset.
const fixtureInstitution = (overrides = {}) => ({
  entityId: "fixture.school.primary-shatin",
  entityType: "institution",
  names: { zh: "沙田测试学校", en: "Sha Tin Fixture School" },
  aliases: [],
  institutionKind: "school",
  classifications: {
    funding: ["government"],
    operation: ["public"],
    legal: ["registered-school"],
    curricula: ["ib-pyp", "ib-myp"],
  },
  stageIds: ["primary-schools"],
  district: "sha-tin",
  languageOfInstruction: null,
  gender: null,
  ageRange: null,
  fees: null,
  officialHomepage: null,
  summary: { zh: "测试夹具，不是生产资料。", en: "Synthetic fixture, not production data." },
  updatedAt: "2026-02-01",
  verification,
  publication: published(),
  ...overrides,
});

const fixtureProgramme = (id, cycleOverrides = {}, overrides = {}) => ({
  entityId: id,
  entityType: "programme",
  names: { zh: "测试课程", en: "Fixture Programme" },
  aliases: [],
  institutionEntityId: null,
  stageIds: ["primary-schools"],
  district: "sha-tin",
  classifications: { funding: [], operation: [], legal: [], curricula: ["ib-pyp"] },
  description: { zh: "测试课程夹具。", en: "Synthetic programme fixture." },
  officialHomepage: null,
  cycles: [{
    cycleId: `${id}.cycle.2026`,
    names: { zh: "2026 测试周期", en: "2026 Fixture Cycle" },
    opensOn: "2026-01-01",
    closesOn: "2026-12-01",
    startsOn: "2026-09-01",
    expiresAt: null,
    publication: published(),
    sources: [],
    ...cycleOverrides,
  }],
  updatedAt: "2026-03-01",
  verification,
  publication: published(),
  ...overrides,
});

const fixtureDataset = {
  version: "fixture-education-knowledge",
  institutions: [
    fixtureInstitution(),
    fixtureInstitution({
      entityId: "fixture.school.secondary-wan-chai",
      names: { zh: "湾仔测试中学", en: "Wan Chai Fixture Secondary School" },
      classifications: { funding: ["aided"], operation: ["independent"], legal: ["registered-school"], curricula: ["dse"] },
      stageIds: ["secondary-schools"],
      district: "wan-chai",
    }),
  ],
  programmes: [
    fixtureProgramme("fixture.programme.active"),
    fixtureProgramme("fixture.programme.expired", { closesOn: "2026-02-01", expiresAt: "2026-02-01" }),
    fixtureProgramme("fixture.programme.draft", {}, { publication: published("draft") }),
  ],
  stages: knowledge.EDUCATION_STAGE_DESCRIPTORS,
  districts: knowledge.HONG_KONG_18_DISTRICTS,
};

test("production seed is the verified UGC hub roster and keeps bilingual IDs stable", () => {
  assert.equal(knowledge.UGC_FUNDED_INSTITUTIONS.length, 8);
  assert.equal(new Set(knowledge.UGC_FUNDED_INSTITUTIONS.map(record => record.entityId)).size, 8);
  assert.equal(knowledge.HONG_KONG_18_DISTRICTS.length, 18);
  assert.deepEqual(
    knowledge.EDUCATION_STAGE_DESCRIPTORS.map(stage => stage.id),
    ["kindergarten", "primary-schools", "secondary-schools", "hong-kong-universities", "subdegrees", "postgraduate", "global", "academy"],
  );
  for (const institution of knowledge.UGC_FUNDED_INSTITUTIONS) {
    assert.ok(institution.names.zh && institution.names.en);
    assert.equal(institution.classifications.funding.length, 1);
    assert.equal(institution.classifications.funding[0], "ugc-funded");
    assert.equal(institution.officialHomepage.startsWith("https://"), true);
    assert.deepEqual(institution.verification.verifiedFields, ["name", "funding", "officialHomepage"]);
    assert.deepEqual(institution.publication.visibleIn, ["hub", "search"]);
    assert.equal(institution.summary, null, "unverified rich facts stay null");
  }
  assert.equal(knowledge.EDUCATION_PROGRAMMES.length, 0, "no programme facts are fabricated");
});

test("composable facets keep funding, operation, curriculum and district dimensions distinct", () => {
  const query = search.composeEducationSearchQuery(
    { stageIds: ["primary-schools"] },
    { districtIds: ["sha-tin"] },
    { fundingLabels: ["government"] },
    { operationLabels: ["public"] },
    { curriculumLabels: ["ib-pyp"] },
    { asOf: "2026-06-01", surface: "search" },
  );
  assert.deepEqual(query.fundingLabels, ["government"]);
  assert.deepEqual(query.operationLabels, ["public"]);
  const result = search.searchEducationKnowledge(fixtureDataset, query);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].entityId, "fixture.school.primary-shatin");
  assert.deepEqual(search.resetEducationKnowledgeSearchQuery(), {});
  assert.notStrictEqual(search.resetEducationKnowledgeSearchQuery(), search.resetEducationKnowledgeSearchQuery());
});

test("text search, bilingual labels, stable sorting and one-based pagination are pure", () => {
  const english = search.searchEducationKnowledge(fixtureDataset, {
    text: "Wan Chai",
    locale: "en",
    surface: "search",
    asOf: "2026-06-01",
    sort: "name-asc",
    page: 1,
    pageSize: 1,
  });
  assert.equal(english.total, 1);
  assert.equal(english.items[0].names.en, "Wan Chai Fixture Secondary School");
  assert.equal(english.page, 1);
  assert.equal(english.totalPages, 1);

  const paged = search.searchEducationKnowledge(fixtureDataset, { surface: "search", asOf: "2026-06-01", pageSize: 1, sort: "name-asc" });
  assert.equal(paged.total, 3, "two institutions plus one currently published programme");
  assert.equal(paged.hasNext, true);
  assert.equal(paged.items.length, 1);
  assert.equal(search.getEducationKnowledgeFacetCounts(fixtureDataset, { surface: "search", asOf: "2026-06-01" }).stages["primary-schools"], 2);
});

test("published programme cycles expire and unpublished records stay gated", () => {
  const atJune = search.searchEducationKnowledge(fixtureDataset, { entityKind: "programme", surface: "search", asOf: "2026-06-01" });
  assert.deepEqual(atJune.items.map(record => record.entityId), ["fixture.programme.active"]);

  const withExpired = search.searchEducationKnowledge(fixtureDataset, {
    entityKind: "programme",
    surface: "search",
    asOf: "2026-06-01",
    includeExpired: true,
  });
  assert.deepEqual(withExpired.items.map(record => record.entityId), ["fixture.programme.active", "fixture.programme.expired"]);

  const withDraft = search.searchEducationKnowledge(fixtureDataset, {
    entityKind: "programme",
    surface: "search",
    asOf: "2026-06-01",
    includeUnpublished: true,
    publicationStates: ["draft"],
  });
  assert.deepEqual(withDraft.items.map(record => record.entityId), ["fixture.programme.draft"]);
  assert.equal(knowledge.isPublicationVisible(fixtureDataset.programmes[1].publication, "2026-06-01", "search"), true);
  assert.equal(knowledge.isProgrammeCycleVisible(fixtureDataset.programmes[1].cycles[0], "2026-06-01", "search"), false);
});
