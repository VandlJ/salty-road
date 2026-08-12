import dynamic from "next/dynamic";
import type { Edition } from "@prisma/client";
import Hero from "@/components/hero";
import { getEditionContent } from "@/content/editions";

const InfoSection = dynamic(() => import("@/components/info-section"));
const RegistrationSection = dynamic(() => import("@/components/registration-section"));
const VehiclesSection = dynamic(() => import("@/components/vehicles-section"));
const SponsorsSection = dynamic(() => import("@/components/sponsors-section"));

// The composition for an edition that hasn't happened yet: hero with a
// "register" CTA, practical info (parking, programme, rules, arrival, fee),
// the live registration form, confirmed cars so far, and sponsors.
//
// This used to exist as src/templates/homepage-vol2.tsx — a hand-maintained
// copy of the homepage kept outside the router, to be pasted back over
// page.tsx when the next edition came around. Switching editions is now a
// branch on edition.status instead of a file copy, so the template (and the
// "DO NOT DELETE" guards protecting the message keys only it referenced)
// is gone.
export default function EditionUpcoming({
  edition,
}: {
  edition: Edition;
}) {
  const content = getEditionContent(edition.slug);

  return (
    <>
      <div className="relative h-screen w-full">
        <Hero />
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-brand-dark via-brand to-brand-dark" />
      <div className="bg-black">
        <InfoSection />
        <RegistrationSection />
        <VehiclesSection editionSlug={edition.slug} />
        <SponsorsSection sponsors={content.sponsors} pressArticleUrl={content.pressArticleUrl} />
      </div>
    </>
  );
}
