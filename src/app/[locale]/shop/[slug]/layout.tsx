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
      photoMode: true,
      photos: true,
      variants: {
        where: { active: true },
        select: { sku: true, label: true, price: true, quantity: true, images: true },
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

  // Plain product name — /shop/layout.tsx now owns a title.template for
  // this whole subtree, so it appends "| Salty Road Meet Volume 1"
  // automatically (used to be hand-concatenated here, which also silently
  // dropped that site-name suffix — same bug class as the /shop/layout.tsx
  // fix above).
  const title = product.name;
  const allPhotos =
    product.photoMode === "per_variant"
      ? product.variants.flatMap((v) => v.images)
      : product.photos;
  const image = allPhotos[0];

  return {
    title,
    description: product.description,
    alternates: {
      canonical: canonicalUrl(locale, `/shop/${slug}`),
      languages: buildAlternates(`/shop/${slug}`),
    },
    robots,
    // Same shallow-merge gotcha as /shop/layout.tsx — fall back to the site
    // OG image explicitly when this product has no photo, instead of
    // silently losing the image on share.
    openGraph: {
      title,
      description: product.description,
      type: "website",
      images: image ? [{ url: image }] : [{ url: "/OG_image.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: product.description,
      images: [image ?? "/OG_image.jpg"],
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
  const images =
    product.photoMode === "per_variant"
      ? product.variants.flatMap((v) => v.images)
      : product.photos;

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
