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
    // Volume 1 is archived — there are no registrations left to check, so
    // this is out of the sitemap and out of the index. Deliberately a meta
    // noindex rather than a robots.txt disallow: a disallow would stop
    // crawlers fetching the page at all, so they'd never see the noindex and
    // the URL could sit in the index indefinitely.
    robots: { index: false, follow: false },
    alternates: {
      canonical: canonicalUrl(locale, "/check"),
      languages: buildAlternates("/check"),
    },
  };
}

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
