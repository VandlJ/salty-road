import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// F2.5 — vehicle registration, the site's original purpose alongside the
// shop. Photo upload is skipped (goes to Vercel Blob, no token in CI — see
// Test_Implementation_Plan.md F4.3), the form doesn't require photos to submit.

test.describe("vehicle registration", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("submitting the form creates a pending registration, checkable via /check", async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    await page.goto("/cs");

    await page.getByLabel("Jméno").fill("Petr");
    await page.getByLabel("Příjmení").fill("Svoboda");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Značka vozu").fill("Škoda");
    await page.getByLabel("Model vozu").fill("Octavia");
    await page.getByLabel("Rok výroby").fill("2020");
    await page.getByLabel("Informace o vozidle").fill("E2E test vehicle.");
    await page.getByLabel("Souhlasím s pravidly registrace").check();

    await page.locator('[data-testid="register-submit"]').click();

    const message = page.locator('[data-testid="register-success-message"]');
    await expect(message).toBeVisible();
    const text = await message.innerText();
    const id = text.match(/ID:\s*(\S+)/)?.[1];
    expect(id).toBeTruthy();

    const record = await prisma.registration.findUnique({ where: { id: id! } });
    expect(record?.status).toBe("pending");
    expect(record?.email).toBe(email);

    await page.goto("/cs/check");
    await page.locator('[data-testid="check-id-input"]').fill(id!);
    await page.locator('[data-testid="check-submit"]').click();
    await expect(page.locator('[data-testid="check-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="check-status"]')).toContainText(/čeká|pending/i);
  });

  test("registration is blocked while closed", async ({ page, request }) => {
    // Toggle the setting directly via a seeded admin session, exercise the
    // closed state, then restore it so later tests aren't affected.
    const login = await request.post("/api/admin/login", {
      data: {
        username: process.env.E2E_ADMIN_USERNAME || "e2e-admin",
        password: process.env.E2E_ADMIN_PASSWORD || "e2e-test-password-12345",
      },
    });
    expect(login.ok()).toBe(true);

    await request.patch("/api/admin/settings", { data: { registrationOpen: false } });
    try {
      await page.goto("/cs");
      await page.getByLabel("Jméno").fill("Blocked");
      await page.getByLabel("Příjmení").fill("Attempt");
      await page.getByLabel("E-mail").fill("e2e-blocked@example.com");
      await page.getByLabel("Značka vozu").fill("Škoda");
      await page.getByLabel("Model vozu").fill("Fabia");
      await page.getByLabel("Rok výroby").fill("2019");
      await page.getByLabel("Informace o vozidle").fill("Should not go through.");
      await page.getByLabel("Souhlasím s pravidly registrace").check();
      await page.locator('[data-testid="register-submit"]').click();

      await expect(page.getByText("Registrace jsou momentálně uzavřené.")).toBeVisible();
      const blocked = await prisma.registration.findFirst({ where: { email: "e2e-blocked@example.com" } });
      expect(blocked).toBeNull();
    } finally {
      await request.patch("/api/admin/settings", { data: { registrationOpen: true } });
    }
  });
});
