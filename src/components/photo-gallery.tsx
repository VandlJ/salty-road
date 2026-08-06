"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useModalA11y } from "@/lib/useModalA11y";
import { normalizeInstagramUrl } from "@/lib/galleryPhoto";

type PhotoGalleryProps = {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  /** Used for the alt text and the dialog's accessible name, e.g. "BMW M3 touring". */
  label: string;
  /** Defaults to `${url}?q=90`. */
  getFullUrl?: (url: string) => string;
  /**
   * Parallel to `photos` — the photographer's Instagram handle/URL/null for
   * each entry. Only the event gallery has these; every other caller omits
   * the prop and no credit is shown.
   */
  credits?: (string | null)[];
};

const defaultGetFullUrl = (url: string) => `${url}?q=90`;

export default function PhotoGallery({
  photos,
  initialIndex = 0,
  onClose,
  label,
  getFullUrl = defaultGetFullUrl,
  credits,
}: PhotoGalleryProps) {
  const t = useTranslations("PhotoGallery");
  const [index, setIndex] = useState(initialIndex);
  const credit = credits ? normalizeInstagramUrl(credits[index]) : null;

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

  // Portaled straight to <body> — this is only ever mounted client-side (in
  // response to a click, after hydration), so `document` is always
  // available here. A modal nested deep in the tree otherwise inherits
  // whatever `position: fixed` containing-block quirks its ancestors have
  // (e.g. a lingering `transform` from a fill-mode animation), which breaks
  // `fixed inset-0` sizing/scrolling in ways that are a pain to trace back.
  // Escaping to `document.body` sidesteps that class of bug entirely.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {credit && (
        <a
          href={credit}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 sm:top-6 left-4 sm:left-6 z-50 flex items-center gap-2 text-white text-xs sm:text-sm bg-black/60 hover:bg-black/80 px-3 py-2 sm:px-4 rounded-full border-2 border-white/50 hover:border-white transition-colors duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          {credit.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, "")}
        </a>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 text-white bg-black/60 hover:bg-white hover:text-black rounded-full p-2 sm:p-3 border-2 border-white/50 hover:border-white transition-all duration-200 cursor-pointer"
        aria-label={t("close")}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="relative w-full h-full p-4 flex items-center justify-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          key={index}
          className="fade-swap relative w-full h-full max-w-6xl max-h-[85vh] touch-pan-y"
          drag={photos.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            // Swipe distance beats a raw velocity threshold on trackpad-style
            // slow drags; velocity beats distance on a fast flick that
            // barely moves. Either one alone misses one of those two cases.
            if (info.offset.x < -60 || info.velocity.x < -500) next();
            else if (info.offset.x > 60 || info.velocity.x > 500) prev();
          }}
        >
          <Image
            src={getFullUrl(photos[index])}
            alt={t("photoAlt", { label, index: index + 1, total: photos.length })}
            fill
            draggable={false}
            className="object-contain"
            sizes="100vw"
            quality={90}
            // Not `priority` — this modal only ever mounts long after
            // initial page load (on click), well past the browser's
            // "preload used within a few seconds of window.load" window,
            // so `priority`'s preload link always fires as unused. Eager
            // load gets the same immediate-fetch behavior without that.
            loading="eager"
          />
        </motion.div>

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
      </motion.div>
    </motion.div>,
    document.body
  );
}
