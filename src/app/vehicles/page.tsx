"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

type Registration = {
  id: number;
  name: string;
  car: string;
  plate: string;
  description: string;
  instagram?: string | null;
  photos?: string[] | null;
  status?: string | null;
  createdAt?: string | null;
};

export default function VehiclesPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Helper functions for image optimization
  const getThumbnailUrl = (originalUrl: string) => {
    return `${originalUrl}?w=160&h=112&fit=cover&q=75`;
  };

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
        setTotal(json.total);
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
    <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="pb-1 text-2xl sm:text-3xl lg:text-5xl font-extrabold bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent">
          Registered Vehicles ({total > 0 ? total : regs.length})
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(1, false)}
            className="px-4 py-2 sm:px-6 sm:py-2 bg-gradient-to-r from-white to-[#C0C0C0] text-black font-semibold rounded-none border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:shadow-lg hover:cursor-pointer transition-all duration-200 text-sm sm:text-base"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 mb-6 p-4 border border-red-400/30 bg-red-900/20 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {regs.map((r) => (
          <div key={r.id} className="relative p-4 sm:p-6 border border-[#C0C0C0]/30 bg-gradient-to-br from-gray-900/40 to-black/60 backdrop-blur-md rounded-lg shadow-2xl hover:shadow-[#C0C0C0]/20 transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div className="flex-1 lg:pr-6">
                {/* Main car info */}
                <div className="mb-3">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                    {r.car}
                  </h2>
                  {/* Instagram handle */}
                  {r.instagram && (
                    <a
                      href={`https://instagram.com/${r.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs sm:text-sm text-[#C0C0C0]/70 bg-black/40 px-2 py-1 rounded border border-[#C0C0C0]/20 hover:text-[#C0C0C0] hover:bg-black/60 hover:border-[#C0C0C0]/40 transition-all duration-200 cursor-pointer mt-2"
                      aria-label={`Visit Instagram profile ${r.instagram}`}
                    >
                      @{r.instagram.replace('@', '')}
                    </a>
                  )}
                </div>
                
                {/* Description */}
                <div className="mb-4 sm:mb-6 text-gray-300 leading-relaxed text-sm sm:text-base">
                  {r.description}
                </div>
              </div>

              {/* Photos - mobile optimized */}
              <div className="flex-shrink-0">
                {r.photos && r.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2 sm:gap-3 max-w-full lg:max-w-xs pt-2">
                    {r.photos.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => openGallery(r.photos || [], i)}
                        className="p-0 border border-[#C0C0C0]/40 w-20 h-14 sm:w-24 sm:h-18 overflow-hidden bg-transparent relative hover:border-[#C0C0C0] hover:shadow-lg hover:shadow-[#C0C0C0]/20 hover:cursor-pointer transition-all duration-200 group rounded"
                        aria-label={`Open photo ${i + 1}`}
                      >
                        <Image
                          src={getThumbnailUrl(p)}
                          alt={`photo-${i}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300 rounded"
                          loading="lazy"
                          sizes="(max-width: 640px) 80px, 96px"
                          quality={75}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#C0C0C0]/60 italic text-xs sm:text-sm">No photos uploaded</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8 sm:mt-12">
          <button
            onClick={loadMore}
            className="px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-white to-[#C0C0C0] text-black font-bold text-base sm:text-lg tracking-widest uppercase rounded-none border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:shadow-2xl hover:cursor-pointer transition-all duration-200"
            disabled={loading}
          >
            {loading ? "Loading…" : "Load More"}
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