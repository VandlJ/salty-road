import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import { getShopEnabled } from "@/lib/shop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  const shopTitle = t("title");
  // Same admin-controlled kill switch as /shop — keep product pages out of
  // search results until the shop is actually turned on.
  const enabled = await getShopEnabled();
  const robots = enabled ? undefined : { index: false, follow: false };

  const product = await prisma.merchProduct.findUnique({
    where: { slug },
    select: { name: true, description: true, active: true },
  });

  if (!product || !product.active) {
    return { title: shopTitle, robots: { index: false, follow: false } };
  }

  return {
    title: `${product.name} | ${shopTitle}`,
    description: product.description,
    robots,
  };
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
