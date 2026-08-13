import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates, canonicalUrl } from "@/lib/seo";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "PrivacyPage" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: canonicalUrl(locale, "/privacy"),
      languages: buildAlternates("/privacy"),
    },
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
