import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const schools = readFileSync(new URL("../app/[locale]/education/schools/page.tsx", import.meta.url), "utf8");
const programmes = readFileSync(new URL("../app/[locale]/education/programmes/page.tsx", import.meta.url), "utf8");

test("school search keeps funding, operation, legal status and curriculum as separate multi-select dimensions", () => {
  for (const name of ["funding", "operation", "legal", "curriculum"]) {
    assert.match(schools, new RegExp(`name=\\\"${name}\\\"`));
    assert.match(schools, new RegExp(`name=\\\"${name}\\\"[^>]*multiple`));
  }
  assert.match(schools, /non-profit/);
  assert.match(schools, /ib-dp/);
  assert.match(schools, /a-level/);
  assert.match(schools, /ap/);
  assert.match(schools, /International school is a school\/curriculum context/);
  assert.match(schools, /primary-schools/);
  assert.match(schools, /secondary-schools/);
  assert.match(schools, /includeUnpublished: true/);
  assert.match(schools, /publicationStates: \["candidate", "published"\]/);
  assert.match(schools, /pageHref/);
});

test("programme search exposes future-safe dimensions while keeping empty unverified data explicit", () => {
  for (const name of ["degree", "mode", "subject", "cycle"]) assert.match(programmes, new RegExp(`\\\"${name}\\\"`));
  assert.match(programmes, /searchEducationKnowledge[\s\S]*degree,[\s\S]*mode,[\s\S]*subject,[\s\S]*cycle,/);
  assert.match(programmes, /No programme records are approved for publication yet/);
  assert.match(programmes, /robots: \{ index: false, follow: false \}/);
  assert.match(programmes, /educationAlternates\(locale, "programmes"\)/);
});
