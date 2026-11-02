import { expect, it } from "vitest";
import { pilotDate } from "./date";

it("keeps the Shanghai pilot day across UTC date boundaries", () => {
  expect(pilotDate(new Date("2026-10-31T16:00:00Z"))).toBe("2026-11-01");
  expect(pilotDate(new Date("2026-11-01T15:59:59Z"))).toBe("2026-11-01");
  expect(pilotDate(new Date("2026-11-01T16:00:00Z"))).toBe("2026-11-02");
});
