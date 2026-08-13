import type { Edition } from "@prisma/client";
import { SITE_URL, canonicalUrl } from "@/lib/seo";

// schema.org Event for one edition, built from its row rather than the
// literals this used to carry ("2026-07-25", "Velké náměstí"), which had to
// be hand-edited in every page that emitted them.
export function buildEventJsonLd({
  edition,
  locale,
  name,
  description,
  path,
}: {
  edition: Edition;
  locale: string;
  name: string;
  description: string;
  /** Locale-relative path this Event describes, e.g. "" or "/vol1". */
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate: edition.startDate.toISOString(),
    // endDate is what marks a finished event: without it, a startDate-only
    // Event reads as open-ended/still running.
    endDate: edition.endDate.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // Stays "scheduled" even once the event is over — schema.org has no
    // "happened" status, and the alternatives (Cancelled/Postponed/
    // MovedOnline) would all assert something false. A past endDate is the
    // signal.
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: edition.venueName,
      address: {
        "@type": "PostalAddress",
        addressLocality: edition.venueLocality,
        addressCountry: "CZ",
      },
    },
    image: [`${SITE_URL}/OG_image.jpg`],
    organizer: {
      "@type": "Organization",
      name: "Salty Road Meet",
      url: SITE_URL,
    },
    url: canonicalUrl(locale, path),
  };
}
