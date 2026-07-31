import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await prisma.merchProduct.findUnique({
      where: { slug },
      include: {
        variants: {
          where: { active: true },
          // See the products/route.ts comment: Prisma.SortOrder enum
          // required here, not the "asc" string literal, or the
          // Accelerate-extended client's include type inference breaks.
          orderBy: { order: Prisma.SortOrder.asc },
        },
      },
      cacheStrategy: { ttl: 30 },
    });

    if (!product || !product.active || product.variants.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Matches the Accelerate cacheStrategy ttl above — browser/CDN cache the
    // response itself for 30s (no round trip at all on back/forth shop
    // navigation), then serve stale for up to 5min while revalidating.
    return NextResponse.json(product, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/merch/products/[slug] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
