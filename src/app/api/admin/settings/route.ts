import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/registration";
import { getShopEnabled, setShopEnabled } from "@/lib/shop";

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [registrationOpen, shopEnabled] = await Promise.all([
    getRegistrationOpen(),
    getShopEnabled(),
  ]);
  return NextResponse.json({ registrationOpen, shopEnabled });
}

export async function PATCH(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result: { registrationOpen?: boolean; shopEnabled?: boolean } = {};

  if (typeof body.registrationOpen === "boolean") {
    await setRegistrationOpen(body.registrationOpen);
    result.registrationOpen = body.registrationOpen;
  }

  if (typeof body.shopEnabled === "boolean") {
    await setShopEnabled(body.shopEnabled);
    result.shopEnabled = body.shopEnabled;
  }

  if (result.registrationOpen === undefined && result.shopEnabled === undefined) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json(result);
}
