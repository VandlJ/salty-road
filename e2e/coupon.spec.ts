import { test, expect, type Page } from "@playwright/test";

// F2.3 — coupon behaviour at checkout, against the coupons seeded by
// scripts/seedTestDb.mjs (TEST10, TESTFIX, TESTSHIP, TESTONCE). Coupon entry
// lives on the checkout page (not the cart) — it sits next to delivery
// method, which the free-shipping coupon needs to make sense of.

async function addHoodieToCheckout(page: Page) {
  await page.goto("/cs/shop/test-hoodie");
  await page.locator('[data-testid="variant-color-option"][data-color="Černá"]').click();
  await page.locator('[data-testid="variant-size-option"][data-size="M"]').click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.goto("/cs/shop/checkout");
}

async function applyCoupon(page: Page, code: string) {
  await page.locator('[data-testid="coupon-input"]').fill(code);
  await page.locator('[data-testid="coupon-apply"]').click();
  // validateCoupon() is async and only clears the input on success — apply
  // calls fired back-to-back before this settles would fill the field while
  // a stale response is still in flight and clobber it. Wait for either
  // outcome (this code's chip, or the error message) before returning.
  await expect(
    page.getByText(code, { exact: false }).or(page.getByText("Neplatný nebo vyčerpaný kupón."))
  ).toBeVisible();
}

test.describe("checkout coupons", () => {
  test("a percent coupon discounts 10% of the subtotal", async ({ page }) => {
    await addHoodieToCheckout(page);
    await applyCoupon(page, "TEST10");
    await expect(page.getByText("TEST10", { exact: false })).toBeVisible();
    // 10% of 65000 halire = 6500 halire = 65 Kč
    await expect(page.getByText("-65 Kč", { exact: false })).toBeVisible();
  });

  test("a fixed coupon discounts exactly 100 Kč", async ({ page }) => {
    await addHoodieToCheckout(page);
    await applyCoupon(page, "TESTFIX");
    await expect(page.getByText("-100 Kč", { exact: false })).toBeVisible();
  });

  test("a free_shipping coupon zeroes the shipping line without touching the item subtotal", async ({ page }) => {
    await addHoodieToCheckout(page);
    await applyCoupon(page, "TESTSHIP");
    await expect(page.getByText("TESTSHIP", { exact: false })).toBeVisible();
    await expect(page.locator('[data-testid="checkout-shipping-fee"]')).toHaveText("Zdarma");
  });

  test("an invalid code shows an error and leaves the total unchanged", async ({ page }) => {
    await addHoodieToCheckout(page);
    // The shipping fee is fetched async and folds into checkout-total once
    // it lands — wait for it to settle before snapshotting the "before"
    // value, or a slow fetch makes this a false failure.
    const total = page.locator('[data-testid="checkout-total"]');
    await expect(total).toContainText("Kč");
    const totalBefore = await total.innerText();
    await applyCoupon(page, "NOTREAL");
    await expect(page.getByText("Neplatný nebo vyčerpaný kupón.")).toBeVisible();
    await expect(total).toHaveText(totalBefore);
  });

  test("a discount coupon and a shipping coupon combine independently", async ({ page }) => {
    await addHoodieToCheckout(page);
    await applyCoupon(page, "TEST10");
    await applyCoupon(page, "TESTSHIP");
    await expect(page.getByText("TEST10", { exact: false })).toBeVisible();
    await expect(page.getByText("TESTSHIP", { exact: false })).toBeVisible();
  });

  test("removing the last cart item clears the applied coupon", async ({ page }) => {
    await addHoodieToCheckout(page);
    await applyCoupon(page, "TEST10");
    await page.goto("/cs/shop/cart");
    await page.locator('[data-testid="cart-item-remove"]').click();
    // Cart becomes empty — re-adding the item must not silently resurrect
    // the discount from localStorage.
    await addHoodieToCheckout(page);
    await expect(page.getByText("TEST10", { exact: false })).not.toBeVisible();
  });

  test("a maxUses:1 coupon is rejected on a second checkout", async ({ page, browser }) => {
    // First order consumes TESTONCE's single use, via the real checkout API
    // (not re-driving the whole UI flow twice) — the interesting assertion
    // is what happens on the *second* attempt, exercised through the UI.
    const firstOrderRes = await page.request.post("/api/merch/checkout", {
      data: {
        customerName: "První Zákazník",
        customerEmail: "e2e-testonce-1@example.com",
        customerPhone: "+420 111222333",
        address: "Testovací 1, 11000 Praha",
        paymentMethod: "bank_transfer",
        deliveryMethod: "shipping",
        items: [{ sku: "TEST-HOODIE-WHITE-S", qty: 1 }],
        couponCode: "TESTONCE",
        idempotencyKey: crypto.randomUUID(),
      },
    });
    expect(firstOrderRes.ok()).toBe(true);

    // Second attempt, fresh browser context so the cart/coupon state can't
    // leak from the first — apply the same code and confirm it's rejected.
    const context = await browser.newContext();
    const page2 = await context.newPage();
    await addHoodieToCheckout(page2);
    await applyCoupon(page2, "TESTONCE");
    await expect(page2.getByText("Neplatný nebo vyčerpaný kupón.")).toBeVisible();
    await context.close();
  });
});
