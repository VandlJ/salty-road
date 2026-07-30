"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import PhotoGallery from "@/components/photo-gallery";

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
  const [loading, setLoading] = useState(false);
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
    <section id="vehicles" className="bg-transparent text-white px-4 pt-12 pb-20 sm:px-8 max-w-6xl mx-auto scroll-mt-24 text-center overflow-hidden">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regs.map((r) => (
          <div 
            key={r.id} 
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
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
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