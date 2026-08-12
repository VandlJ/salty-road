import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getShopEnabled } from "@/lib/shop";
import { buildAlternates, canonicalUrl, jsonLdScript } from "@/lib/seo";
import { variantLabel } from "@/lib/variantLabel";
import { getShopProduct as getProduct } from "@/lib/shopProduct";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ShopPage" });
  const shopTitle = t("title");
  // Same admin-controlled kill switch as /shop — keep product pages out of
  // search results until the shop is actually turned on.
  const enabled = await getShopEnabled();
  const robots = enabled ? undefined : { index: false, follow: false };

  const product = await getProduct(slug);

  if (!product || !product.active || !product.sellable) {
    return { title: shopTitle, robots: { index: false, follow: false } };
  }

  // Plain product name — /shop/layout.tsx now owns a title.template for
  // this whole subtree, so it appends "| Salty Road Meet Volume 1"
  // automatically (used to be hand-concatenated here, which also silently
  // dropped that site-name suffix — same bug class as the /shop/layout.tsx
  // fix above).
  const title = product.name;

  return {
    title,
    description: product.description,
    alternates: {
      canonical: canonicalUrl(locale, `/shop/${slug}`),
      languages: buildAlternates(`/shop/${slug}`),
    },
    robots,
    // opengraph-image.tsx (next/og) generates the actual image for this
    // route — no `images` array needed here, Next wires it up by file
    // convention and it deep-merges title/description from this object.
    openGraph: {
      title,
      description: product.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: product.description,
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

  if (!product || !product.active || !product.sellable || product.variants.length === 0) {
    return children;
  }

  const url = canonicalUrl(locale, `/shop/${slug}`);
  const images =
    product.photoMode === "per_variant"
      ? product.variants.flatMap((v) => v.images)
      : product.photos;

  // Google Merchant / Rich Results recommend an explicit expiry on the
  // quoted price rather than none at all — there's no real per-product
  // expiry concept here, so a rolling 90-day window is used (re-rendered
  // fresh on every request, so this never actually goes stale). The
  // react-hooks/purity rule flags Date.now() as an impure render call, but
  // this is an async Server Component computing a per-request value —
  // exactly what it's supposed to do here, not a client render purity bug.
  // eslint-disable-next-line react-hooks/purity
  const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: "Salty Road Meet" },
    ...(images.length > 0 ? { image: images } : {}),
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: variantLabel(v),
      price: (v.price / 100).toFixed(2),
      priceCurrency: "CZK",
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
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
