import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// F2.4 — free gift above threshold (seeded at 150000 halire / 1500 Kč via
// scripts/seedTestDb.mjs). test-hoodie is 650 Kč/unit, so 3 units clears it
// and 1 unit doesn't.

async function addHoodieToCart(page: Page, qty: number) {
  await page.goto("/cs/shop/test-hoodie");
  await page.locator('[data-testid="variant-color-option"][data-color="Bílá"]').click();
  await page.locator('[data-testid="variant-size-option"][data-size="L"]').click();
  for (let i = 0; i < qty; i++) {
    await page.locator('[data-testid="add-to-cart"]').click();
    // Both desktop and mobile nav render a CartLink (one hidden via CSS,
    // both present in the DOM) — .first() avoids a strict-mode violation.
    if (i === 0) await expect(page.locator('[data-testid="cart-badge"]').first()).toBeVisible();
  }
  await page.goto("/cs/shop/cart");
}

test.describe("free gift over threshold", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("below threshold shows progress, not the gift picker", async ({ page }) => {
    await addHoodieToCart(page, 1);
    await expect(page.locator('[data-testid="gift-option"]')).toHaveCount(0);
    await expect(page.getByText("Ještě", { exact: false })).toBeVisible();
  });

  test("above threshold offers the seeded gift and it can be selected", async ({ page }) => {
    await addHoodieToCart(page, 3);
    const stickerOption = page.locator('[data-testid="gift-option"][data-sku="TEST-STICKER"]');
    await expect(stickerOption).toBeVisible();
    await stickerOption.click();
    await expect(stickerOption).toHaveClass(/border-white/);
  });

  test("a selected gift is attached to the order and decrements its own stock", async ({ page }) => {
    await addHoodieToCart(page, 3);
    await page.locator('[data-testid="gift-option"][data-sku="TEST-STICKER"]').click();
    await page.locator('[data-testid="cart-checkout"]').click();

    await page.getByLabel("Jméno").fill("Gift");
    await page.getByLabel("Příjmení").fill("Test");
    await page.getByLabel("E-mail").fill("e2e-gift@example.com");
    await page.locator('[data-testid="checkout-phone-number"]').fill("111222333");
    await page.getByLabel("Ulice a číslo popisné").fill("Testovací 1");
    await page.getByLabel("Město").fill("Praha");
    await page.getByLabel("PSČ").fill("11000");
    await page.locator('[data-testid="checkout-submit"]').click();
    await expect(page).toHaveURL(/\/shop\/thank-you$/);

    const order = await prisma.order.findFirst({
      where: { customerEmail: "e2e-gift@example.com" },
      orderBy: { createdAt: "desc" },
    });
    expect(order?.giftLabel).toBe("Test Sticker");

    const stickerVariant = await prisma.merchVariant.findUnique({ where: { sku: "TEST-STICKER" } });
    // Seeded at quantity 5; exactly one E2E order here should have taken one.
    expect(stickerVariant?.quantity).toBeLessThan(5);
  });

  test("dropping below the threshold before checkout silently drops the gift, order still succeeds", async ({ page }) => {
    await addHoodieToCart(page, 3);
    await page.locator('[data-testid="gift-option"][data-sku="TEST-STICKER"]').click();

    // Remove enough quantity to fall back under the threshold without
    // clearing the cart (which would reset the gift selection itself) —
    // reduce via the stepper on the single cart line instead.
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await cartItem.getByRole("button", { name: "Snížit počet" }).click();
    await cartItem.getByRole("button", { name: "Snížit počet" }).click();

    await page.locator('[data-testid="cart-checkout"]').click();
    await page.getByLabel("Jméno").fill("Below");
    await page.getByLabel("Příjmení").fill("Threshold");
    await page.getByLabel("E-mail").fill("e2e-gift-dropped@example.com");
    await page.locator('[data-testid="checkout-phone-number"]').fill("111222333");
    await page.getByLabel("Ulice a číslo popisné").fill("Testovací 1");
    await page.getByLabel("Město").fill("Praha");
    await page.getByLabel("PSČ").fill("11000");
    await page.locator('[data-testid="checkout-submit"]').click();

    // Order still goes through — the bonus never blocks a paying order.
    await expect(page).toHaveURL(/\/shop\/thank-you$/);

    const order = await prisma.order.findFirst({
      where: { customerEmail: "e2e-gift-dropped@example.com" },
      orderBy: { createdAt: "desc" },
    });
    expect(order?.giftLabel).toBeNull();
  });
});
