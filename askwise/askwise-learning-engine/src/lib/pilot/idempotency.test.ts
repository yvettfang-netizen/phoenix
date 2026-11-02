import { expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performOnce } from "./idempotency";

it("replays after a lost response without repeating writes and rejects changed payloads", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "askwise-receipt-"));
  let writes = 0;
  const run = () => ({ id: ++writes });
  const key = "anonymous_request_0001";
  expect(performOnce(1, "task", key, { value: 1 }, run, root)).toEqual({ id: 1 });
  expect(performOnce(1, "task", key, { value: 1 }, run, root)).toEqual({ id: 1 });
  expect(writes).toBe(1);
  expect(() => performOnce(1, "task", key, { value: 2 }, run, root)).toThrow("IDEMPOTENCY_CONFLICT");
  expect(performOnce(2, "task", key, { value: 1 }, run, root)).toEqual({ id: 2 });
});

it("does not repeat uncertain partial writes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "askwise-pending-"));
  let writes = 0;
  expect(() => performOnce(1, "task", "anonymous_request_0002", {}, () => { writes++; throw new Error("interrupted"); }, root)).toThrow("interrupted");
  expect(() => performOnce(1, "task", "anonymous_request_0002", {}, () => ++writes, root)).toThrow("REQUEST_PENDING_RECONCILIATION");
  expect(writes).toBe(1);
});
