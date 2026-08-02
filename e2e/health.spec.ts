import { test, expect } from "@playwright/test";

// Placeholder so `test:e2e` has something to run and the CI e2e job/webServer
// wiring is exercised end-to-end. The real critical-path specs (purchase
// flow, coupons, gift, registration, admin, kill switch) are F2.2-F2.7 in
// Test_Implementation_Plan.md — not written yet.
test("homepage responds", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
});

test("shop-status API responds with the seeded shape", async ({ request }) => {
  const res = await request.get("/api/shop-status");
  expect(res.ok()).toBe(true);
  const json = await res.json();
  expect(json).toHaveProperty("enabled");
  expect(json).toHaveProperty("shippingFeeHalire");
});
