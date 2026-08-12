import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { toLocale } from "@/i18n/locale";

// Catch-all for any path under a locale that doesn't match a real route
// (e.g. /cs/kk, /en/whatever). Without this, an unmatched path never
// resolves to a page at all, so Next skips straight to the root
// global-not-found.tsx (locale-agnostic, hardcoded Czech) instead of the
// localized src/app/[locale]/not-found.tsx — calling notFound() here from
// an actual matched page is what makes that nearer, translated boundary
// fire correctly for both /cs and /en.
//
// generateMetadata still runs for this page before notFound() swaps the
// body for the not-found boundary, so this is also the only place that can
// give the resulting 404 a locale-aware tab title — not-found.tsx itself
// never receives the [locale] param.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "NotFoundPage" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default function UnmatchedRoute() {
  notFound();
}
