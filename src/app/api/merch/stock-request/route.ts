import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { stockRequestNotificationEmail } from "@/emails/stock-request-notification.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { customerName: 100, customerEmail: 200 };

export async function POST(req: Request) {
  if (!(await rateLimit(`stock-request:${getClientIp(req)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { sku, customerName, customerEmail } = body;

    if (!sku || !customerName || !customerEmail) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (typeof customerEmail !== "string" || !EMAIL_RE.test(customerEmail)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    // Look up the variant server-side — never trust product name/label from
    // the client, and only accept requests for variants that are actually
    // out of stock (not a backdoor to spam every variant).
    const variant = await prisma.merchVariant.findUnique({
      where: { sku },
      include: { product: true },
    });
    if (!variant || !variant.active || !variant.product.active) {
      return NextResponse.json({ error: "invalid_sku" }, { status: 400 });
    }
    if (variant.quantity > 0) {
      return NextResponse.json({ error: "in_stock" }, { status: 400 });
    }

    const stockRequest = await prisma.stockRequest.create({
      data: {
        productSlug: variant.product.slug,
        productName: variant.product.name,
        variantLabel: variant.label,
        sku: variant.sku,
        customerName,
        customerEmail,
      },
    });

    try {
      const orderEmail = process.env.ORDER_EMAIL || process.env.ADMIN_EMAIL;
      if (orderEmail) {
        const notification = stockRequestNotificationEmail({
          productName: variant.product.name,
          variantLabel: variant.label,
          sku: variant.sku,
          customerName,
          customerEmail,
        });
        await sendEmail(orderEmail, notification.subject, notification.text);
      }
    } catch (err) {
      console.error("Error sending stock request notification email:", err);
    }

    return NextResponse.json({ id: stockRequest.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/merch/stock-request error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
