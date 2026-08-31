import { expect, test } from "@playwright/test";

test("foundation routes and rules gate are visible", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("家庭财富");
  await page.goto("/assessment");
  await expect(page.getByRole("status")).toContainText("RULES_NOT_LOADED");
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok", rulesStatus: "RULES_NOT_LOADED" });
});
