"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";

const PAGE_SIZE = 24;
const PLACEHOLDER_COUNT = 8;

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
          {/* Same grid geometry as the populated state, so the page doesn't
              reflow once photos are actually uploaded. */}
          <div
            aria-hidden="true"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-sm border border-gray-800 bg-white/[0.03]"
              />
            ))}
          </div>
          <p className="mt-8 text-gray-400 text-base font-light">{t("empty")}</p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((url, i) => (
              <button
                key={url}
                type="button"
                data-testid="gallery-photo"
                onClick={() => setLightboxIndex(i)}
                aria-label={`${t("photoLabel")} ${i + 1}`}
                className="relative aspect-[4/3] rounded-sm overflow-hidden border border-gray-800 bg-black cursor-pointer group"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  quality={65}
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
