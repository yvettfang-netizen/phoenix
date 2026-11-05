#!/usr/bin/env node

/**
 * Convert the Education Bureau's source-preserved school-location JSON into a
 * small, deterministic JSON boundary for the Education knowledge layer.
 *
 * This importer deliberately maps only fields that are explicit in the source:
 * name, district, gender, website, school level, funding type and source
 * category. It does not infer curriculum, language, fees or legal/non-profit
 * status.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORKTREE_ROOT = resolve(PROJECT_ROOT, "../..");
const DEFAULT_SOURCE = resolve(WORKTREE_ROOT, "outputs/education-recovery/SCH_LOC_EDB_2026-11-03.json");
const DEFAULT_OUTPUT = resolve(PROJECT_ROOT, "lib/data/education-schools-official.json");

export const SOURCE_URL = "https://www.edb.gov.hk/attachment/en/student-parents/sch-info/sch-search/sch-location-info/SCH_LOC_EDB.json";
export const SOURCE_LAST_MODIFIED = "2026-10-02";
export const SOURCE_RETRIEVED_ON = "2026-11-03";
export const SOURCE_SHA256 = "6CE338319E4E09482CA2CD19DCFE909FFBD3203C6D6F299F2BA96E0402395709";

const DISTRICT_ID_BY_SOURCE = Object.freeze({
  "CENTRAL AND WESTERN": "central-and-western",
  "WAN CHAI": "wan-chai",
  EASTERN: "eastern",
  SOUTHERN: "southern",
  "YAU TSIM MONG": "yau-tsim-mong",
  "SHAM SHUI PO": "sham-shui-po",
  "KOWLOON CITY": "kowloon-city",
  "WONG TAI SIN": "wong-tai-sin",
  "KWUN TONG": "kwun-tong",
  "TSUEN WAN": "tsuen-wan",
  "TUEN MUN": "tuen-mun",
  "YUEN LONG": "yuen-long",
  NORTH: "north",
  "TAI PO": "tai-po",
  "SAI KUNG": "sai-kung",
  "SHA TIN": "sha-tin",
  "KWAI TSING": "kwai-tsing",
  ISLANDS: "islands",
});

const STAGE_ID_BY_SOURCE = Object.freeze({
  KINDERGARTEN: "kindergarten",
  "KINDERGARTEN-CUM-CHILD CARE CENTRES": "kindergarten",
  PRIMARY: "primary-schools",
  SECONDARY: "secondary-schools",
});

const GENDER_BY_SOURCE = Object.freeze({
  "CO-ED": "coeducational",
  BOYS: "boys",
  GIRLS: "girls",
});

// CAPUT and ESF are retained as `other`; the raw finance type remains on each
// record so this conversion does not pretend that they are aided/government.
const FUNDING_BY_SOURCE = Object.freeze({
  GOVERNMENT: "government",
  AIDED: "aided",
  "DIRECT SUBSIDY SCHEME": "direct-subsidy",
  PRIVATE: "private",
  "PRIVATE INDEPENDENT SCH SCHEME": "private",
  CAPUT: "other",
  "ENGLISH SCHOOLS FOUNDATION": "other",
});

const requiredFields = [
  "SCHOOL NO.",
  "ENGLISH CATEGORY",
  "中文類別",
  "ENGLISH NAME",
  "中文名稱",
  "STUDENTS GENDER",
  "DISTRICT",
  "FINANCE TYPE",
  "SCHOOL LEVEL",
  "WEBSITE",
  "SESSION",
];

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourcePath = resolve(option("--source", DEFAULT_SOURCE));
const outputPath = resolve(option("--output", DEFAULT_OUTPUT));
const allowSourceChange = args.includes("--allow-source-change");
const expectedHash = option("--expected-sha256", SOURCE_SHA256).toUpperCase();

const asText = (value, field, rowNumber) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new Error(`Row ${rowNumber}: ${field} must be a non-empty string or finite number`);
};

const optionalText = value => typeof value === "string" && value.trim() ? value.trim() : null;

const toOfficialUrl = value => {
  const candidate = optionalText(value);
  if (!candidate || !/^https?:\/\//i.test(candidate)) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
};

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const hashFile = contents => createHash("sha256").update(contents).digest("hex").toUpperCase();

export function convertRows(rows, provenance) {
  const sourceKeyCounts = new Map();
  for (const [index, source] of rows.entries()) {
    const code = asText(source["SCHOOL NO."], "SCHOOL NO.", index + 1);
    const session = asText(source.SESSION, "SESSION", index + 1);
    const sourceKey = `${code}|${session}`;
    sourceKeyCounts.set(sourceKey, (sourceKeyCounts.get(sourceKey) ?? 0) + 1);
  }

  const occurrenceBySourceKey = new Map();
  return rows.map((source, index) => {
    const rowNumber = index + 1;
    for (const field of requiredFields) {
      asText(source[field], field, rowNumber);
    }
    const sourceSchoolCode = asText(source["SCHOOL NO."], "SCHOOL NO.", rowNumber);
    const sourceSession = asText(source.SESSION, "SESSION", rowNumber);
    const sourceKey = `${sourceSchoolCode}|${sourceSession}`;
    const duplicateCount = sourceKeyCounts.get(sourceKey);
    const duplicateOrdinal = (occurrenceBySourceKey.get(sourceKey) ?? 0) + 1;
    occurrenceBySourceKey.set(sourceKey, duplicateOrdinal);

    const sourceDistrict = asText(source.DISTRICT, "DISTRICT", rowNumber);
    const district = DISTRICT_ID_BY_SOURCE[sourceDistrict];
    if (!district) throw new Error(`Row ${rowNumber}: unmapped official district ${sourceDistrict}`);

    const sourceStage = asText(source["SCHOOL LEVEL"], "SCHOOL LEVEL", rowNumber);
    const stageId = STAGE_ID_BY_SOURCE[sourceStage];
    if (!stageId) throw new Error(`Row ${rowNumber}: unmapped official school level ${sourceStage}`);

    const sourceGender = asText(source["STUDENTS GENDER"], "STUDENTS GENDER", rowNumber);
    const gender = GENDER_BY_SOURCE[sourceGender];
    if (!gender) throw new Error(`Row ${rowNumber}: unmapped official gender ${sourceGender}`);

    const sourceFunding = asText(source["FINANCE TYPE"], "FINANCE TYPE", rowNumber);
    const funding = FUNDING_BY_SOURCE[sourceFunding];
    if (!funding) throw new Error(`Row ${rowNumber}: unmapped official finance type ${sourceFunding}`);

    const entitySuffix = duplicateCount > 1 ? `-${String(duplicateOrdinal).padStart(2, "0")}` : "";
    return {
      entityId: `institution.hk.edb.school.${slug(sourceSchoolCode)}.${slug(sourceSession)}${entitySuffix}`,
      sourceRowNumber: rowNumber,
      sourceSchoolCode,
      sourceSession,
      sourceKey,
      sourceDuplicateCount: duplicateCount,
      sourceDuplicateOrdinal: duplicateOrdinal,
      sourceEnglishCategory: asText(source["ENGLISH CATEGORY"], "ENGLISH CATEGORY", rowNumber),
      sourceChineseCategory: asText(source["中文類別"], "中文類別", rowNumber),
      sourceSchoolLevel: sourceStage,
      sourceFinanceType: sourceFunding,
      sourceDistrict,
      sourceGender,
      sourceWebsite: optionalText(source.WEBSITE),
      name: { zh: asText(source["中文名稱"], "中文名稱", rowNumber), en: asText(source["ENGLISH NAME"], "ENGLISH NAME", rowNumber) },
      district,
      gender,
      website: toOfficialUrl(source.WEBSITE),
      stageId,
      funding,
      sourceProvenance: provenance,
    };
  });
}

export async function main() {
  const sourceContents = await readFile(sourcePath);
  const actualHash = hashFile(sourceContents);
  if (!allowSourceChange && actualHash !== expectedHash) {
    throw new Error(`Source SHA-256 mismatch: expected ${expectedHash}, received ${actualHash}. Pass --allow-source-change only after reviewing the new source.`);
  }
  const parsed = JSON.parse(sourceContents.toString("utf8"));
  if (!Array.isArray(parsed)) throw new Error("Expected a top-level JSON array");
  const provenance = {
    sourceUrl: SOURCE_URL,
    sourceLastModified: SOURCE_LAST_MODIFIED,
    sourceSha256: actualHash,
    retrievedOn: SOURCE_RETRIEVED_ON,
    sourceRecordCount: parsed.length,
  };
  const records = convertRows(parsed, provenance);
  const output = {
    schemaVersion: "education-schools-official.v1",
    source: provenance,
    records,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const uniqueSourceKeys = new Set(records.map(record => record.sourceKey)).size;
  console.log(JSON.stringify({ outputPath, sourceSha256: actualHash, records: records.length, uniqueSourceKeys }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("import-education-schools.mjs")) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
