import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../lib/health-landing-content.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { gbaValues } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("bilingual cost guidance requires dated scope checks without unverified price advantages", () => {
  assert.equal(gbaValues.length, 6, "preserve the six-card service structure");
  const zh = gbaValues.flatMap(value => [value.title[0], value.body[0]]).join(" ");
  const en = gbaValues.flatMap(value => [value.title[1], value.body[1]]).join(" ");
  assert.doesNotMatch(zh, /费用竞争力|竞争力的医疗费用|相较香港及英国|更便宜|节省\s*\d/);
  assert.doesNotMatch(en, /competitive (?:medical )?costs|compared with similar private services|cheaper|save\s*\d/i);
  assert.match(zh, /书面报价、报价日期、包含及不包含的项目/);
  assert.match(en, /dated written estimate with inclusions and exclusions/i);
  assert.match(zh, /报价不代表最终账单/);
  assert.match(en, /Estimates are not final bills/);
  assert.match(zh, /不作跨地区价格比较或节省承诺/);
  assert.match(en, /no cross-region price comparisons or savings promises/i);
});
