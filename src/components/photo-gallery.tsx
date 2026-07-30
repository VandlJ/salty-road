"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";
import { useModalA11y } from "@/lib/useModalA11y";

type PhotoGalleryProps = {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  /** Used for the alt text and the dialog's accessible name, e.g. "BMW M3 touring". */
  label: string;
  /** Defaults to `${url}?q=90`. */
  getFullUrl?: (url: string) => string;
};

const defaultGetFullUrl = (url: string) => `${url}?q=90`;

export default function PhotoGallery({
  photos,
  initialIndex = 0,
  onClose,
  label,
  getFullUrl = defaultGetFullUrl,
}: PhotoGalleryProps) {
  const t = useTranslations("PhotoGallery");
  const [index, setIndex] = useState(initialIndex);

  const next = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length]
  );

  useEffect(() => {
    const preloadIndexes = [initialIndex - 1, initialIndex, initialIndex + 1].filter(
      (i) => i >= 0 && i < photos.length
    );
    preloadIndexes.forEach((i) => {
      const img = new window.Image();
      img.src = getFullUrl(photos[i]);
    });
    // Preload neighbors of the opening index only, once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const modalRef = useModalA11y<HTMLDivElement>(true, onClose);

  if (photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 text-white bg-black/60 hover:bg-white hover:text-black rounded-full p-2 sm:p-3 border-2 border-white/50 hover:border-white transition-all duration-200 cursor-pointer"
        aria-label={t("close")}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative w-full h-full p-4 flex items-center justify-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div key={index} className="fade-swap relative w-full h-full max-w-6xl max-h-[85vh]">
          <Image
            src={getFullUrl(photos[index])}
            alt={t("photoAlt", { label, index: index + 1, total: photos.length })}
            fill
            className="object-contain"
            sizes="100vw"
            quality={90}
            priority
          />
        </div>

        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 rounded-full p-2 sm:p-3 border-2 border-white/50 hover:border-white transition-colors duration-200 z-10 cursor-pointer"
              aria-label={t("previous")}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 rounded-full p-2 sm:p-3 border-2 border-white/50 hover:border-white transition-colors duration-200 z-10 cursor-pointer"
              aria-label={t("next")}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white text-xs sm:text-sm font-mono bg-black/60 px-3 py-1 sm:px-4 sm:py-2 rounded-full border border-white/30 z-10">
              {index + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
