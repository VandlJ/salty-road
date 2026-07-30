import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHubPage" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });
  const siteTitle = `${tHero("title1")} ${tHero("title2")}`;

  return {
    // Root layout's title.template only reaches direct children — any
    // nested layout (like this one) that sets a plain title string breaks
    // template inheritance for everything nested under IT too (bit us on
    // shop/[slug] earlier, and again here across every /admin/* subpage).
    // Re-declaring the same template here fixes it for all of them at once.
    title: {
      template: `%s | ${siteTitle}`,
      default: t("title"),
    },
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
