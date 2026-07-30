import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { getShopEnabled } from "@/lib/shop";
import { buildAlternates, canonicalUrl, jsonLdScript } from "@/lib/seo";

// generateMetadata and the layout body both need the product — React's
// cache() dedupes the two Prisma calls into one per request instead of
// querying twice for the same page.
const getProduct = cache(async (slug: string) => {
  return prisma.merchProduct.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      active: true,
      variants: {
        where: { active: true },
        select: { sku: true, label: true, price: true, quantity: true, image: true },
      },
    },
  });
});

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

  const product = await getProduct(slug);

  if (!product || !product.active) {
    return { title: shopTitle, robots: { index: false, follow: false } };
  }

  const title = `${product.name} | ${shopTitle}`;
  const image = product.variants.find((v) => v.image)?.image;

  return {
    title,
    description: product.description,
    alternates: {
      canonical: canonicalUrl(locale, `/shop/${slug}`),
      languages: buildAlternates(`/shop/${slug}`),
    },
    robots,
    openGraph: {
      title,
      description: product.description,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  if (!product || !product.active || product.variants.length === 0) {
    return children;
  }

  const url = canonicalUrl(locale, `/shop/${slug}`);
  const images = product.variants.map((v) => v.image).filter((img): img is string => !!img);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(images.length > 0 ? { image: images } : {}),
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.label,
      price: (v.price / 100).toFixed(2),
      priceCurrency: "CZK",
      availability:
        v.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    })),
  };

  return (
    <>
      {/* name/description come from the admin panel — jsonLdScript escapes
          "</" so a value containing "</script>" can't break out of this tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd) }}
      />
      {children}
    </>
  );
}
