import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getShopEnabled } from "@/lib/shop";
import { buildAlternates, canonicalUrl } from "@/lib/seo";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ShopPage" });
  const tHero = await getTranslations({ locale: toLocale(locale), namespace: "Hero" });
  // The shop is behind an admin-controlled kill switch (off by default) —
  // keep it out of search results until it's actually turned on.
  const enabled = await getShopEnabled();
  const title = t("title");
  const description = t("subtitle");
  const siteTitle = `${tHero("title1")} ${tHero("title2")}`;

  return {
    // Root layout's title.template only reaches direct children — this
    // layout setting a plain title string breaks template inheritance for
    // everything nested under /shop (cart, checkout, thank-you, [slug]).
    // Re-declaring the template here fixes it for all of them at once, same
    // fix as admin/layout.tsx.
    title: { template: `%s | ${siteTitle}`, default: title },
    description,
    alternates: {
      canonical: canonicalUrl(locale, "/shop"),
      languages: buildAlternates("/shop"),
    },
    robots: enabled ? undefined : { index: false, follow: false },
    // A child segment that defines its own `openGraph` object does NOT
    // deep-merge unspecified sub-fields (like `images`) from the parent —
    // it's a shallow replace at the metadata-field level. Root layout's
    // OG_image.jpg fallback silently disappears here unless repeated
    // explicitly, breaking link previews when /shop is shared.
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/OG_image.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/OG_image.jpg"],
    },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
