"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

type Registration = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  car: string;
  plate: string;
  description: string;
  instagram?: string | null;
  photos?: string[];
  status?: string;
  createdAt?: string;
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  async function checkAuthAndLoad() {
    // try load list; if 401 then not logged in
    try {
      setLoading(true);
      const res = await fetch("/api/admin/registrations");
      if (res.status === 401) {
        setLoggedIn(false);
        setRegs([]);
      } else {
        const data = await res.json();
        setRegs(data);
        setLoggedIn(true);
      }
    } catch (e) {
      console.error(e);
      setError("Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuthAndLoad();
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

  // Helper function for status indicator color
  function getStatusColor(status?: string) {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "bg-green-400";
      case "declined":
        return "bg-red-400";
      default: // pending or undefined
        return "bg-orange-400";
    }
  }

  // Helper function to format license plate for display (add space after first 3 characters)
  function formatPlate(plate: string) {
    if (!plate || plate.length <= 3) return plate;
    return `${plate.slice(0, 3)} ${plate.slice(3)}`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error || "Login failed");
        return;
      }
      setUser("");
      setPass("");
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError("Login error");
    }
  }

  async function handleAction(id: number, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error || "Action failed");
        return;
      }
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  }

  if (!loggedIn) {
    return (
      <section className="min-h-screen bg-transparent text-white p-8 max-w-xl mx-auto flex items-center justify-center">
        <div className="w-full">
          <h1 className="text-5xl font-extrabold mb-8 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent text-center">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <input 
              value={user} 
              onChange={(e) => setUser(e.target.value)} 
              placeholder="Username" 
              required 
              className="p-4 bg-gray-900/50 border border-[#C0C0C0]/30 rounded text-white placeholder-gray-400 focus:border-[#C0C0C0] focus:outline-none transition-colors" 
            />
            <input 
              value={pass} 
              onChange={(e) => setPass(e.target.value)} 
              placeholder="Password" 
              type="password" 
              required 
              className="p-4 bg-gray-900/50 border border-[#C0C0C0]/30 rounded text-white placeholder-gray-400 focus:border-[#C0C0C0] focus:outline-none transition-colors" 
            />
            <button className="px-8 py-3 bg-gradient-to-r from-white to-[#C0C0C0] text-black font-bold text-lg tracking-widest uppercase rounded-none border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:shadow-2xl transition-all duration-200">
              Login
            </button>
            {error && <div className="text-red-400 p-4 border border-red-400/30 bg-red-900/20 rounded text-center">{error}</div>}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-transparent text-white p-8 max-w-6xl mx-auto">
      <h1 className="text-5xl font-extrabold mb-8 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent">
        Registrations ({regs.length})
      </h1>
      {loading && <div className="text-[#C0C0C0] mb-6">Loading…</div>}
      {error && <div className="text-red-400 mb-6 p-4 border border-red-400/30 bg-red-900/20 rounded">{error}</div>}
      <div className="space-y-6">
        {regs.map((r) => (
          <div key={r.id} className="relative p-6 border border-[#C0C0C0]/30 bg-gradient-to-br from-gray-900/40 to-black/60 backdrop-blur-md rounded-lg shadow-2xl hover:shadow-[#C0C0C0]/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-2xl font-bold text-white mb-2">{r.name} <span className="text-lg text-[#C0C0C0]">({r.email})</span></div>
                <div className="text-[#C0C0C0] font-semibold text-lg mb-2">{r.car} — {formatPlate(r.plate)}</div>
                <div className="text-gray-300 leading-relaxed mb-4">{r.description}</div>
                {r.instagram && (
                  <a
                    href={`https://instagram.com/${r.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Instagram: @{r.instagram.replace('@', '')}
                  </a>
                )}
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {r.photos.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => openGallery(r.photos || [], i)}
                        className="block w-32 h-24 overflow-hidden border border-[#C0C0C0]/40 p-0 bg-transparent relative hover:border-[#C0C0C0] hover:shadow-lg hover:shadow-[#C0C0C0]/20 hover:cursor-pointer transition-all duration-200 group rounded"
                        aria-label={`Open photo ${i + 1} of ${r.name}`}
                      >
                        <Image
                          src={p}
                          alt={`photo-${i}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300 rounded"
                          loading="lazy"
                          sizes="128px"
                          quality={75}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-6">
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 bg-[#C0C0C0]/10 border border-[#C0C0C0]/40 rounded text-sm text-[#C0C0C0]">
                    <div className={`w-2 h-2 ${getStatusColor(r.status)} rounded-full mr-2`}></div>
                    {r.status || "pending"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleAction(r.id, "accept")} 
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 hover:cursor-pointer text-white rounded border border-green-500 transition-colors duration-200"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleAction(r.id, "decline")} 
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 hover:cursor-pointer text-white rounded border border-red-500 transition-colors duration-200"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gallery modal */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeGallery}
        >
          <div className="relative max-w-6xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 z-50 text-white bg-black/60 hover:bg-black/80 rounded-full p-3 border-2 border-[#C0C0C0] transition-colors duration-200"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative w-full h-[85vh] border-2 border-[#C0C0C0] bg-black">
              <Image
                src={galleryPhotos[galleryIndex]}
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 rounded-full p-3 border-2 border-[#C0C0C0] transition-colors duration-200 z-10"
                    aria-label="Previous"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/60 hover:bg-black/80 rounded-full p-3 border-2 border-[#C0C0C0] transition-colors duration-200 z-10"
                    aria-label="Next"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-2 rounded border border-[#C0C0C0] z-10">
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