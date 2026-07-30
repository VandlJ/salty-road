import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import Hero from "@/components/hero";
import InfoSection from "@/components/info-section";
import RegistrationSection from "@/components/registration-section";
import { SITE_URL, canonicalUrl, jsonLdScript } from "@/lib/seo";

// Below-the-fold sections — still fully server-rendered (dynamic() defaults
// to ssr: true), this just code-splits their JS into separate chunks so the
// initial bundle needed for the hero/LCP doesn't have to include them.
const VehiclesSection = dynamic(() => import("@/components/vehicles-section"));
const SponsorsSection = dynamic(() => import("@/components/sponsors-section"));

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Hero" });
  const tReg = await getTranslations({ locale, namespace: "RegisterPage" });

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${t("title1")} ${t("title2")}`,
    description: tReg("subtitle"),
    // The site shows "25. 07. 2026" (Hero.dateValue) — same date in ISO form.
    startDate: "2026-07-25",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
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
        <Hero />
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-brand-dark via-brand to-brand-dark" />
      <div className="bg-black">
        <InfoSection />
        <RegistrationSection />
        <VehiclesSection />
        <SponsorsSection />
      </div>
    </div>
  );
}
