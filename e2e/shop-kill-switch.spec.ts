import { test, expect } from "@playwright/test";

// F2.7 — the shop_enabled=false state is one the site is actually in
// sometimes; nothing else in this suite exercises it. Toggles the seeded
// setting off, asserts, then restores it so later test runs aren't affected
// (each CI run gets a fresh DB anyway, but this keeps the suite order-safe).

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || "e2e-admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "e2e-test-password-12345";

test.describe("shop kill switch", () => {
  test("disabling the shop hides the nav link, noindexes /shop, and drops it from the sitemap", async ({ page, request }) => {
    const login = await request.post("/api/admin/login", {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    expect(login.ok()).toBe(true);

    await request.patch("/api/admin/settings", { data: { shopEnabled: false } });
    try {
      await page.goto("/cs");
      await expect(page.locator('[data-testid="cart-link"]')).toHaveCount(0);

      const shopRes = await page.goto("/cs/shop");
      expect(shopRes?.status()).toBe(200);
      const robotsMeta = await page.locator('meta[name="robots"]').getAttribute("content");
      expect(robotsMeta).toContain("noindex");

      const sitemapRes = await request.get("/sitemap.xml");
      const sitemapBody = await sitemapRes.text();
      expect(sitemapBody).not.toContain("/shop/test-hoodie");
    } finally {
      await request.patch("/api/admin/settings", { data: { shopEnabled: true } });
    }
  });
});
