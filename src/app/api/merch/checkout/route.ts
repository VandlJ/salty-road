import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSPD, generateQRCodeBase64 } from "@/lib/qr";
import { sendMerchOrderConfirmationEmail, sendEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getOrderVs } from "@/lib/orderVs";
import { merchOrderAdminNotificationEmail } from "@/emails/merch-order-admin-notification.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+() .-]{6,20}$/;
const MAX_LEN = { customerName: 100, customerEmail: 200, customerPhone: 20, address: 300 };
const MAX_ITEM_LINES = 20;
const MAX_QTY_PER_LINE = 20;

interface CheckoutItemInput {
  sku: string;
  qty: number;
}

export async function POST(req: Request) {
  if (!(await rateLimit(`merch-checkout:${getClientIp(req)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Declared outside the try block so the catch handler can read it.
  let insufficientStockSku: string | null = null;

  try {
    const body = await req.json();
    const { customerName, customerEmail, customerPhone, address, paymentMethod, items, couponCode: rawCouponCode } = body;

    if (!customerName || !customerEmail || !customerPhone || !address || !paymentMethod) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (typeof customerEmail !== "string" || !EMAIL_RE.test(customerEmail)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    if (typeof customerPhone !== "string" || !PHONE_RE.test(customerPhone)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    if (paymentMethod !== "bank_transfer") {
      return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > MAX_ITEM_LINES ||
      !items.every(
        (i: unknown): i is CheckoutItemInput =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as CheckoutItemInput).sku === "string" &&
          Number.isInteger((i as CheckoutItemInput).qty) &&
          (i as CheckoutItemInput).qty > 0 &&
          (i as CheckoutItemInput).qty <= MAX_QTY_PER_LINE
      )
    ) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }

    const typedItems = items as CheckoutItemInput[];
    const skus = typedItems.map((i) => i.sku);

    // Look up current variants server-side — never trust price/name/label
    // from the client, only sku + qty.
    const variants = await prisma.merchVariant.findMany({
      where: { sku: { in: skus }, active: true, product: { active: true } },
      include: { product: true },
    });
    const variantBySku = new Map(variants.map((v) => [v.sku, v]));

    for (const item of typedItems) {
      if (!variantBySku.has(item.sku)) {
        return NextResponse.json({ error: "invalid_items" }, { status: 400 });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of typedItems) {
        // Atomic conditional decrement: the WHERE clause only matches (and
        // the row only updates) if enough stock is still available, so
        // concurrent checkouts for the same last unit can't both succeed.
        const result = await tx.merchVariant.updateMany({
          where: { sku: item.sku, quantity: { gte: item.qty } },
          data: { quantity: { decrement: item.qty } },
        });
        if (result.count === 0) {
          insufficientStockSku = item.sku;
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      const orderItems = typedItems.map((item) => {
        const variant = variantBySku.get(item.sku)!;
        return {
          sku: variant.sku,
          name: variant.product.name,
          label: variant.label,
          price: variant.price,
          qty: item.qty,
        };
      });

      const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

      // Coupon: atomic conditional increment via raw SQL, mirroring the
      // stock decrement above. Prisma's typed `updateMany` where-clause
      // can't compare one column against another ("usedCount < maxUses"),
      // so the "consume a use only if one is still available" check has to
      // be raw SQL to stay race-safe (two concurrent checkouts against the
      // last remaining use can't both succeed).
      let couponCode: string | null = null;
      let discountAmount = 0;
      if (rawCouponCode) {
        const normalized = String(rawCouponCode).trim().toUpperCase();
        const affected = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE code = ${normalized} AND active = true
            AND ("expiresAt" IS NULL OR "expiresAt" > now())
            AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
        `;
        if (affected === 0) {
          throw new Error("INVALID_COUPON");
        }
        const coupon = await tx.coupon.findUniqueOrThrow({ where: { code: normalized } });
        couponCode = coupon.code;

        // Category-restricted coupons only discount the matching slice of
        // the cart — empty `categories` means "applies to everything".
        const eligibleSubtotal =
          coupon.categories.length === 0
            ? subtotal
            : typedItems.reduce((sum, item) => {
                const variant = variantBySku.get(item.sku)!;
                return coupon.categories.includes(variant.product.category) ? sum + variant.price * item.qty : sum;
              }, 0);

        if (eligibleSubtotal === 0) {
          throw new Error("INVALID_COUPON");
        }

        discountAmount =
          coupon.type === "percent"
            ? Math.round((eligibleSubtotal * coupon.value) / 100)
            : Math.min(coupon.value, eligibleSubtotal);
      }

      const totalAmount = subtotal - discountAmount;

      return tx.order.create({
        data: {
          customerName,
          customerEmail,
          customerPhone,
          address,
          items: orderItems,
          totalAmount,
          paymentMethod,
          couponCode,
          discountAmount,
        },
      });
    });

    // Send confirmation email + optional payment QR (best-effort, doesn't block the response).
    const vs = getOrderVs(order.createdAt, order.orderNumber);
    let qrCodeBase64: string | undefined;
    try {
      if (paymentMethod === "bank_transfer") {
        const spd = generateSPD({
          amount: order.totalAmount / 100,
          message: `Salty Road Shop ${vs}`,
          vs,
        });
        qrCodeBase64 = await generateQRCodeBase64(spd);
      }

      const orderItems = order.items as { name: string; label: string; price: number; qty: number }[];
      await sendMerchOrderConfirmationEmail(
        customerEmail,
        {
          orderId: order.id,
          vs,
          items: orderItems,
          totalAmount: order.totalAmount,
          paymentMethod,
          couponCode: order.couponCode,
          discountAmount: order.discountAmount,
        },
        qrCodeBase64
      );

      // Merch order notifications go to their own inbox, separate from
      // event registration notifications (ADMIN_EMAIL). Falls back to
      // ADMIN_EMAIL if ORDER_EMAIL isn't configured, so notifications don't
      // just silently disappear.
      const orderEmail = process.env.ORDER_EMAIL || process.env.ADMIN_EMAIL;
      if (orderEmail) {
        const adminNotification = merchOrderAdminNotificationEmail({
          orderId: order.id,
          customerName,
          customerEmail,
          customerPhone,
          address,
          paymentMethod,
          items: orderItems,
          totalAmount: order.totalAmount,
        });
        await sendEmail(orderEmail, adminNotification.subject, adminNotification.text);
      }
    } catch (err) {
      console.error("Error sending merch order emails:", err);
    }

    return NextResponse.json(
      {
        orderId: order.id,
        vs,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        couponCode: order.couponCode,
        discountAmount: order.discountAmount,
        qrCodeBase64,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "insufficient_stock", sku: insufficientStockSku },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message === "INVALID_COUPON") {
      return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
    }
    console.error("POST /api/merch/checkout error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
