import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getShopEnabled } from "@/lib/shop";
import { buildAlternates, canonicalUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });
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
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
