import { cache } from "react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { compareVariantsForDisplay } from "@/lib/variantLabel";

// Shared between the /shop listing page, the /shop/[slug] detail page, and
// its layout's generateMetadata — cache() dedupes repeated calls with the
// same args into a single Prisma query per request.

export const getShopProductList = cache(async () => {
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

  for (const p of products) p.variants.sort(compareVariantsForDisplay);

  // Hide products left with no visible variants (e.g. all soft-deleted).
  return products.filter((p) => p.variants.length > 0);
});

export const getShopProduct = cache(async (slug: string) => {
  const product = await prisma.merchProduct.findUnique({
    where: { slug },
    include: {
      variants: {
        where: { active: true },
        orderBy: { order: Prisma.SortOrder.asc },
      },
    },
    cacheStrategy: { ttl: 30 },
  });

  if (product) product.variants.sort(compareVariantsForDisplay);
  return product;
});
