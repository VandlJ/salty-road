import prisma from "@/lib/prisma";

const SHIPPING_FEE_KEY = "shipping_fee_halire";
const SHIPPING_FREE_KEY = "shipping_free";

// 99 Kč — used whenever the admin hasn't set a custom fee yet.
export const DEFAULT_SHIPPING_FEE = 9900;

// Admin-configurable flat shipping fee (halire), with a site-wide "free
// shipping" promo switch that overrides it to 0 regardless of the
// configured amount. Shared between the checkout API (source of truth for
// the actual charge) and the checkout page (cosmetic preview only — the
// server always recomputes the real total).
export async function getShippingFee(): Promise<number> {
  const [feeSetting, freeSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: SHIPPING_FEE_KEY } }),
    prisma.setting.findUnique({ where: { key: SHIPPING_FREE_KEY } }),
  ]);
  if (freeSetting?.value === "true") return 0;
  return parseFeeSetting(feeSetting?.value);
}

// The configured amount itself, ignoring the free-shipping override — the
// admin editor needs to keep showing/editing the real number even while the
// free-shipping promo is switched on (turning the promo off later should
// restore the previously configured fee, not silently reset it to 0).
export async function getShippingFeeRaw(): Promise<number> {
  const feeSetting = await prisma.setting.findUnique({ where: { key: SHIPPING_FEE_KEY } });
  return parseFeeSetting(feeSetting?.value);
}

function parseFeeSetting(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SHIPPING_FEE;
}

export async function setShippingFee(halire: number): Promise<void> {
  const value = String(Math.max(0, Math.round(halire)));
  await prisma.setting.upsert({
    where: { key: SHIPPING_FEE_KEY },
    update: { value },
    create: { key: SHIPPING_FEE_KEY, value },
  });
}

export async function getShippingFree(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { key: SHIPPING_FREE_KEY } });
  return setting?.value === "true";
}

export async function setShippingFree(enabled: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SHIPPING_FREE_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: SHIPPING_FREE_KEY, value: enabled ? "true" : "false" },
  });
}
