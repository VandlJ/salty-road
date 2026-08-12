import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { sendRestockNotificationEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import { variantLabel } from "@/lib/variantLabel";
import { withAdmin } from "@/lib/apiHandler";

const MAX_LEN = { color: 60, size: 20 };
const MAX_PHOTOS = 20;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/merch/variants/[id]",
  async ({ req, params: { id } }) => {
  const body = await req.json();
  const { color, size, price, quantity, images, active, order } = body;

  for (const [field, maxLen] of Object.entries(MAX_LEN)) {
    const value = body[field];
    if (typeof value === "string" && value.length > maxLen) {
      return NextResponse.json({ error: "field_too_long" }, { status: 400 });
    }
  }
  if (price !== undefined && (!Number.isInteger(price) || price <= 0)) {
    return NextResponse.json({ error: "invalid_price" }, { status: 400 });
  }
  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
    return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
  }
  if (images !== undefined && (!isStringArray(images) || images.length > MAX_PHOTOS)) {
    return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
  }
  if (order !== undefined && !Number.isInteger(order)) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  // Reading the pre-update quantity, writing it, and claiming the waiting
  // stock requests all have to happen in one transaction. Sequentially,
  // two admins restocking the same variant at once both read quantity 0,
  // both find the same unfulfilled requests, and every waiting customer
  // gets the "back in stock" e-mail twice.
  const { variant, claimedRequests } = await prisma.$transaction(async (tx) => {
    const before = quantity !== undefined
      ? await tx.merchVariant.findUnique({ where: { id }, select: { quantity: true } })
      : null;

    const updated = await tx.merchVariant.update({
      where: { id },
      data: {
        ...(color !== undefined && { color: color ? String(color).trim() : null }),
        ...(size !== undefined && { size: size ? String(size).trim() : null }),
        ...(price !== undefined && { price }),
        ...(quantity !== undefined && { quantity }),
        ...(images !== undefined && { images }),
        ...(active !== undefined && { active: !!active }),
        ...(order !== undefined && { order }),
      },
      include: { product: true },
    });

    const restocked = before && before.quantity === 0 && updated.quantity > 0;
    if (!restocked) return { variant: updated, claimedRequests: [] };

    const requests = await tx.stockRequest.findMany({
      where: { sku: updated.sku, fulfilled: false },
    });
    if (requests.length === 0) return { variant: updated, claimedRequests: [] };

    // The `fulfilled: false` filter is what makes the claim atomic — a
    // concurrent transaction that already flipped these rows leaves zero
    // matching here, so exactly one caller ends up sending the e-mails.
    const claimed = await tx.stockRequest.updateMany({
      where: { id: { in: requests.map((r) => r.id) }, fulfilled: false },
      data: { fulfilled: true },
    });

    return { variant: updated, claimedRequests: claimed.count > 0 ? requests : [] };
  });

  if (claimedRequests.length > 0) {
    const productName = variant.product.name;
    const label = variantLabel(variant);
    const productUrl = `${SITE_URL}/cs/shop/${variant.product.slug}`;
    after(async () => {
      for (const r of claimedRequests) {
        try {
          await sendRestockNotificationEmail(r.customerEmail, {
            productName,
            variantLabel: label,
            productUrl,
          });
        } catch (err) {
          console.error("Error sending restock notification email:", err);
        }
      }
    });
  }

  return NextResponse.json(variant);
  }
);

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/merch/variants/[id]",
  async ({ params: { id } }) => {
  await prisma.merchVariant.delete({ where: { id } });
  return NextResponse.json({ success: true });
  }
);
