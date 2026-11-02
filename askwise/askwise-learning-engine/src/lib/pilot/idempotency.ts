import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { authStorePath } from "./paths";

function fingerprint(value: unknown): string {
  function stable(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stable(x)]));
    return v;
  }
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

// Single-process pilot. Persist intent before writes; uncertain/crashed intents fail closed.
// Never repeat a mutation after an ambiguous response. Operator reconciliation is required.
export function performOnce<T>(studentId: number, operation: string, key: string, payload: unknown, run: () => T, root = path.join(path.dirname(authStorePath), "receipts", String(studentId))): T {
  if (!Number.isSafeInteger(studentId) || studentId <= 0 || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new Error("INVALID_REQUEST_ID");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const file = path.join(root, fingerprint([studentId, operation, key]) + ".json");
  const hash = fingerprint(payload);
  if (fs.existsSync(file)) {
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    if (receipt.fingerprint !== hash) throw new Error("IDEMPOTENCY_CONFLICT");
    if (receipt.status !== "done") throw new Error("REQUEST_PENDING_RECONCILIATION");
    return receipt.result as T;
  }
  fs.writeFileSync(file, JSON.stringify({ status: "pending", fingerprint: hash }), { flag: "wx", mode: 0o600 });
  const result = run();
  const temp = file + "." + randomUUID() + ".tmp";
  fs.writeFileSync(temp, JSON.stringify({ status: "done", fingerprint: hash, result }), { flag: "wx", mode: 0o600 });
  fs.renameSync(temp, file);
  return result;
}

// Receipts are hashed identifiers + opaque resource IDs, not answers or student profiles.
