"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

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
        setError(json?.error || "Failed to load");
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
      setError("Network error");
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

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!galleryOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setGalleryOpen(false);
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i + 1) % galleryPhotos.length);
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i - 1 + galleryPhotos.length) % galleryPhotos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryOpen, galleryPhotos.length]);

  function openGallery(photos: string[], index = 0) {
    if (!photos || photos.length === 0) return;
    setGalleryPhotos(photos);
    setGalleryIndex(index);
    setGalleryOpen(true);
    
    const preloadIndexes = [index - 1, index, index + 1].filter(i => i >= 0 && i < photos.length);
    preloadIndexes.forEach(i => {
      const img = new window.Image();
      img.src = getFullUrl(photos[i]);
    });
  }
  function closeGallery() {
    setGalleryOpen(false);
  }
  function nextImage() {
    setGalleryIndex((i) => (i + 1) % galleryPhotos.length);
  }
  function prevImage() {
    setGalleryIndex((i) => (i - 1 + galleryPhotos.length) % galleryPhotos.length);
  }

  return (
    <section id="vehicles" className="bg-transparent text-white px-4 pt-12 pb-20 sm:px-8 max-w-6xl mx-auto scroll-mt-24 text-center">
      <div className="flex flex-col items-center mb-16 gap-4">
        <div className="relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center uppercase tracking-widest drop-shadow-sm bg-gradient-to-tr from-gray-100 to-gray-400 bg-clip-text text-transparent">
            {t("title")}
          </h1>
        </div>
        {/* <button
          onClick={() => load(1, false)}
          className="px-4 py-2 sm:px-6 sm:py-2 bg-white text-black font-semibold rounded-none border-2 border-white hover:bg-gray-200 hover:shadow-lg hover:cursor-pointer transition-all duration-200 text-sm sm:text-base uppercase tracking-wider"
          disabled={loading}
        >
          {loading ? t("refreshing") : t("refresh")}
        </button> */}
      </div>

      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 rounded font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regs.map((r) => (
          <div 
            key={r.id} 
            className="group relative aspect-[4/3] bg-black border border-gray-600 overflow-hidden hover:border-white transition-all duration-300 cursor-pointer shadow-xl"
            onClick={() => openGallery(r.photos || [], 0)}
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
                  {/* <p className="text-xs sm:text-sm text-gray-200 line-clamp-3 mb-3 font-medium">
                    {r.description}
                  </p> */}
                  {r.instagram && (
                    <span className="inline-block text-[10px] sm:text-xs text-white bg-white/20 px-2 py-1 rounded border border-white/30 backdrop-blur-md uppercase tracking-wider font-bold">
                      @{r.instagram.replace('@', '')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Photo count indicator if multiple photos */}
              {r.photos && r.photos.length > 1 && (
                 <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 border border-white/20 text-[10px] uppercase tracking-widest text-white font-bold transition-opacity duration-300 group-hover:opacity-0">
                   +{r.photos.length - 1}
                 </div>
              )}
            </div>

            {/* Hint overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              {/* <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20 scale-50 group-hover:scale-100 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div> */}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8 sm:mt-12">
          <button
            onClick={loadMore}
            className="px-6 py-2 sm:px-8 sm:py-3 bg-white text-black font-bold text-base tracking-widest uppercase rounded-none border-2 border-white hover:bg-gray-200 hover:shadow-2xl hover:cursor-pointer transition-all duration-200"
            disabled={loading}
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}

      {/* Gallery modal */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeGallery}
        >
          <button
            onClick={closeGallery}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 text-white bg-black/70 hover:bg-black/90 hover:cursor-pointer rounded-full p-2 sm:p-3 border border-[#C0C0C0]/50 hover:border-[#C0C0C0] transition-all duration-200 shadow-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-6xl w-full mx-2 sm:mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-[80vh] sm:h-[85vh] bg-black">
              <Image
                src={getFullUrl(galleryPhotos[galleryIndex])}
                alt={`gallery-${galleryIndex}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1400px"
                quality={90}
                priority
              />

              {galleryPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 hover:cursor-pointer rounded-full p-2 sm:p-3 border-2 border-[#C0C0C0] transition-colors duration-200 z-10"
                    aria-label="Previous"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 hover:cursor-pointer rounded-full p-2 sm:p-3 border-2 border-[#C0C0C0] transition-colors duration-200 z-10"
                    aria-label="Next"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white text-xs sm:text-sm bg-black/60 px-3 py-1 sm:px-4 sm:py-2 rounded border border-[#C0C0C0] z-10">
                    {galleryIndex + 1} / {galleryPhotos.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}