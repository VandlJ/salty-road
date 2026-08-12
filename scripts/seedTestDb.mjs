// Seeds a deterministic dataset for E2E tests (Playwright) against an
// isolated test database — never run this against production, it deletes
// anything with a "test-" slug/code prefix first to stay idempotent.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_COUPON_CODES = ["TEST10", "TESTFIX", "TESTSHIP", "TESTONCE"];

async function main() {
  if (process.env.DATABASE_URL?.includes("saltyroad.cz")) {
    console.error("Refusing to run: DATABASE_URL looks like production.");
    process.exit(1);
  }

  // Idempotent: wipe anything from a previous run before recreating.
  await prisma.merchProduct.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await prisma.coupon.deleteMany({ where: { code: { in: TEST_COUPON_CODES } } });

  await prisma.merchProduct.create({
    data: {
      slug: "test-hoodie",
      category: "hoodie",
      name: "Test Hoodie",
      description: "Seeded for E2E tests.",
      active: true,
      sellable: true,
      giftEligible: false,
      photoMode: "shared",
      photos: [],
      variants: {
        create: [
          { sku: "TEST-HOODIE-BLACK-S", color: "Černá", size: "S", price: 65000, quantity: 20, order: 0 },
          { sku: "TEST-HOODIE-BLACK-M", color: "Černá", size: "M", price: 65000, quantity: 20, order: 0 },
          { sku: "TEST-HOODIE-BLACK-L", color: "Černá", size: "L", price: 65000, quantity: 20, order: 0 },
          { sku: "TEST-HOODIE-WHITE-S", color: "Bílá", size: "S", price: 65000, quantity: 20, order: 1 },
          { sku: "TEST-HOODIE-WHITE-M", color: "Bílá", size: "M", price: 65000, quantity: 20, order: 1 },
          { sku: "TEST-HOODIE-WHITE-L", color: "Bílá", size: "L", price: 65000, quantity: 20, order: 1 },
        ],
      },
    },
  });

  await prisma.merchProduct.create({
    data: {
      slug: "test-sticker",
      category: "sticker",
      name: "Test Sticker",
      description: "Seeded for E2E gift-flow tests.",
      active: true,
      sellable: false,
      giftEligible: true,
      photoMode: "shared",
      photos: [],
      variants: {
        create: [{ sku: "TEST-STICKER", price: 5000, quantity: 5, order: 0 }],
      },
    },
  });

  await prisma.merchProduct.create({
    data: {
      slug: "test-soldout",
      category: "cap",
      name: "Test Sold Out Cap",
      description: "Seeded for E2E stock-request tests.",
      active: true,
      sellable: true,
      giftEligible: false,
      photoMode: "shared",
      photos: [],
      variants: {
        create: [{ sku: "TEST-SOLDOUT", price: 45000, quantity: 0, order: 0 }],
      },
    },
  });

  await prisma.coupon.createMany({
    data: [
      { code: "TEST10", type: "percent", value: 10 },
      { code: "TESTFIX", type: "fixed", value: 10000 },
      { code: "TESTSHIP", type: "free_shipping", value: 0 },
      { code: "TESTONCE", type: "percent", value: 10, maxUses: 1 },
    ],
  });

  await prisma.setting.upsert({
    where: { key: "shop_enabled" },
    update: { value: "true" },
    create: { key: "shop_enabled", value: "true" },
  });
  await prisma.setting.upsert({
    where: { key: "shipping_fee_halire" },
    update: { value: "9900" },
    create: { key: "shipping_fee_halire", value: "9900" },
  });
  await prisma.setting.upsert({
    where: { key: "sticker_gift_threshold_halire" },
    update: { value: "150000" },
    create: { key: "sticker_gift_threshold_halire", value: "150000" },
  });
  await prisma.setting.upsert({
    where: { key: "registration_open" },
    update: { value: "true" },
    create: { key: "registration_open", value: "true" },
  });

  // Registrations are scoped to an edition, so /api/register has nothing to
  // attach a sign-up to without one. "upcoming" is the state the e2e
  // registration flow exercises.
  await prisma.edition.upsert({
    where: { slug: "e2e" },
    update: { status: "upcoming" },
    create: {
      slug: "e2e",
      number: 1,
      name: "E2E Edition",
      startDate: new Date("2027-07-24T00:00:00.000Z"),
      endDate: new Date("2027-07-24T23:59:59.000Z"),
      venueName: "Velké náměstí",
      venueLocality: "Prachatice",
      status: "upcoming",
      registrationOpen: true,
    },
  });

  const adminUsername = process.env.E2E_ADMIN_USERNAME || "e2e-admin";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "e2e-test-password-12345";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { password: hash },
    create: { username: adminUsername, password: hash },
  });

  console.log("Test DB seeded: test-hoodie, test-sticker, test-soldout, coupons, settings, edition, admin user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
