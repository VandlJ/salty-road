"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";
import Skeleton from "@/components/skeleton";
import { FadeSwap } from "@/components/fade-swap";
import { motion } from "motion/react";

type Registration = {
  id: string;
  firstName: string;
  lastName: string;
  brand: string;
  model: string;
  year: string;
  description: string;
  instagram?: string | null;
  photos?: string[] | null;
  status?: string | null;
  createdAt?: string | null;
};

export default function VehiclesSection() {
  const t = useTranslations("VehiclesPage");
  const [regs, setRegs] = useState<Registration[]>([]);
  // Starts true so the initial fetch shows a skeleton grid instead of an
  // empty section (there was no loading UI at all before this pass).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // gallery state
  const [gallery, setGallery] = useState<{ photos: string[]; index: number; label: string } | null>(null);

  const pageRef = useRef(page);
  const galleryOpenRef = useRef(false);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { galleryOpenRef.current = gallery !== null; }, [gallery]);

  // Helper functions for image optimization
  const getFullUrl = (originalUrl: string) => {
    return `${originalUrl}?q=90`;
  };

  async function load(pageNum = 1, append = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles?page=${pageNum}&limit=20`);
      const json = await res.json();
      if (!res.ok) {
        setError(t("errorLoad"));
        if (!append) setRegs([]);
      } else {
        if (append) {
          setRegs(prev => [...prev, ...json.data]);
        } else {
          setRegs(json.data);
        }
        setHasMore(json.hasMore);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      load(nextPage, true);
    }
  }

  // Background refresh: refetches only as many items as are already
  // visible, so it never truncates pages the user already loaded and
  // never touches `loading` (no flicker on the load-more button).
  async function refreshQuiet() {
    if (galleryOpenRef.current || document.hidden) return;
    try {
      const currentLimit = pageRef.current * 20;
      const res = await fetch(`/api/vehicles?page=1&limit=${currentLimit}`);
      const json = await res.json();
      if (res.ok) {
        setRegs(json.data);
        setHasMore(json.hasMore);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    // Initial data fetch on mount — setState happens after the async
    // fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(refreshQuiet, 60000);
    return () => clearInterval(id);
  }, []);

  function openGallery(r: Registration, index = 0) {
    if (!r.photos || r.photos.length === 0) return;
    setGallery({ photos: r.photos, index, label: `${r.brand} ${r.model}` });
  }

  return (
    <section id="vehicles" className="reveal-on-scroll bg-transparent text-white px-4 pt-12 pb-20 sm:px-8 max-w-6xl mx-auto scroll-mt-24 text-center overflow-hidden">
      <div className="flex flex-col items-center mb-16 gap-4">
        <SectionHeading as="h1" size="lg">
          {t("title")}
        </SectionHeading>
      </div>

      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 rounded-sm font-bold">
          {error}
        </div>
      )}

      {!error && (
      <FadeSwap activeKey={loading && regs.length === 0 ? "skeleton" : regs.length === 0 ? "empty" : "list"}>
      {loading && regs.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : regs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-gray-800 rounded-sm">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600"
          >
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <p className="text-gray-400 font-light text-base max-w-sm text-center">
            {t("noVehiclesYet")}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regs.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="group relative aspect-[4/3] bg-black border border-gray-600 overflow-hidden hover:border-white transition-all duration-300 cursor-pointer shadow-xl rounded-sm"
            onClick={() => openGallery(r, 0)}
          >
            {/* Main Photo as background */}
            {r.photos && r.photos.length > 0 ? (
              <Image
                src={getFullUrl(r.photos[0])}
                alt={`${r.brand} ${r.model}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                {t("noPhotos")}
              </div>
            )}

            {/* Gradient Overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-all duration-300" />

            {/* Content Overlay */}
            <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end">
              <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-2xl">
                  {r.brand} {r.model} <span className="text-sm sm:text-base font-normal text-gray-300">({r.year})</span>
                </h2>
                
                {/* Expandable info on hover */}
                <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-32 group-hover:opacity-100 transition-all duration-500 ease-in-out">
                  {r.instagram && (
                    <span className="inline-block text-[10px] sm:text-xs text-white bg-white/20 px-2 py-1 rounded-sm border border-white/30 backdrop-blur-md uppercase tracking-wider font-bold">
                      @{r.instagram.replace('@', '')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Photo count indicator if multiple photos */}
              {r.photos && r.photos.length > 1 && (
                 <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 border border-white/20 text-[10px] uppercase tracking-widest text-white font-bold transition-opacity duration-300 group-hover:opacity-0 rounded-sm">
                   +{r.photos.length - 1}
                 </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      )}
      </FadeSwap>
      )}

      {/* Load More Button */}
      {hasMore && regs.length > 0 && (
        <div className="text-center mt-8 sm:mt-12">
          <button
            onClick={loadMore}
            className="px-6 py-2 sm:px-8 sm:py-3 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 hover:shadow-2xl hover:cursor-pointer transition-all duration-200"
            disabled={loading}
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}

      {gallery && (
        <PhotoGallery
          photos={gallery.photos}
          initialIndex={gallery.index}
          label={gallery.label}
          getFullUrl={getFullUrl}
          onClose={() => setGallery(null)}
        />
      )}
    </section>
  );
}