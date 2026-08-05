"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";

const PLACEHOLDER_COUNT = 8;
// One fixed row height — each photo's width is whatever its natural aspect
// ratio works out to at that height (no crop, no stored width/height
// needed), so the section never grows with photo count. That's the point:
// a horizontal scroll instead of a page that gets taller the more photos
// get uploaded.
const ROW_HEIGHT = "h-72 sm:h-96 md:h-[30rem] lg:h-[34rem]";
const SCROLL_STEP = 640;

// Photos arrive as props from the server (see getGalleryPhotosCached) rather
// than being fetched client-side — the whole list is a handful of KB of URLs,
// so a public API route and a loading state would be pure overhead.
export default function EventGallerySection({ photos }: { photos: string[] }) {
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
              {photos.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  data-testid="gallery-photo"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`${t("photoLabel")} ${i + 1}`}
                  className="h-full shrink-0 snap-start rounded-lg overflow-hidden border border-gray-800 bg-black cursor-pointer group shadow-lg shadow-black/50 transition-shadow duration-300 hover:shadow-xl hover:shadow-black/70"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixed row height, natural width from intrinsic aspect ratio; next/image needs a width/height we don't have. */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="h-full w-auto block transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ))}
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
          photos={photos}
          initialIndex={lightboxIndex}
          label={t("photoLabel")}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
