import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Miniflare } from "miniflare";

// Exercise the built application in its real Workers environment. Direct Node
// imports cannot resolve cloudflare:workers or provide request-scoped bindings.
export function createV5Worker(bindings = {}) {
  const root = fileURLToPath(new URL("../dist/server/", import.meta.url));
  const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
  const entry = join(root, "index.js");
  return new Miniflare({
    modules: [entry, ...files(root).filter(path => path.endsWith(".js") && path !== entry)]
      .map(path => ({ type: "ESModule", path })),
    modulesRoot: root,
    compatibilityDate: "2026-03-17",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    bindings,
  });
}
