import { readFileSync } from "node:fs";
import ts from "typescript";

const urls = new Map();
export async function cbiModuleUrl(relativePath) {
  if (urls.has(relativePath)) return urls.get(relativePath);
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [specifier, target] of [["./cbi-schema.ts", "../lib/cbi-schema.ts"], ["@/lib/cbi-comparison-engine", "../lib/cbi-comparison-engine.ts"]]) {
    if (js.includes(`"${specifier}"`) || js.includes(`'${specifier}'`)) {
      const url = await cbiModuleUrl(target);
      js = js.replaceAll(`"${specifier}"`, JSON.stringify(url)).replaceAll(`'${specifier}'`, JSON.stringify(url));
    }
  }
  const url = "data:text/javascript;base64," + Buffer.from(js).toString("base64"); urls.set(relativePath, url); return url;
}
export async function loadCbiTypescript(relativePath) { return import(await cbiModuleUrl(relativePath)); }
