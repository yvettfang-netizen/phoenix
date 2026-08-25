import fs from "node:fs";
import path from "node:path";
import { type SessionLogEntry, type Subject, type HintLevel } from "./engine-types";

export class SessionLogger {
  private readonly path: string;

  constructor(logPath = "askwise_session_log.json") {
    this.path = path.resolve(process.cwd(), logPath);
  }

  private load(): SessionLogEntry[] {
    if (!fs.existsSync(this.path)) return [];
    try {
      const raw = fs.readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  private save(rows: SessionLogEntry[]) {
    fs.writeFileSync(this.path, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
  }

  append(entry: Omit<SessionLogEntry, "timestamp"> & { timestamp?: string }) {
    const rows = this.load();
    rows.push({
      timestamp: entry.timestamp ?? new Date().toISOString(),
      subject: entry.subject,
      topic: entry.topic,
      studentInput: entry.studentInput,
      diagnosis: entry.diagnosis,
      errorType: entry.errorType,
      learningMode: entry.learningMode,
      hintLevel: entry.hintLevel,
      firstStepTime: entry.firstStepTime ?? null,
      outcome: entry.outcome,
    });
    this.save(rows);
  }
}

export function createSessionLogEntry(params: {
  subject: Subject;
  topic: string;
  studentInput: string;
  diagnosis: string;
  errorType: string;
  learningMode: string;
  hintLevel: HintLevel;
  firstStepTime?: number;
  outcome: "correct" | "incorrect";
}): Omit<SessionLogEntry, "timestamp"> {
  return {
    subject: params.subject,
    topic: params.topic,
    studentInput: params.studentInput,
    diagnosis: params.diagnosis,
    errorType: params.errorType,
    learningMode: params.learningMode as any,
    hintLevel: params.hintLevel,
    firstStepTime: params.firstStepTime ?? null,
    outcome: params.outcome,
  };
}
