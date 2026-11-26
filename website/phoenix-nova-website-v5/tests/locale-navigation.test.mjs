import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("../lib/locale-navigation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { localizedHref, resolveLocaleSwitch, getCurrentLocale, getDocumentLocale } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("locale links preserve business paths, explicit locales, queries and fragments", () => {
  for (const page of ["", "/education", "/identity", "/health", "/account", "/about", "/contact"]) {
    assert.equal(localizedHref("en", `/zh${page}`), `/en${page}`);
    assert.equal(localizedHref("zh", `/en${page}`), `/zh${page}`);
  }
  assert.equal(resolveLocaleSwitch("/zh/health?source=home#consultation", "en"), "/en/health?source=home#consultation");
  assert.equal(localizedHref("en", "https://wealth.phoenixnova.com.cn/en"), "https://wealth.phoenixnova.com.cn/en");
  assert.equal(getCurrentLocale("/en/education"), "en");
  assert.equal(getCurrentLocale("/zh/identity"), "zh");
  assert.equal(getCurrentLocale("/fr/identity"), null);
});

test("document language follows the locale on Insights and Health routes", () => {
  for (const locale of ["zh", "en"]) {
    for (const path of ["/health", "/health/providers", "/compass/health", "/insights", "/insights/articles/sample"]) {
      assert.equal(getDocumentLocale(`/${locale}${path}`), locale);
    }
  }
  assert.equal(getDocumentLocale("/en/insights-archive"), null);
  assert.equal(getDocumentLocale("/en/identity"), null);
  assert.equal(getDocumentLocale("/fr/insights"), null);
});
