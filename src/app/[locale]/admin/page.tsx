"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type Registration = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  brand: string;
  model: string;
  year: string;
  description: string;
  instagram?: string | null;
  photos?: string[];
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

export default function AdminPage() {
  const t = useTranslations("AdminPage");
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState("");

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

  const checkAuthAndLoad = useCallback(async () => {
    // try load list; if 401 then not logged in
    try {
      setLoading(true);
      const res = await fetch("/api/admin/registrations");
      if (res.status === 401) {
        setLoggedIn(false);
        setRegs([]);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRegs(data);
          setLoggedIn(true);
        } else {
          setError(data.error || "Invalid data received");
          setRegs([]);
        }
      }
    } catch (e) {
      console.error(e);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  // keyboard controls for gallery
  useEffect(() => {
    if (!galleryOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setGalleryOpen(false);
      if (e.key === "ArrowRight")
        setGalleryIndex((i) => (i + 1) % galleryPhotos.length);
      if (e.key === "ArrowLeft")
        setGalleryIndex(
          (i) => (i - 1 + galleryPhotos.length) % galleryPhotos.length
        );
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryOpen, galleryPhotos.length]);

  function openGallery(photos: string[], index = 0) {
    if (!photos || photos.length === 0) return;
    setGalleryPhotos(photos);
    setGalleryIndex(index);
    setGalleryOpen(true);

    const preloadIndexes = [index - 1, index, index + 1].filter(
      (i) => i >= 0 && i < photos.length
    );
    preloadIndexes.forEach((i) => {
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
    setGalleryIndex(
      (i) => (i - 1 + galleryPhotos.length) % galleryPhotos.length
    );
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
        setError(j?.error || t("loginError"));
        return;
      }
      setUser("");
      setPass("");
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError(t("loginError"));
    }
  }

  async function handleAction(id: string, action: "accept" | "decline" | "pending" | "reorder" | "updatePhotos" | "updatePaymentStatus" | "updateDescription", extra?: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extra }),
      });
      if (!res.ok) {
        setError(t("actionFailed"));
        return;
      }
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError(t("networkError"));
    }
  }

  async function saveDescription(id: string) {
    if (!tempDescription) return;
    await handleAction(id, "updateDescription", { description: tempDescription });
    setEditingDescriptionId(null);
    setTempDescription("");
  }

  async function handlePhotoUpload(id: string, index: number, photos: string[], file: File) {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const blob = await uploadRes.json();

      const newPhotos = [...photos];
      newPhotos[index] = blob.url;

      await handleAction(id, "updatePhotos", { photos: newPhotos });
    } catch (err) {
      console.error(err);
      setError("Photo replacement failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhoto(id: string, photos: string[], file: File) {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const blob = await uploadRes.json();

      const newPhotos = [...photos, blob.url];

      await handleAction(id, "updatePhotos", { photos: newPhotos });
    } catch (err) {
      console.error(err);
      setError("Photo upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReorderPhoto(id: string, photos: string[], fromIndex: number, direction: 'prev' | 'next') {
    const toIndex = direction === 'prev' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= photos.length) return;

    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);

    await handleAction(id, "updatePhotos", { photos: newPhotos });
  }

  async function handleDeletePhoto(id: string, photos: string[], index: number) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    const newPhotos = photos.filter((_, i) => i !== index);
    await handleAction(id, "updatePhotos", { photos: newPhotos });
  }

  async function downloadPhoto(url: string, filename: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, "_blank");
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: removeId }),
      });
      if (!res.ok) {
        setError(t("removeFailed"));
      } else {
        await checkAuthAndLoad();
      }
    } catch (err) {
      console.error(err);
      setError(t("networkError"));
    } finally {
      setRemoveId(null);
    }
  }

  if (!loggedIn) {
    return (
      <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-xl mx-auto flex items-center justify-center">
        <div className="w-full">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 text-white text-center drop-shadow-md">
            {t("loginTitle")}
          </h1>
          <form
            onSubmit={handleLogin}
            className="flex flex-col gap-4 sm:gap-6 bg-[#111]/80 p-8 border border-gray-600 shadow-2xl backdrop-blur-md"
          >
            <div className="flex flex-col gap-2">
              <label className="text-white font-bold tracking-wide">
                {t("username")}
              </label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder={t("username")}
                required
                className="p-3 sm:p-4 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-bold tracking-wide">
                {t("password")}
              </label>
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={t("password")}
                type="password"
                required
                className="p-3 sm:p-4 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
            <button className="px-6 py-3 bg-white text-black font-bold text-lg tracking-widest uppercase hover:bg-gray-200 hover:shadow-xl transition-all duration-200 mt-2">
              {t("login")}
            </button>
            {error && (
              <div className="text-red-400 p-3 border border-red-500/50 bg-red-900/20 text-center text-sm font-bold">
                {error}
              </div>
            )}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("registrations")}{" "}
          <span className="text-gray-400 text-2xl ml-2">({regs.length})</span>
        </h1>
      </div>

      {loading && (
        <div className="text-white mb-6 text-center font-bold animate-pulse">
          {t("loading")}
        </div>
      )}
      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {regs.map((r) => (
          <div
            key={r.id}
            className="relative bg-[#111]/90 border border-gray-700 hover:border-gray-500 transition-all duration-300 shadow-xl overflow-hidden rounded-sm group"
          >
            {/* Header / Status Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-gray-700">
              <div className="flex items-center gap-6 sm:gap-8">
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => handleAction(r.id, "reorder", { direction: "up" })}
                    className="p-1 hover:bg-white/10 rounded-smtransition-colors cursor-pointer"
                    title="Move Up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button 
                    onClick={() => handleAction(r.id, "reorder", { direction: "down" })}
                    className="p-1 hover:bg-white/10 rounded-smtransition-colors cursor-pointer"
                    title="Move Down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">
                    {t("status")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
                      r.status === "accepted"
                        ? "text-green-400"
                        : r.status === "declined"
                        ? "text-red-400"
                        : "text-orange-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        r.status === "accepted"
                          ? "bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                          : r.status === "declined"
                          ? "bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                          : "bg-orange-500 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                      }`}
                    ></span>
                    {r.status === "accepted"
                      ? t("statusAccepted")
                      : r.status === "declined"
                      ? t("statusDeclined")
                      : t("statusPending")}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">
                    {t("payment")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
                        r.paymentStatus === "paid"
                          ? "text-green-400"
                          : "text-orange-400"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          r.paymentStatus === "paid"
                            ? "bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                            : "bg-orange-500 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
                        }`}
                      ></span>
                      {r.paymentStatus === "paid"
                        ? t("paymentPaid")
                        : t("paymentPending")}
                    </span>
                    <button
                      onClick={() =>
                        handleAction(r.id, "updatePaymentStatus", {
                          paymentStatus:
                            r.paymentStatus === "paid" ? "pending" : "paid",
                        })
                      }
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-sm cursor-pointer text-gray-400 hover:text-white"
                      title="Toggle Payment Status"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col hidden sm:flex">
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">
                    {t("id")}
                  </span>
                  <span className="text-sm font-mono text-white/70">
                    #{r.id.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1 block">
                  {t("created")}
                </span>
                <span className="text-sm font-mono text-gray-300">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Photos (Gallery Grid) */}
              <div className="lg:col-span-6 xl:col-span-5">
                <div className="grid grid-cols-2 gap-3 h-full content-start">
                  {r.photos && r.photos.length > 0 && r.photos.map((p, i) => (
                    <div key={i} className="relative aspect-[4/3] group/photo border border-gray-700 hover:border-white transition-all overflow-hidden bg-black rounded-sm shadow-md">
                      <Image
                        src={getThumbnailUrl(p)}
                        alt={`Vehicle photo ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover/photo:scale-105"
                      />
                      
                      {/* Photo Reorder Controls (Always Visible on Hover) */}
                      <div className="absolute top-2 left-2 flex gap-1 z-10 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorderPhoto(r.id, r.photos || [], i, 'prev'); }}
                          disabled={i === 0}
                          className="p-1 bg-black/50 hover:bg-black/80 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Previous"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorderPhoto(r.id, r.photos || [], i, 'next'); }}
                          disabled={i === (r.photos?.length || 0) - 1}
                          className="p-1 bg-black/50 hover:bg-black/80 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Next"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>

                      {/* Photo Actions Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                          <button 
                            onClick={() => openGallery(r.photos || [], i)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer border border-white/20 backdrop-blur-sm"
                            title="View"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => downloadPhoto(p, `registration_${r.id}_photo_${i+1}.jpg`)}
                              className="p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full text-white transition-colors cursor-pointer border border-blue-400"
                              title="Download"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <label 
                              className="p-2 bg-green-600/80 hover:bg-green-600 rounded-full text-white transition-colors cursor-pointer border border-green-400"
                              title="Replace"
                            >
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handlePhotoUpload(r.id, i, r.photos || [], e.target.files[0]);
                                  }
                                }}
                              />
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </label>
                            <button 
                               onClick={() => handleDeletePhoto(r.id, r.photos || [], i)}
                               className="p-2 bg-red-600/80 hover:bg-red-600 rounded-full text-white transition-colors cursor-pointer border border-red-400"
                               title="Delete"
                             >
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add New Photo Card */}
                  <label className="relative aspect-[4/3] border-2 border-dashed border-gray-700 hover:border-gray-400 hover:bg-white/5 transition-all cursor-pointer rounded-sm flex flex-col items-center justify-center gap-2 group/add">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleAddPhoto(r.id, r.photos || [], e.target.files[0]);
                        }
                      }}
                    />
                    <div className="p-3 bg-gray-800 rounded-full group-hover/add:bg-gray-700 transition-colors">
                      <svg className="w-6 h-6 text-gray-400 group-hover/add:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover/add:text-gray-300">{t("addPhoto")}</span>
                  </label>
                </div>
              </div>

              {/* Middle Column: Info & Details */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-6 border-b border-gray-800 pb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-1">
                        {r.firstName} {r.lastName}
                      </h2>
                      <a
                        href={`mailto:${r.email}`}
                        className="text-gray-400 hover:text-white transition-colors text-sm font-mono flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {r.email}
                      </a>
                    </div>
                    {r.instagram && (
                      <a
                        href={`https://instagram.com/${r.instagram.replace(
                          "@",
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-white bg-gradient-to-tr from-purple-600 to-pink-600 px-4 py-2 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-pink-500/20 transition-all transform hover:-translate-y-0.5"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        @{r.instagram.replace("@", "")}
                      </a>
                    )}
                  </div>

                  <div className="bg-white/5 p-4 rounded-smborder border-gray-700 mb-6 group/desc relative">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        {t("vehicleDetails")}
                      </h3>
                      {!editingDescriptionId && (
                        <button
                          onClick={() => {
                            setEditingDescriptionId(r.id);
                            setTempDescription(r.description);
                          }}
                          className="opacity-0 group-hover/desc:opacity-100 transition-opacity text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xl text-white mb-2">
                      <span className="font-bold">
                        {r.brand} {r.model}
                      </span>
                      <span className="text-gray-500">|</span>
                      <span className="font-mono text-gray-300">{r.year}</span>
                    </div>
                    {editingDescriptionId === r.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          className="w-full bg-black/20 border border-gray-600 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none min-h-[100px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingDescriptionId(null)}
                            className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveDescription(r.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                        {r.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleAction(r.id, "accept")}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider text-xs rounded-smshadow-lg hover:shadow-green-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("accept")}
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "decline")}
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider text-xs rounded-sm shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    {t("decline")}
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "pending")}
                    className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-bold uppercase tracking-wider text-xs rounded-sm shadow-lg hover:shadow-gray-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                    {t("revert")}
                  </button>
                  <div className="w-px h-8 bg-gray-700 mx-2 hidden sm:block"></div>
                  <button
                    onClick={() => setRemoveId(r.id)}
                    className="px-6 py-2.5 bg-transparent hover:bg-red-900/30 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-xs border border-red-900/50 hover:border-red-500 rounded-smtransition-all flex items-center gap-2 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Remove Confirmation Modal */}
      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full relative shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {t("remove")}
            </h3>
            <p className="text-gray-300 mb-8 text-center font-medium">
              {t("confirmRemove")}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setRemoveId(null)}
                className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 px-4 py-3 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer"
              >
                {t("remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery modal */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={closeGallery}
        >
          <button
            onClick={closeGallery}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 text-white bg-black/50 hover:bg-white hover:text-black rounded-full p-2 border-2 border-white transition-all duration-200"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div
            className="relative w-full h-full p-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-7xl max-h-[90vh]">
              <Image
                src={getFullUrl(galleryPhotos[galleryIndex])}
                alt={`gallery-${galleryIndex}`}
                fill
                className="object-contain"
                sizes="100vw"
                quality={90}
                priority
              />
            </div>

            {galleryPhotos.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:scale-110 transition-transform p-2"
                  aria-label="Previous"
                >
                  <svg
                    className="w-10 h-10 drop-shadow-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:scale-110 transition-transform p-2"
                  aria-label="Next"
                >
                  <svg
                    className="w-10 h-10 drop-shadow-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-mono bg-black/50 px-4 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                  {galleryIndex + 1} / {galleryPhotos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
