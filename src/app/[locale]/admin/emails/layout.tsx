import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "AdminEmailsPage" });

  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default function AdminEmailsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
