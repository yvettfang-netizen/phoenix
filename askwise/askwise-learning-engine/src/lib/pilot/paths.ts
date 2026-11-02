import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export function privatePath(value: string): string {
  const canonical = (value: string) => {
    let cursor = path.resolve(value);
    const suffix: string[] = [];
    while (!fs.existsSync(cursor)) {
      const parent = path.dirname(cursor);
      if (parent === cursor) throw new Error("Private storage root unavailable");
      suffix.unshift(path.basename(cursor)); cursor = parent;
    }
    return path.resolve(fs.realpathSync(cursor), ...suffix);
  };
  const target = canonical(value);
  const publicRoot = canonical(path.resolve(process.cwd(), "public"));
  const relative = path.relative(publicRoot, target);
  if (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) {
    throw new Error("Pilot data must be outside public assets");
  }
  return target;
}

const root = process.env.NODE_ENV === "test"
  ? path.join(os.tmpdir(), `askwise-tests-${process.pid}-${process.env.VITEST_POOL_ID || "0"}`)
  : path.resolve("data/pilot");
export const pilotDbPath = privatePath(process.env.ASKWISE_DB_PATH || path.join(root, "askwise-pilot.db"));
export const authStorePath = privatePath(process.env.ASKWISE_AUTH_PATH || path.join(root, "auth.json"));
if ((process.platform === "win32" ? authStorePath.toLowerCase() === pilotDbPath.toLowerCase() : authStorePath === pilotDbPath)) throw new Error("Auth store and SQLite file must be distinct");
