import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates, canonicalUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CheckPage" });

  const description =
    locale === "cs"
      ? "Zkontrolujte stav své registrace na Salty Road Meet podle registračního ID."
      : "Check the status of your Salty Road Meet registration by registration ID.";

  return {
    title: t("title"),
    description,
    alternates: {
      canonical: canonicalUrl(locale, "/check"),
      languages: buildAlternates("/check"),
    },
  };
}

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
