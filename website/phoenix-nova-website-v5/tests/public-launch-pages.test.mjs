import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("bilingual public privacy and consultation routes are present and honest about intake state", async () => {
  const [privacy, consultation, prep, policy] = await Promise.all([
    read("app/[locale]/privacy/page.tsx"),
    read("app/[locale]/consultation/page.tsx"),
    read("components/consultation-preparation.tsx"),
    read("components/public-privacy-page.tsx"),
  ]);
  for (const source of [privacy, consultation]) {
    assert.match(source, /locale !== "zh" && locale !== "en"/);
    assert.match(source, /robots: \{ index: false, follow: false \}/);
  }
  assert.match(prep, /does not create a client/);
  assert.match(prep, /mailto:nova@phoenixnova.com.cn/);
  assert.match(policy, /Assessment answers are not automatically sent to CRM/);
  assert.doesNotMatch(prep, /submission successful|提交成功/i);
});
