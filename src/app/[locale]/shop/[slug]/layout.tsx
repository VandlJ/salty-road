import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  const shopTitle = t("title");

  const product = await prisma.merchProduct.findUnique({
    where: { slug },
    select: { name: true, description: true, active: true },
  });

  if (!product || !product.active) {
    return { title: shopTitle };
  }

  return {
    title: `${product.name} | ${shopTitle}`,
    description: product.description,
  };
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
