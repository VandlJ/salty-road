import { NextResponse } from "next/server";
import { getShopEnabled, getStickerGiftThreshold } from "@/lib/shop";

// A GET handler with no obviously "dynamic" API usage can get statically
// evaluated and cached by Next.js — this toggle needs a fresh DB read every
// time, since it's flipped live from the admin panel.
export const dynamic = "force-dynamic";

export async function GET() {
  const [enabled, stickerGiftThresholdHalire] = await Promise.all([
    getShopEnabled(),
    getStickerGiftThreshold(),
  ]);
  return NextResponse.json({ enabled, stickerGiftThresholdHalire });
}
