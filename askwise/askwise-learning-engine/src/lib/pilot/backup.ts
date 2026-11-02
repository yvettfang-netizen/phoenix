import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { privatePath } from "./paths";

// Offline restore only. Never overwrite an active database or restore auth sessions.
export async function restorePilotBackup(source: string, destination: string): Promise<void> {
  const from = privatePath(source);
  const target = privatePath(destination);
  if (fs.existsSync(target)) throw new Error("Restore destination already exists");
  const input = new Database(from, { readonly: true, fileMustExist: true });
  try {
    if (input.pragma("integrity_check", { simple: true }) !== "ok" || (input.pragma("foreign_key_check") as unknown[]).length) {
      throw new Error("Invalid backup");
    }
    for (const table of ["students", "experiments", "daily_tasks", "learning_sessions", "attempts", "diagnoses", "hints", "learning_evidences", "political_knowledge_map", "math_strategy_map", "daily_reflections"]) {
      if (!input.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) throw new Error("Incompatible backup");
    }
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    await input.backup(target);
    fs.chmodSync(target, 0o600);
  } finally { input.close(); }
}
