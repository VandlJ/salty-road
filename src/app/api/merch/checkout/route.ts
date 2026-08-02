import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { generateSPD, generateQRCodeBase64 } from "@/lib/qr";
import { sendMerchOrderConfirmationEmail, sendEmail, SHOP_EMAIL_FROM } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getOrderVs } from "@/lib/orderVs";
import { merchOrderAdminNotificationEmail } from "@/emails/merch-order-admin-notification.mjs";
import { getShippingFee } from "@/lib/shipping";
import { variantLabel } from "@/lib/variantLabel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+() .-]{6,24}$/;
const MAX_LEN = { customerName: 100, customerEmail: 200, customerPhone: 24, address: 300 };
const MAX_ITEM_LINES = 20;
const MAX_QTY_PER_LINE = 20;

interface CheckoutItemInput {
  sku: string;
  qty: number;
}

// Inferred from prisma.$transaction itself rather than Prisma.TransactionClient
// — the extended client (see @/lib/prisma) doesn't structurally match that
// stock type once extensions are applied.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Atomic conditional increment via raw SQL, mirroring the stock decrement
// below. Prisma's typed `updateMany` where-clause can't compare one column
// against another ("usedCount < maxUses"), so the "consume a use only if
// one is still available" check has to be raw SQL to stay race-safe (two
// concurrent checkouts against the last remaining use can't both succeed).
async function consumeCouponUse(tx: TxClient, normalizedCode: string) {
  const affected = await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
    WHERE code = ${normalizedCode} AND active = true
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;
  if (affected === 0) {
    throw new Error("INVALID_COUPON");
  }
  return tx.coupon.findUniqueOrThrow({ where: { code: normalizedCode } });
}

export async function POST(req: Request) {
  if (!(await rateLimit(`merch-checkout:${getClientIp(req)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Declared outside the try block so the catch handler can read it.
  let insufficientStockSku: string | null = null;

  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      paymentMethod,
      deliveryMethod: rawDeliveryMethod,
      items,
      couponCode: rawCouponCode,
      shippingCouponCode: rawShippingCouponCode,
      giftSku: rawGiftSku,
      idempotencyKey: rawIdempotencyKey,
    } = body;
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" && rawIdempotencyKey.length > 0
        ? rawIdempotencyKey
        : null;
    const deliveryMethod = rawDeliveryMethod === "pickup" ? "pickup" : "shipping";

    if (!customerName || !customerEmail || !customerPhone || !paymentMethod) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (deliveryMethod === "shipping" && !address) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Type-check before anything else — a non-string here otherwise skips
    // the MAX_LEN guard entirely and surfaces as an opaque 500 from Prisma.
    if (typeof customerName !== "string") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (deliveryMethod === "shipping" && typeof address !== "string") {
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

    const baseShippingFee = await getShippingFee();

    const order = await prisma.$transaction(async (tx) => {
      // A network retry or double-submit sends the same client-generated
      // key twice — return the already-created order instead of decrementing
      // stock and charging the coupon a second time.
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({ where: { idempotencyKey } });
        if (existing) return existing;
      }

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
          label: variantLabel(variant),
          price: variant.price,
          qty: item.qty,
        };
      });

      const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

      // Two independent coupon slots — a discount coupon (percent/fixed) and
      // a free_shipping coupon can both be active at once. Which raw field
      // the client put a code in is only a UI-side hint (from the earlier
      // /coupon/validate call); the actual slot each code lands in here is
      // decided by its real `type`, and duplicate codes across both fields
      // are deduped so the same coupon is never consumed twice.
      const submittedCodes = Array.from(
        new Set(
          [rawCouponCode, rawShippingCouponCode]
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
            .map((c) => c.trim().toUpperCase())
        )
      );

      let couponCode: string | null = null;
      let discountAmount = 0;
      let shippingCouponCode: string | null = null;

      for (const normalized of submittedCodes) {
        const coupon = await consumeCouponUse(tx, normalized);

        if (coupon.type === "free_shipping") {
          shippingCouponCode = coupon.code;
          continue;
        }

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

        couponCode = coupon.code;
        discountAmount =
          coupon.type === "percent"
            ? Math.round((eligibleSubtotal * coupon.value) / 100)
            : Math.min(coupon.value, eligibleSubtotal);
      }

      // Free gift: never trust eligibility or stock from the client — a
      // bonus item must not be able to block a paying order, so any failure
      // here (below threshold, invalid/inactive sku, sold out) just drops
      // the gift silently instead of throwing.
      let giftProductId: string | null = null;
      let giftVariantSku: string | null = null;
      let giftLabel: string | null = null;
      if (rawGiftSku && typeof rawGiftSku === "string") {
        const thresholdSetting = await tx.setting.findUnique({
          where: { key: "sticker_gift_threshold_halire" },
        });
        const threshold = Number(thresholdSetting?.value);
        const validThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 0;
        const eligible = validThreshold > 0 && subtotal - discountAmount >= validThreshold;

        if (eligible) {
          const giftVariant = await tx.merchVariant.findUnique({
            where: { sku: rawGiftSku },
            include: { product: true },
          });
          // `active` is the master kill switch (still required) — `sellable`
          // is deliberately not checked, a gift-only product must still work.
          if (
            giftVariant &&
            giftVariant.active &&
            giftVariant.product.active &&
            giftVariant.product.giftEligible
          ) {
            const result = await tx.merchVariant.updateMany({
              where: { sku: giftVariant.sku, quantity: { gte: 1 } },
              data: { quantity: { decrement: 1 } },
            });
            if (result.count > 0) {
              giftProductId = giftVariant.product.id;
              giftVariantSku = giftVariant.sku;
              giftLabel = giftVariant.product.name;
            } else {
              console.warn("Gift sku out of stock at checkout, dropping silently:", giftVariant.sku);
            }
          } else {
            console.warn("Invalid gift sku at checkout, dropping silently:", rawGiftSku);
          }
        }
      }

      const shippingFee = deliveryMethod === "pickup" ? 0 : shippingCouponCode ? 0 : baseShippingFee;
      const totalAmount = subtotal - discountAmount + shippingFee;

      return tx.order.create({
        data: {
          customerName,
          customerEmail,
          customerPhone,
          address: deliveryMethod === "pickup" ? null : address,
          items: orderItems,
          idempotencyKey,
          totalAmount,
          paymentMethod,
          deliveryMethod,
          shippingFee,
          couponCode,
          discountAmount,
          shippingCouponCode,
          giftProductId,
          giftVariantSku,
          giftLabel,
        },
      });
    });

    // Payment QR is part of the response body, so it has to be generated
    // synchronously. Emails are not — they're deferred via after() below so
    // the customer's response isn't blocked on two Resend API calls.
    const vs = getOrderVs(order.createdAt, order.orderNumber);
    let qrCodeBase64: string | undefined;
    if (paymentMethod === "bank_transfer") {
      const spd = generateSPD({
        amount: order.totalAmount / 100,
        message: `Salty Road Shop ${vs}`,
        vs,
      });
      qrCodeBase64 = await generateQRCodeBase64(spd);
    }

    after(async () => {
      try {
        const orderItems = order.items as { name: string; label: string; price: number; qty: number }[];
        await sendMerchOrderConfirmationEmail(
          customerEmail,
          {
            orderId: order.id,
            vs,
            items: orderItems,
            totalAmount: order.totalAmount,
            paymentMethod,
            deliveryMethod: order.deliveryMethod as "shipping" | "pickup",
            shippingFee: order.shippingFee,
            address: order.address,
            couponCode: order.couponCode,
            discountAmount: order.discountAmount,
            shippingCouponCode: order.shippingCouponCode,
            giftLabel: order.giftLabel,
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
            address: order.address,
            deliveryMethod: order.deliveryMethod,
            paymentMethod,
            items: orderItems,
            totalAmount: order.totalAmount,
          });
          await sendEmail(orderEmail, adminNotification.subject, adminNotification.text, undefined, undefined, SHOP_EMAIL_FROM);
        }
      } catch (err) {
        console.error("Error sending merch order emails:", err);
      }
    });

    return NextResponse.json(
      {
        orderId: order.id,
        vs,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        shippingFee: order.shippingFee,
        couponCode: order.couponCode,
        discountAmount: order.discountAmount,
        shippingCouponCode: order.shippingCouponCode,
        giftLabel: order.giftLabel,
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
