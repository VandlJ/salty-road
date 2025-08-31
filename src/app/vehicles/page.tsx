"use client";

import React, { useEffect, useState } from "react";

type Registration = {
  id: number;
  name: string;
  car: string;
  plate: string;
  description: string;
  photos?: string[] | null;
  status?: string | null;
  createdAt?: string | null;
};

export default function VehiclesPage() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load");
        setRegs([]);
      } else {
        setRegs(json);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(id);
  }, []);

  // keyboard controls for gallery
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
    <section className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Registered Vehicles ({regs.length})</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-3 py-1 bg-gray-800 text-white rounded"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid gap-6">
        {regs.map((r) => (
          <div key={r.id} className="p-4 border rounded">
            <div className="mb-2 font-semibold">
              {r.name} — {r.car} ({r.plate})
            </div>
            <div className="text-sm text-gray-600 mb-2">
              Status: {r.status || "pending"}
            </div>
            <div className="mb-3">{r.description}</div>

            {r.photos && r.photos.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {r.photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => openGallery(r.photos || [], i)}
                    className="p-0 border w-40 h-28 overflow-hidden bg-transparent"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img
                      src={p}
                      alt={`photo-${i}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No photos uploaded</div>
            )}
          </div>
        ))}
      </div>

      {/* Gallery modal */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          role="dialog"
          aria-modal="true"
          onClick={closeGallery}
        >
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeGallery}
              className="absolute top-2 right-2 z-50 text-white bg-black/40 rounded-full p-2"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="relative">
              <img
                src={galleryPhotos[galleryIndex]}
                alt={`gallery-${galleryIndex}`}
                className="w-full max-h-[80vh] object-contain bg-black"
              />

              {galleryPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2"
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 rounded-full p-2"
                    aria-label="Next"
                  >
                    ›
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded">
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