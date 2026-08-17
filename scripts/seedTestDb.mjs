// Seeds a deterministic dataset for E2E tests (Playwright) against an
// isolated test database — never run this against production, it deletes
// anything with a "test-" slug/code prefix first to stay idempotent.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_COUPON_CODES = ["TEST10", "TESTFIX", "TESTSHIP", "TESTONCE"];

async function main() {
  // The previous guard looked for "saltyroad.cz" in DATABASE_URL. That never
  // matches: the app connects through Prisma Accelerate, so the URL is a
  // prisma:// address with an API key and no trace of the real host. The check
  // read as protection while providing none.
  //
  // Inverted, so an unrecognised URL is refused rather than trusted: this
  // seeds and deletes data, and the only databases it has any business
  // touching are a local one and CI's throwaway Postgres (both localhost).
  // Anything else needs a deliberate ALLOW_REMOTE_TEST_SEED=1.
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /^postgres(ql)?:\/\/[^/@]*@?(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
  if (!isLocal && process.env.ALLOW_REMOTE_TEST_SEED !== "1") {
    console.error(
      "Refusing to run: DATABASE_URL is not a localhost database.\n" +
        "This script deletes and rewrites data. If the target really is a\n" +
        "disposable remote test database, re-run with ALLOW_REMOTE_TEST_SEED=1."
    );
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
  // attach a sign-up to without one, and getCurrentEdition() only returns an
  // "upcoming" edition once one exists.
  //
  // `number` is unique, and the add_edition migration already seeds Volume 1
  // as number 1 into every database it runs against — CI included, since the
  // workflow runs `prisma migrate deploy` before this script. So take the
  // next free number rather than assuming this is the first edition.
  //
  // The result mirrors the real shape the app is built for: an archived past
  // edition alongside an upcoming one, with the upcoming one current.
  const { _max } = await prisma.edition.aggregate({ _max: { number: true } });
  await prisma.edition.upsert({
    where: { slug: "e2e" },
    update: { status: "upcoming", registrationOpen: true },
    create: {
      slug: "e2e",
      number: (_max.number ?? 0) + 1,
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
