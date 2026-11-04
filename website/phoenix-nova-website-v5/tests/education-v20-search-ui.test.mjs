import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const schools = readFileSync(new URL("../app/[locale]/education/schools/page.tsx", import.meta.url), "utf8");
const programmes = readFileSync(new URL("../app/[locale]/education/programmes/page.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/education-landing.tsx", import.meta.url), "utf8");

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

test("unverified programme and application-cycle data stays out of production surfaces", () => {
  assert.match(programmes, /notFound\(\)/);
  assert.doesNotMatch(programmes, /searchEducationKnowledge/);
  assert.match(programmes, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(landing, /education\/programmes/);
});
