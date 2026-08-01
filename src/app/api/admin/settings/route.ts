import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/registration";
import {
  getShopEnabled,
  setShopEnabled,
  getStickerGiftThreshold,
  setStickerGiftThreshold,
} from "@/lib/shop";

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [registrationOpen, shopEnabled, stickerGiftThresholdHalire] = await Promise.all([
    getRegistrationOpen(),
    getShopEnabled(),
    getStickerGiftThreshold(),
  ]);
  return NextResponse.json({ registrationOpen, shopEnabled, stickerGiftThresholdHalire });
}

export async function PATCH(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result: {
    registrationOpen?: boolean;
    shopEnabled?: boolean;
    stickerGiftThresholdHalire?: number;
  } = {};

  if (typeof body.registrationOpen === "boolean") {
    await setRegistrationOpen(body.registrationOpen);
    result.registrationOpen = body.registrationOpen;
  }

  if (typeof body.shopEnabled === "boolean") {
    await setShopEnabled(body.shopEnabled);
    result.shopEnabled = body.shopEnabled;
  }

  if (typeof body.stickerGiftThresholdHalire === "number" && Number.isFinite(body.stickerGiftThresholdHalire)) {
    await setStickerGiftThreshold(body.stickerGiftThresholdHalire);
    result.stickerGiftThresholdHalire = Math.max(0, Math.round(body.stickerGiftThresholdHalire));
  }

  if (
    result.registrationOpen === undefined &&
    result.shopEnabled === undefined &&
    result.stickerGiftThresholdHalire === undefined
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json(result);
}
