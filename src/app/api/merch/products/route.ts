import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { compareVariantsForDisplay } from "@/lib/variantLabel";

export async function GET() {
  try {
    const products = await prisma.merchProduct.findMany({
      where: { active: true, giftOnly: false },
      orderBy: { order: Prisma.SortOrder.asc },
      include: {
        variants: {
          where: { active: true },
          // Using the Prisma.SortOrder enum (not the "asc" string literal)
          // here — with the Accelerate-extended client, a bare string
          // literal in a nested orderBy silently breaks type inference for
          // the whole include (variants ends up typed as never/missing).
          orderBy: { order: Prisma.SortOrder.asc },
        },
      },
      cacheStrategy: { ttl: 30 },
    });

    // `order` groups variants by color only now (size sorts automatically),
    // so multiple variants can share the same `order` — the DB orderBy above
    // doesn't guarantee a stable size-within-color sequence, hence the
    // explicit re-sort here.
    for (const p of products) p.variants.sort(compareVariantsForDisplay);

    // Hide products left with no visible variants (e.g. all soft-deleted).
    const visible = products.filter((p) => p.variants.length > 0);

    // Matches the Accelerate cacheStrategy ttl above — browser/CDN cache the
    // response itself for 30s (no round trip at all on back/forth shop
    // navigation), then serve stale for up to 5min while revalidating.
    return NextResponse.json(visible, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/merch/products error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
