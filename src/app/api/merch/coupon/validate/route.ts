import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { calculateCouponDiscount } from "@/lib/pricing";

interface CouponValidateItem {
  sku: string;
  qty: number;
}

// Preview-only — does NOT consume a use. The real, race-safe consumption
// happens inside the checkout transaction (see /api/merch/checkout), which
// re-validates everything from scratch. This endpoint exists purely so the
// cart page can show "X off" before the customer commits to checking out.
//
// Takes cart items (not a pre-computed subtotal) because a coupon can be
// restricted to specific product categories — the eligible subtotal has to
// be derived server-side from each item's actual product category, never
// trusted from the client.
export async function POST(req: Request) {
  if (!(await rateLimit(`coupon-validate:${getClientIp(req)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const { code, items } = await req.json();
    if (
      typeof code !== "string" ||
      !code.trim() ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !items.every(
        (i: unknown): i is CouponValidateItem =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as CouponValidateItem).sku === "string" &&
          Number.isInteger((i as CouponValidateItem).qty) &&
          (i as CouponValidateItem).qty > 0
      )
    ) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const typedItems = items as CouponValidateItem[];

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

    // Free-shipping coupons discount shipping, not items — no category/
    // subtotal eligibility check applies, it's valid for any cart.
    if (coupon.type === "free_shipping") {
      return NextResponse.json({
        code: coupon.code,
        type: coupon.type,
        value: 0,
        discountAmount: 0,
        freeShipping: true,
      });
    }

    const variants = await prisma.merchVariant.findMany({
      where: { sku: { in: typedItems.map((i) => i.sku) } },
      include: { product: true },
    });
    const variantBySku = new Map(variants.map((v) => [v.sku, v]));

    // Same function the checkout charges with — this endpoint only previews,
    // so the two must agree by construction rather than by coincidence.
    const { eligibleSubtotal, discountAmount } = calculateCouponDiscount({
      items: typedItems,
      variantBySku,
      coupon,
    });

    if (eligibleSubtotal === 0) {
      return NextResponse.json({ error: "coupon_not_applicable" }, { status: 400 });
    }

    return NextResponse.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      freeShipping: false,
    });
  } catch (err) {
    console.error("POST /api/merch/coupon/validate error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
