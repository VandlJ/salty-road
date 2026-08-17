import dynamic from "next/dynamic";
import type { Edition } from "@prisma/client";
import { parseHeroVideo } from "@/lib/heroVideo";
import Hero from "@/components/hero";
import EventRecapSection from "@/components/event-recap-section";
import { getGalleryPhotosCached } from "@/lib/gallery";
import { getEditionContent } from "@/content/editions";

const EventGallerySection = dynamic(() => import("@/components/event-gallery-section"));
const VideosSection = dynamic(() => import("@/components/videos-section"));
const VehiclesSection = dynamic(() => import("@/components/vehicles-section"));
const SponsorsSection = dynamic(() => import("@/components/sponsors-section"));
const NextEditionSection = dynamic(() => import("@/components/next-edition-section"));

// The look-back composition for a finished edition: recap, photos, videos,
// the cars that were there, sponsors, and a nudge toward the next one.
//
// Shared by the homepage (while the current edition is archived) and by the
// permanent /[edition] archive routes, so an edition doesn't change how it
// looks the moment a newer one takes over the homepage.
export default async function EditionArchive({
  edition,
  vehiclesTitle,
  showNextEdition = true,
}: {
  edition: Edition;
  vehiclesTitle: string;
  /** The teaser only belongs on the homepage, not on every past archive. */
  showNextEdition?: boolean;
}) {
  const content = getEditionContent(edition.slug);
  const galleryPhotos = await getGalleryPhotosCached(edition.slug);

  return (
    <>
      <div className="relative h-screen w-full">
        <Hero namespace="ArchivePage.hero" ctaKey="galleryButton" ctaTargetId="gallery" heroVideo={parseHeroVideo(edition.heroVideo)} />
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-brand-dark via-brand to-brand-dark" />
      <div className="bg-black">
        <EventRecapSection />
        <EventGallerySection photos={galleryPhotos} />
        <VideosSection videos={content.videos} />
        <VehiclesSection title={vehiclesTitle} editionSlug={edition.slug} />
        <SponsorsSection sponsors={content.sponsors} pressArticleUrl={content.pressArticleUrl} />
        {showNextEdition && <NextEditionSection />}
      </div>
    </>
  );
}
