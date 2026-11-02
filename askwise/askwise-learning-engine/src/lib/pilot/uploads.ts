import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { authStorePath } from "./paths";

const root = path.join(path.dirname(authStorePath), "uploads");
type Photo = { id: string; student_id: number; task_id: number; content_type: string; bytes: number; created_at: string };

export function savePhoto(studentId: number, taskId: number, bytes: Uint8Array): Photo {
  if (!Number.isSafeInteger(studentId) || studentId < 1 || !Number.isSafeInteger(taskId) || taskId < 1 || bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw new Error("INVALID_UPLOAD");
  const b = Buffer.from(bytes);
  const mime = b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : b[0] === 255 && b[1] === 216 && b[2] === 255 ? "image/jpeg"
    : b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!mime) throw new Error("INVALID_UPLOAD");
  if (mime === "image/png" && (b.length < 45 || b.toString("ascii", 12, 16) !== "IHDR" || b.readUInt32BE(8) !== 13 || b.readUInt32BE(16) < 1 || b.readUInt32BE(20) < 1 || b.readUInt32BE(16) * b.readUInt32BE(20) > 40000000 || b.toString("ascii", b.length - 8, b.length - 4) !== "IEND")) throw new Error("INVALID_UPLOAD");
  if (mime === "image/jpeg" && (b[b.length - 2] !== 255 || b[b.length - 1] !== 217)) throw new Error("INVALID_UPLOAD");
  if (mime === "image/webp" && b.readUInt32LE(4) + 8 !== b.length) throw new Error("INVALID_UPLOAD");
  const existing = listPhotos(studentId);
  if (existing.length >= 30 || existing.reduce((sum, p) => sum + p.bytes, 0) + b.length > 100 * 1024 * 1024) throw new Error("UPLOAD_QUOTA_EXCEEDED");
  const dir = path.join(root, String(studentId));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const record: Photo = { id: randomUUID(), student_id: studentId, task_id: taskId, content_type: mime, bytes: b.length, created_at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, record.id + ".bin"), b, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(dir, record.id + ".json"), JSON.stringify(record), { flag: "wx", mode: 0o600 });
  return record;
}

export function listPhotos(studentId: number): Photo[] {
  const dir = path.join(root, String(studentId));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Photo).filter(p => p.student_id === studentId);
}

export function readPhoto(studentId: number, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Resource unavailable");
  const record = listPhotos(studentId).find(p => p.id === id);
  if (!record) throw new Error("Resource unavailable");
  return { record, bytes: fs.readFileSync(path.join(root, String(studentId), id + ".bin")) };
}

export function removePrivateStudentFiles(studentId: number) {
  if (!Number.isSafeInteger(studentId) || studentId < 1) throw new Error("Invalid student");
  const base = path.dirname(authStorePath);
  for (const kind of ["uploads", "receipts"]) {
    const parent = path.resolve(base, kind);
    const target = path.resolve(parent, String(studentId));
    if (path.dirname(target) !== parent) throw new Error("Invalid private path");
    fs.rmSync(target, { recursive: true, force: true });
  }
}
