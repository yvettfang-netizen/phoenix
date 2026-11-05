import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  // Application sources use bundler-style extensionless relative TS imports.
  if (context.parentURL?.endsWith(".ts") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    try { return await nextResolve(specifier + ".ts", context); }
    catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".ts")) {
    const source = await readFile(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      fileName: new URL(url).pathname,
    }).outputText };
  }
  return nextLoad(url, context);
}
