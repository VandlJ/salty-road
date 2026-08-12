import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/registration";
import {
  getShopEnabled,
  setShopEnabled,
  getStickerGiftThreshold,
  setStickerGiftThreshold,
} from "@/lib/shop";
import {
  getShippingFeeRaw,
  setShippingFee,
  getShippingFree,
  setShippingFree,
} from "@/lib/shipping";

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [
    registrationOpen,
    shopEnabled,
    stickerGiftThresholdHalire,
    shippingFeeHalire,
    shippingFree,
  ] = await Promise.all([
    getRegistrationOpen(),
    getShopEnabled(),
    getStickerGiftThreshold(),
    getShippingFeeRaw(),
    getShippingFree(),
  ]);
  return NextResponse.json({
    registrationOpen,
    shopEnabled,
    stickerGiftThresholdHalire,
    shippingFeeHalire,
    shippingFree,
  });
}

export async function PATCH(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const result: {
    registrationOpen?: boolean;
    shopEnabled?: boolean;
    stickerGiftThresholdHalire?: number;
    shippingFeeHalire?: number;
    shippingFree?: boolean;
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

  if (typeof body.shippingFeeHalire === "number" && Number.isFinite(body.shippingFeeHalire)) {
    await setShippingFee(body.shippingFeeHalire);
    result.shippingFeeHalire = Math.max(0, Math.round(body.shippingFeeHalire));
  }

  if (typeof body.shippingFree === "boolean") {
    await setShippingFree(body.shippingFree);
    result.shippingFree = body.shippingFree;
  }

  if (
    result.registrationOpen === undefined &&
    result.shopEnabled === undefined &&
    result.stickerGiftThresholdHalire === undefined &&
    result.shippingFeeHalire === undefined &&
    result.shippingFree === undefined
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json(result);
}
