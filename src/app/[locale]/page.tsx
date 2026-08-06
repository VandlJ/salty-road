import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import Hero from "@/components/hero";
import EventRecapSection from "@/components/event-recap-section";
import { getGalleryPhotosCached } from "@/lib/gallery";
import { SITE_URL, canonicalUrl, jsonLdScript } from "@/lib/seo";

// Below-the-fold sections — still fully server-rendered (dynamic() defaults
// to ssr: true), this just code-splits their JS into separate chunks so the
// initial bundle needed for the hero/LCP doesn't have to include them.
const EventGallerySection = dynamic(() => import("@/components/event-gallery-section"));
const AftermovieSection = dynamic(() => import("@/components/aftermovie-section"));
const VehiclesSection = dynamic(() => import("@/components/vehicles-section"));
const SponsorsSection = dynamic(() => import("@/components/sponsors-section"));
const NextEditionSection = dynamic(() => import("@/components/next-edition-section"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ArchivePage.meta" });
  const description = t("description");

  // Title comes from the layout's default; only the description is
  // page-specific (the layout's is the site-wide fallback used by /check,
  // /privacy and the shop pages).
  return {
    description,
    openGraph: { description },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ArchivePage" });

  const galleryPhotos = await getGalleryPhotosCached();

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${t("hero.title1")} ${t("hero.title2")}`,
    description: t("meta.description"),
    // The site shows "25. 07. 2026" (ArchivePage.hero.dateValue) — same date
    // in ISO form. endDate is what marks this as a finished event: without
    // it, a startDate-only Event reads as open-ended/still running.
    startDate: "2026-07-25",
    endDate: "2026-07-25",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // Stays "scheduled" even though the event is over — schema.org has no
    // "happened" status, and the alternatives (Cancelled/Postponed/MovedOnline)
    // would all assert something false. A past endDate is the signal.
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Velké náměstí",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Prachatice",
        addressCountry: "CZ",
      },
    },
    image: [`${SITE_URL}/OG_image.jpg`],
    organizer: {
      "@type": "Organization",
      name: "Salty Road Meet",
      url: SITE_URL,
    },
    url: canonicalUrl(locale, ""),
  };

  return (
    <div className="w-full">
      {/* Translated strings come from messages/*.json, not user input, but
          jsonLdScript's "</" escaping is applied to every JSON-LD block on
          the site regardless of source. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd) }}
      />
      <div className="relative h-screen w-full">
        <Hero
          namespace="ArchivePage.hero"
          ctaKey="galleryButton"
          ctaTargetId="gallery"
        />
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-brand-dark via-brand to-brand-dark" />
      <div className="bg-black">
        <EventRecapSection />
        <EventGallerySection photos={galleryPhotos} />
        <AftermovieSection />
        <VehiclesSection title={t("vehicles.title")} />
        <SponsorsSection />
        <NextEditionSection />
      </div>
    </div>
  );
}
