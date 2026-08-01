import type { Metadata } from "next";
import NotFoundView from "./not-found-view";

// not-found.tsx doesn't receive the [locale] route param, so it can't call
// next-intl's server-side getTranslations for a locale-aware title the way
// every other page's generateMetadata does — hardcoded Czech, matching the
// same reasoning as global-not-found.tsx below.
export const metadata: Metadata = {
  title: "Stránka nenalezena",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
