import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

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

    const variants = await prisma.merchVariant.findMany({
      where: { sku: { in: typedItems.map((i) => i.sku) } },
      include: { product: true },
    });
    const variantBySku = new Map(variants.map((v) => [v.sku, v]));

    let eligibleSubtotal = 0;
    for (const item of typedItems) {
      const variant = variantBySku.get(item.sku);
      if (!variant) continue;
      const applies = coupon.categories.length === 0 || coupon.categories.includes(variant.product.category);
      if (applies) eligibleSubtotal += variant.price * item.qty;
    }

    if (eligibleSubtotal === 0) {
      return NextResponse.json({ error: "coupon_not_applicable" }, { status: 400 });
    }

    const discountAmount =
      coupon.type === "percent"
        ? Math.round((eligibleSubtotal * coupon.value) / 100)
        : Math.min(coupon.value, eligibleSubtotal);

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
