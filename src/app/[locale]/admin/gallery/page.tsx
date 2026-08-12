"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";
import AdminEventGalleryManager from "@/components/admin-event-gallery-manager";
import Skeleton from "@/components/skeleton";
import { useAdminAuth } from "@/lib/useAdminAuth";
import type { GalleryPhoto } from "@/lib/gallery";
import AdminPageHeader from "@/components/admin-page-header";
import AdminGate from "@/components/admin-gate";

export default function AdminGalleryPage() {
  const t = useTranslations("AdminGalleryPage");
  const auth = useAdminAuth();
  const { loggedIn } = auth;
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  // Which edition these photos belong to — the label used to be a hard-coded
  // "Volume 1" string in messages/*.json.
  const [editionName, setEditionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setPhotos(Array.isArray(json.photos) ? json.photos : []);
      setEditionName(typeof json.editionName === "string" ? json.editionName : null);
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

  // AdminEventGalleryManager has already applied the change to its own
  // optimistic mirror by the time this runs; persisting is all that's left.
  async function savePhotos(next: GalleryPhoto[]) {
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

  return (
    <AdminGate auth={auth}>
      <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-4xl mx-auto">
        <AdminPageHeader
          title={t("title")}
          count={photos.length}
          eyebrow={editionName ?? undefined}
          subtitle={t("hint")}
        />

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
          <AdminEventGalleryManager
            photos={photos}
            onChange={savePhotos}
            uploadLabel={t("uploadPhotos")}
            uploadingLabel={t("uploading")}
          />
        )}
      </section>
    </AdminGate>
  );
}
