"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";

const PAGE_SIZE = 24;
// Placeholder tiles vary in height so the empty state already reads as a
// masonry layout, not a plain grid — no layout-shape change once real photos
// land, only the shift from grey to real pixels.
const PLACEHOLDER_HEIGHTS = ["h-48", "h-64", "h-56", "h-72", "h-60", "h-48", "h-64", "h-56"];

// Photos arrive as props from the server (see getGalleryPhotosCached) rather
// than being fetched client-side — the whole list is a handful of KB of URLs,
// so a public API route and a loading state would be pure overhead.
export default function EventGallerySection({ photos }: { photos: string[] }) {
  const t = useTranslations("ArchivePage.gallery");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const shown = photos.slice(0, visible);

  return (
    <section
      id="gallery"
      className="reveal-on-scroll bg-transparent text-white px-4 py-12 md:py-20 max-w-6xl mx-auto scroll-mt-24 text-center"
    >
      <SectionHeading className="mb-4">{t("title")}</SectionHeading>
      <p className="text-gray-400 text-sm mb-10">{t("subtitle")}</p>

      {photos.length === 0 ? (
        <>
          {/* CSS-columns masonry, same as the populated state below — a
              placeholder grid here wouldn't preview the actual layout. */}
          <div aria-hidden="true" className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {PLACEHOLDER_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={`mb-4 break-inside-avoid rounded-sm border border-gray-800 bg-white/[0.03] ${h}`}
              />
            ))}
          </div>
          <p className="mt-8 text-gray-400 text-base font-light">{t("empty")}</p>
        </>
      ) : (
        <>
          {/* Masonry via CSS columns rather than a fixed-aspect grid — photo
              dimensions aren't known ahead of render (no stored width/height,
              just a list of blob URLs), so a plain <img> that keeps its
              natural aspect ratio is what makes that possible. Trade-off:
              this loses next/image's automatic AVIF/WebP re-encoding and
              responsive srcset on the grid tiles specifically — acceptable
              for a modest admin-curated photo count. The lightbox (below)
              still uses next/image for the full-size view. */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {shown.map((url, i) => (
              <button
                key={url}
                type="button"
                data-testid="gallery-photo"
                onClick={() => setLightboxIndex(i)}
                aria-label={`${t("photoLabel")} ${i + 1}`}
                className="mb-4 block w-full break-inside-avoid rounded-sm overflow-hidden border border-gray-800 bg-black cursor-pointer group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- intrinsic size is required for masonry; next/image needs it supplied upfront, which we don't have. */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>

          {visible < photos.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="mt-10 px-6 py-3 border-2 border-white text-white rounded-sm hover:bg-white hover:text-black transition-colors font-bold uppercase tracking-wide cursor-pointer"
            >
              {t("loadMore")}
            </button>
          )}
        </>
      )}

      {lightboxIndex !== null && (
        <PhotoGallery
          photos={shown}
          initialIndex={lightboxIndex}
          label={t("photoLabel")}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
