import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// F2.5 — vehicle registration, the site's original purpose alongside the
// shop. Photo upload is skipped (goes to Vercel Blob, no token in CI — see
// Test_Implementation_Plan.md F4.3), the form doesn't require photos to submit.
//
// The form moved off the homepage to the unlisted /register route when Volume
// 1 was archived (see src/app/[locale]/register/page.tsx) — the point of
// keeping these tests pointed at it is that the whole registration path stays
// exercised in CI while it's dormant, ready for Volume 2.

test.describe("vehicle registration", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("submitting the form creates a pending registration, checkable via /check", async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    await page.goto("/cs/register");

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
      // Closed registration replaces the form entirely with a message (see
      // RegistrationSection) — there's no form to fill/submit against, the
      // gate is that the form never renders in the first place.
      await page.goto("/cs/register");
      await expect(page.getByText("Registrace uzavřeny")).toBeVisible();
      await expect(page.getByLabel("Jméno")).toHaveCount(0);
    } finally {
      await request.patch("/api/admin/settings", { data: { registrationOpen: true } });
    }
  });
});
