import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { compareVariantsForDisplay, variantLabel } from "@/lib/variantLabel";

// Public, no auth — lists the free-gift options shown at checkout once the
// cart crosses the sticker gift threshold (src/lib/shop.ts). Deliberately a
// separate, smaller shape from /api/merch/products: no price, no stock
// number shown to the customer, just enough to pick one.
export async function GET() {
  try {
    const products = await prisma.merchProduct.findMany({
      where: { active: true, giftEligible: true },
      orderBy: { order: Prisma.SortOrder.asc },
      include: {
        variants: {
          where: { active: true, quantity: { gt: 0 } },
          orderBy: { order: Prisma.SortOrder.asc },
        },
      },
      cacheStrategy: { ttl: 30 },
    });

    const options = products.flatMap((product) => {
      const sortedVariants = [...product.variants].sort(compareVariantsForDisplay);
      const thumbnail =
        product.photoMode === "per_variant"
          ? undefined // resolved per-variant below
          : product.photos[0];

      return sortedVariants.map((v) => {
        const label = variantLabel(v);
        const image = product.photoMode === "per_variant" ? v.images[0] : thumbnail;
        return {
          sku: v.sku,
          productId: product.id,
          name: label ? `${product.name} — ${label}` : product.name,
          description: product.description,
          image: image ?? null,
        };
      });
    });

    return NextResponse.json(options, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/merch/gift-options error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
