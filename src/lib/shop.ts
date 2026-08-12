import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

const SHOP_ENABLED_KEY = "shop_enabled";
const STICKER_GIFT_THRESHOLD_KEY = "sticker_gift_threshold_halire";

export async function getShopEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: SHOP_ENABLED_KEY },
  });
  return setting?.value === "true";
}

export async function setShopEnabled(enabled: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SHOP_ENABLED_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: SHOP_ENABLED_KEY, value: enabled ? "true" : "false" },
  });
}

// Short-lived cached read for the root layout's initial navbar render —
// the navbar itself is a client component that polls /api/shop-status live,
// but without a server-rendered starting value it always paints as "shop
// hidden" first and pops in a second later on every fresh load. A 10s
// revalidate keeps the layout cacheable (unlike getShopEnabled(), a plain
// uncached read here would force the whole site dynamic) while staying
// close enough to live for an admin toggle to show up quickly.
//
// This runs from the ROOT layout, so it's on the critical path for every
// single page — including at build time, when Next.js statically
// prerenders a locale route. A DB that's briefly unreachable specifically
// from the build environment (seen on a Preview deployment pointed at a
// raw-Postgres dev database, as opposed to production's Accelerate proxy)
// must not fail the entire build over what's ultimately just an initial
// paint hint; the client-side poll in navbar.tsx corrects a wrong guess
// within 15s regardless.
const getShopEnabledUncaught = unstable_cache(getShopEnabled, ["shop-enabled"], {
  revalidate: 10,
});

export async function getShopEnabledCached(): Promise<boolean> {
  try {
    return await getShopEnabledUncaught();
  } catch (err) {
    console.error("getShopEnabledCached: falling back to false", err);
    return false;
  }
}

// Halire. 0 (or unset) means the free-gift feature is off entirely — no
// gift options are offered at checkout regardless of order size.
export async function getStickerGiftThreshold(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: STICKER_GIFT_THRESHOLD_KEY },
  });
  const parsed = Number(setting?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function setStickerGiftThreshold(halire: number): Promise<void> {
  const value = String(Math.max(0, Math.round(halire)));
  await prisma.setting.upsert({
    where: { key: STICKER_GIFT_THRESHOLD_KEY },
    update: { value },
    create: { key: STICKER_GIFT_THRESHOLD_KEY, value },
  });
}
