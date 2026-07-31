import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const MAX_LEN = { sku: 80, label: 100 };
const MAX_PHOTOS = 20;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id: productId } = await params;
    const body = await req.json();
    const { sku, label, price, quantity, images } = body;

    if (!sku || !label || price == null || quantity == null) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: "invalid_price" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }
    if (images !== undefined && (!isStringArray(images) || images.length > MAX_PHOTOS)) {
      return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
    }

    // New variants go to the end of the display order (not alphabetical —
    // that's the whole point of the `order` column, see admin UI reorder).
    const { _max } = await prisma.merchVariant.aggregate({
      where: { productId },
      _max: { order: true },
    });

    const variant = await prisma.merchVariant.create({
      data: { productId, sku, label, price, quantity, images: images ?? [], order: (_max.order ?? -1) + 1 },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "sku_taken" }, { status: 409 });
    }
    console.error("POST /api/admin/merch/products/[id]/variants error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
