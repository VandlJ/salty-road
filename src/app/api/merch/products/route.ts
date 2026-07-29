import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.merchProduct.findMany({
      where: { active: true },
      orderBy: { createdAt: Prisma.SortOrder.asc },
      include: {
        variants: {
          where: { active: true },
          // Using the Prisma.SortOrder enum (not the "asc" string literal)
          // here — with the Accelerate-extended client, a bare string
          // literal in a nested orderBy silently breaks type inference for
          // the whole include (variants ends up typed as never/missing).
          orderBy: { label: Prisma.SortOrder.asc },
        },
      },
      cacheStrategy: { ttl: 30 },
    });

    // Hide products left with no visible variants (e.g. all soft-deleted).
    const visible = products.filter((p) => p.variants.length > 0);

    return NextResponse.json(visible);
  } catch (err) {
    console.error("GET /api/merch/products error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
