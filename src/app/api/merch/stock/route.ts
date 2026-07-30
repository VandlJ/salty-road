import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const MAX_SKUS = 50;

// Returns live stock counts for the given SKUs — used by the cart page to
// warn/cap quantities against a snapshot that may have gone stale (cart
// contents persist in localStorage across sessions).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const skus = body?.skus;

    if (!Array.isArray(skus) || skus.length === 0 || skus.length > MAX_SKUS || !skus.every((s) => typeof s === "string")) {
      return NextResponse.json({ error: "invalid_skus" }, { status: 400 });
    }

    const variants = await prisma.merchVariant.findMany({
      where: { sku: { in: skus } },
      select: { sku: true, quantity: true, active: true },
      cacheStrategy: { ttl: 15 },
    });

    const stock: Record<string, number> = {};
    for (const sku of skus) {
      const variant = variants.find((v) => v.sku === sku);
      stock[sku] = variant && variant.active ? variant.quantity : 0;
    }

    return NextResponse.json({ stock });
  } catch (err) {
    console.error("POST /api/merch/stock error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
