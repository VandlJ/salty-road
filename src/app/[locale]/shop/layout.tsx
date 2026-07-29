import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });

  return {
    title: t("title"),
    description: t("subtitle"),
    // Placeholder page with no real products yet — keep out of search results
    // until it has actual content.
    robots: { index: false, follow: true },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
