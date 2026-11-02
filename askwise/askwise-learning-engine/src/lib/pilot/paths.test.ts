import { expect, it } from "vitest";
import path from "node:path";
import { privatePath } from "./paths";

it("rejects all public storage including dot-prefixed subdirectories", () => {
  expect(() => privatePath("public/pilot.db")).toThrow("outside public");
  expect(() => privatePath("public/..hidden/auth.json")).toThrow("outside public");
});

it("accepts server-private sibling storage", () => {
  expect(path.isAbsolute(privatePath("data/pilot/example.db"))).toBe(true);
});
