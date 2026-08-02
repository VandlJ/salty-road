import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// F2.2 — the single most valuable path in the app: browse, add to cart,
// checkout, land on a real order with a VS and QR code. Relies on
// scripts/seedTestDb.mjs having run first (test-hoodie, shop_enabled=true).

test.describe("purchase flow", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("browse, add to cart, checkout, receive a confirmed order", async ({ page, request }) => {
    // /shop must render its product grid in the initial HTML — regression
    // guard for the page having once been client-rendered (nothing to wait
    // on beyond DOM content, no hydration-dependent assertion here).
    await page.goto("/cs/shop", { waitUntil: "domcontentloaded" });
    const hoodieCard = page.locator('[data-testid="product-card"][data-slug="test-hoodie"]');
    await expect(hoodieCard).toBeVisible();

    await hoodieCard.click();
    await expect(page).toHaveURL(/\/shop\/test-hoodie$/);

    await page.locator('[data-testid="variant-color-option"][data-color="Černá"]').click();
    await page.locator('[data-testid="variant-size-option"][data-size="M"]').click();

    // Price reflects the selected variant (all test-hoodie variants share
    // the same seeded price, so this just confirms the price block renders
    // once a variant is selected, not a specific per-variant number).
    await expect(page.getByText("650 Kč", { exact: false })).toBeVisible();

    await page.locator('[data-testid="add-to-cart"]').click();
    // Both desktop and mobile nav render a CartLink (one hidden via CSS,
    // both present in the DOM) — .first() avoids a strict-mode violation.
    await expect(page.locator('[data-testid="cart-badge"]').first()).toHaveText("1");

    await page.locator('[data-testid="cart-link"]').first().click();
    await expect(page).toHaveURL(/\/shop\/cart$/);

    const cartItem = page.locator('[data-testid="cart-item"][data-sku="TEST-HOODIE-BLACK-M"]');
    await expect(cartItem).toBeVisible();

    // Bump quantity to 2 and confirm the line total follows (2 x 650 Kč +
    // shipping — cart-total includes the shipping preview, not just items).
    await cartItem.getByRole("button", { name: "Zvýšit počet" }).click();
    await expect(page.locator('[data-testid="cart-total"]')).toContainText("399 Kč");

    await page.locator('[data-testid="cart-checkout"]').click();
    await expect(page).toHaveURL(/\/shop\/checkout$/);

    await page.getByLabel("Jméno").fill("Jan");
    await page.getByLabel("Příjmení").fill("Novák");
    await page.getByLabel("E-mail").fill("e2e-purchase@example.com");
    await page.locator('[data-testid="checkout-phone-number"]').fill("111222333");
    await page.getByLabel("Ulice a číslo popisné").fill("Testovací 1");
    await page.getByLabel("Město").fill("Praha");
    await page.getByLabel("PSČ").fill("11000");

    await page.locator('[data-testid="checkout-submit"]').click();
    await expect(page).toHaveURL(/\/shop\/thank-you$/);

    const vsText = await page.locator('[data-testid="order-vs"]').innerText();
    expect(vsText.trim().length).toBeGreaterThan(0);

    // Cross-check directly against the DB: the order exists with the right
    // total, and stock actually moved by exactly the ordered quantity.
    const shopStatus = await request.get("/api/shop-status");
    const { shippingFeeHalire } = await shopStatus.json();

    const order = await prisma.order.findFirst({
      where: { customerEmail: "e2e-purchase@example.com" },
      orderBy: { createdAt: "desc" },
    });
    expect(order).not.toBeNull();
    expect(order!.totalAmount).toBe(2 * 65000 + shippingFeeHalire);

    const variant = await prisma.merchVariant.findUnique({ where: { sku: "TEST-HOODIE-BLACK-M" } });
    // Seeded at quantity 20 — exactly 2 must have been decremented.
    expect(variant?.quantity).toBe(18);
  });
});
