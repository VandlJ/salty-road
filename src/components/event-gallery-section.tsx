"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";
import { normalizeInstagramUrl, type GalleryPhoto } from "@/lib/galleryPhoto";

const PLACEHOLDER_COUNT = 8;
// One fixed row height — each photo's width is whatever its natural aspect
// ratio works out to at that height (no crop, no stored width/height
// needed), so the section never grows with photo count. That's the point:
// a horizontal scroll instead of a page that gets taller the more photos
// get uploaded.
const ROW_HEIGHT = "h-72 sm:h-96 md:h-[26rem] lg:h-[28rem]";
const SCROLL_STEP = 640;

// Photos arrive as props from the server (see getGalleryPhotosCached) rather
// than being fetched client-side — the whole list is a handful of KB of URLs,
// so a public API route and a loading state would be pure overhead.
export default function EventGallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const t = useTranslations("ArchivePage.gallery");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
  }

  return (
    <section
      id="gallery"
      className="reveal-on-scroll bg-transparent text-white px-4 py-12 md:py-20 scroll-mt-24 text-center"
    >
      {/* Heading stays column-width like every other section; the photo row
          below deliberately breaks out much wider — a photo gallery reads
          bigger/more immersive taking up more of the screen than a text
          block would. */}
      <div className="max-w-6xl mx-auto">
        <SectionHeading as="h2" size="lg" className="mb-4">{t("title")}</SectionHeading>
        <p className="text-gray-400 text-sm mb-10">{t("subtitle")}</p>
      </div>

      <div className="max-w-[1800px] mx-auto">
        {photos.length === 0 ? (
          <>
            {/* Same row-of-fixed-height-tiles shape as the populated state, so
                the layout doesn't change once photos are actually uploaded. */}
            <div aria-hidden="true" className={`flex gap-3 overflow-hidden ${ROW_HEIGHT}`}>
              {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="h-full aspect-[4/3] shrink-0 rounded-lg border border-gray-800 bg-white/[0.03]"
                />
              ))}
            </div>
            <p className="mt-8 text-gray-400 text-base font-light">{t("empty")}</p>
          </>
        ) : (
          <div className="relative">
            {/* Edge fades hint that the row scrolls, without relying on the
                arrow buttons alone (which are hidden on mobile anyway, where
                swipe is the primary gesture). */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-24 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-24 bg-gradient-to-l from-black to-transparent z-10" />

            <div
              ref={scrollerRef}
              className={`no-scrollbar flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-2 ${ROW_HEIGHT}`}
            >
              {/* Spacers so the first/last photo can actually reach the
                  center of the row — scrollLeft can't go negative, so
                  without these the edge photos snap-center against the
                  wall instead of the middle. */}
              <div aria-hidden="true" className="shrink-0 w-[28vw]" />
              {photos.map((photo, i) => {
                const instagramUrl = normalizeInstagramUrl(photo.instagram);
                return (
                  <button
                    key={photo.url}
                    type="button"
                    data-testid="gallery-photo"
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`${t("photoLabel")} ${i + 1}`}
                    className="relative h-full shrink-0 snap-center rounded-lg overflow-hidden border border-gray-800 bg-black cursor-pointer group shadow-lg shadow-black/50 transition-shadow duration-300 hover:shadow-xl hover:shadow-black/70"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- fixed row height, natural width from intrinsic aspect ratio; next/image needs a width/height we don't have. */}
                    <img
                      src={photo.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-auto block transition-transform duration-300 group-hover:scale-105"
                    />
                    {instagramUrl && (
                      // Own <a>, not a nested button-in-button — stopPropagation
                      // keeps a click here from also opening the lightbox behind it.
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("photoCredit")}
                        className="absolute bottom-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-black/70 backdrop-blur hover:bg-black/90 border border-white/20 hover:border-white text-white rounded-full transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      </a>
                    )}
                  </button>
                );
              })}
              <div aria-hidden="true" className="shrink-0 w-[28vw]" />
            </div>

            {photos.length > 3 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  aria-label={t("scrollLeft")}
                  className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center bg-black/90 backdrop-blur border border-gray-700 hover:border-brand text-white hover:text-brand rounded-full cursor-pointer transition-colors shadow-lg"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  aria-label={t("scrollRight")}
                  className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center bg-black/90 backdrop-blur border border-gray-700 hover:border-brand text-white hover:text-brand rounded-full cursor-pointer transition-colors shadow-lg"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoGallery
          photos={photos.map((p) => p.url)}
          credits={photos.map((p) => p.instagram)}
          initialIndex={lightboxIndex}
          label={t("photoLabel")}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
