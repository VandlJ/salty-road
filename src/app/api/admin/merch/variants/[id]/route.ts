import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";
import { sendRestockNotificationEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import { variantLabel } from "@/lib/variantLabel";

const MAX_LEN = { color: 60, size: 20 };
const MAX_PHOTOS = 20;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
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

    // Read the pre-update quantity so a restock (0 -> >0) can be detected
    // after the write, without a separate round trip racing the update.
    const before = quantity !== undefined
      ? await prisma.merchVariant.findUnique({ where: { id }, select: { quantity: true } })
      : null;

    const variant = await prisma.merchVariant.update({
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

    if (before && before.quantity === 0 && variant.quantity > 0) {
      const requests = await prisma.stockRequest.findMany({
        where: { sku: variant.sku, fulfilled: false },
      });
      if (requests.length > 0) {
        await prisma.stockRequest.updateMany({
          where: { id: { in: requests.map((r) => r.id) } },
          data: { fulfilled: true },
        });
        const productName = variant.product.name;
        const label = variantLabel(variant);
        const productUrl = `${SITE_URL}/cs/shop/${variant.product.slug}`;
        after(async () => {
          for (const r of requests) {
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
    }

    return NextResponse.json(variant);
  } catch (err) {
    console.error("PATCH /api/admin/merch/variants/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.merchVariant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/merch/variants/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
