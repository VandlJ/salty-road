"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import AdminPhotoGalleryManager from "@/components/admin-photo-gallery-manager";
import Skeleton from "@/components/skeleton";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function AdminGalleryPage() {
  const t = useTranslations("AdminGalleryPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setPhotos(Array.isArray(json.photos) ? json.photos : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (loggedIn) {
      // Auth just became true — setState happens after the fetch resolves,
      // not synchronously in the effect body.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPhotos();
    }
  }, [loggedIn, loadPhotos]);

  // AdminPhotoGalleryManager has already applied the change to its own
  // optimistic mirror by the time this runs; persisting is all that's left.
  async function savePhotos(next: string[]) {
    setPhotos(next);
    setError(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      console.error(err);
      setError(t("errorSave"));
      loadPhotos(); // revert to server state
    }
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("title")} <span className="text-gray-400 text-2xl ml-2">({photos.length})</span>
        </h1>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-600 text-gray-300 font-bold uppercase tracking-wider text-sm hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          {t("backToAdmin")}
        </Link>
      </div>

      <p className="text-gray-400 text-sm mb-6">{t("hint")}</p>

      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}

      {loading && photos.length === 0 ? (
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-sm" />
          ))}
        </div>
      ) : (
        <AdminPhotoGalleryManager
          photos={photos}
          onChange={savePhotos}
          folder="gallery"
          uploadLabel={t("uploadPhotos")}
          uploadingLabel={t("uploading")}
        />
      )}
    </section>
  );
}
