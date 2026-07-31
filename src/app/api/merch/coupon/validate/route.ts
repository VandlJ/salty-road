import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Preview-only — does NOT consume a use. The real, race-safe consumption
// happens inside the checkout transaction (see /api/merch/checkout), which
// re-validates everything from scratch. This endpoint exists purely so the
// cart page can show "X off" before the customer commits to checking out.
export async function POST(req: Request) {
  if (!(await rateLimit(`coupon-validate:${getClientIp(req)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const { code, subtotal } = await req.json();
    if (typeof code !== "string" || !code.trim() || !Number.isInteger(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (
      !coupon ||
      !coupon.active ||
      (coupon.expiresAt && coupon.expiresAt < new Date()) ||
      (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    ) {
      return NextResponse.json({ error: "invalid_coupon" }, { status: 404 });
    }

    const discountAmount =
      coupon.type === "percent"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(coupon.value, subtotal);

    return NextResponse.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
    });
  } catch (err) {
    console.error("POST /api/merch/coupon/validate error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
