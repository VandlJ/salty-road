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
    title: t("thankYouTitle"),
    robots: { index: false, follow: false },
  };
}

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return children;
}
