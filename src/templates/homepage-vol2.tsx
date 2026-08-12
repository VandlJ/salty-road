// TEMPLATE — NOT A ROUTE.
//
// This is the homepage exactly as it stood while Salty Road Meet Volume 1 was
// still upcoming: hero with a "Registrovat" CTA, InfoSection (parking, program,
// visitor rules, arrival/departure windows, entry fee), the live registration
// form, confirmed vehicles, sponsors. When Volume 1 was archived (the homepage
// became a look-back at the past event), this composition was preserved here
// rather than left to git history, so Volume 2 has a working starting point.
//
// It lives outside src/app/ deliberately — Next.js can never route it, but
// tsc/eslint still check it, so it can't silently rot as the components it
// imports evolve.
//
// CAVEAT: TypeScript does NOT verify the i18n keys used below (this project has
// no IntlMessages type declaration). The `InfoPage`, `RegisterPage`,
// `RegisterForm` and original `Hero.*` keys in messages/*.json are kept alive
// solely for this file. A "clean up unused translation keys" pass would break
// it with a green typecheck — see the _comment key in InfoPage.
//
// To bring Volume 2 online: copy this back over src/app/[locale]/page.tsx,
// update the dates/edition strings in messages/*.json, and restore the
// register/info nav links in src/components/navbar.tsx.

import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import Hero from "@/components/hero";
import InfoSection from "@/components/info-section";
import RegistrationSection from "@/components/registration-section";
import { SITE_URL, canonicalUrl, jsonLdScript } from "@/lib/seo";
import { toLocale } from "@/i18n/locale";

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
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Hero" });
  const tReg = await getTranslations({ locale: toLocale(locale), namespace: "RegisterPage" });

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
