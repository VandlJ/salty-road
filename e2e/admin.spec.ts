import { test, expect } from "@playwright/test";

// F2.6 — admin login, order visibility from F2.2's purchase, status change,
// and the auth gate on logout.

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || "e2e-admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "e2e-test-password-12345";

test.describe("admin orders", () => {
  test("login, view an order, change its status, then log out and lose access", async ({ page }) => {
    await page.goto("/cs/admin");
    await page.locator('[data-testid="admin-username"]').fill(ADMIN_USERNAME);
    await page.locator('[data-testid="admin-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="admin-login-submit"]').click();

    await expect(page.getByRole("link", { name: /objednávky/i })).toBeVisible();
    await page.getByRole("link", { name: /objednávky/i }).click();
    await expect(page).toHaveURL(/\/admin\/orders$/);

    const firstOrder = page.locator('[data-testid="admin-order-row"]').first();
    await expect(firstOrder).toBeVisible();

    const statusSelect = firstOrder.locator('[data-testid="admin-order-status"]');
    await statusSelect.selectOption("paid");
    await expect(statusSelect).toHaveValue("paid");

    // Logging out and returning to the same admin page must fall back to
    // the login form — no session, no data.
    await page.goto("/cs/admin");
    await page.getByRole("button", { name: /odhlásit/i }).click();
    await page.goto("/cs/admin/orders");
    await expect(page.locator('[data-testid="admin-username"]')).toBeVisible();
  });
});
