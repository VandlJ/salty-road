"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import PhotoGallery from "@/components/photo-gallery";

// Admin-only multi-photo manager: upload (multiple at once), reorder via
// left/right buttons, delete, click a thumbnail to view it full-size. No
// drag-and-drop library — this project doesn't have one installed, and
// left/right buttons cover the "reorder" need without adding a dependency
// for what's an infrequent admin action.
export default function AdminPhotoGalleryManager({
  photos,
  onChange,
  uploadingLabel,
  uploadLabel,
  folder = "merch",
}: {
  photos: string[];
  onChange: (photos: string[]) => Promise<void> | void;
  uploadingLabel: string;
  uploadLabel: string;
  /** Blob storage folder — must be in ALLOWED_FOLDERS in /api/upload. */
  folder?: "merch" | "gallery";
}) {
  // Mirrors `photos` but updates instantly on reorder/delete instead of
  // waiting for the PATCH round-trip — the request that actually persists
  // it still fires (via `onChange`), this is purely so the UI doesn't feel
  // like the click did nothing for the ~1s the request takes.
  const [localPhotos, setLocalPhotos] = useState(photos);
  // Re-syncs the optimistic local mirror whenever the persisted prop
  // changes (e.g. after the parent reloads), not a render-cascade loop.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLocalPhotos(photos), [photos]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const busy = uploading || saving;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const blob = await res.json();
        uploaded.push(blob.url);
      }
      const next = [...localPhotos, ...uploaded];
      setLocalPhotos(next);
      await onChange(next);
    } catch (err) {
      console.error(err);
      setError("!");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(index: number) {
    if (busy) return;
    const next = localPhotos.filter((_, i) => i !== index);
    setLocalPhotos(next);
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (busy) return;
    const target = index + dir;
    if (target < 0 || target >= localPhotos.length) return;
    const next = [...localPhotos];
    [next[index], next[target]] = [next[target], next[index]];
    setLocalPhotos(next);
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {localPhotos.length > 0 && (
        <div className={`flex flex-wrap gap-3 transition-opacity duration-150 ${saving ? "opacity-60" : ""}`}>
          {localPhotos.map((url, i) => (
            <div key={url} className="relative w-20 sm:w-24 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                aria-label="Zobrazit fotku"
                className="relative w-20 h-20 sm:w-24 sm:h-24 block bg-white rounded-sm overflow-hidden border border-gray-700 hover:border-white transition-colors cursor-pointer"
              >
                <Image src={url} alt="" fill className="object-contain p-1.5" sizes="96px" />
              </button>

              <button
                type="button"
                onClick={() => remove(i)}
                disabled={busy}
                aria-label="Odstranit fotku"
                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ×
              </button>

              {localPhotos.length > 1 && (
              <div className="flex mt-1 gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label="Posunout doleva"
                  className="flex-1 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={busy || i === localPhotos.length - 1}
                  aria-label="Posunout doprava"
                  className="flex-1 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className={`self-start text-xs text-white bg-[#111] border border-white/50 px-3 py-2 rounded-sm transition-colors ${busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white hover:text-black"}`}>
          {uploading ? uploadingLabel : uploadLabel}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="sr-only"
            disabled={busy}
          />
        </label>

        {saving && (
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
          />
        )}
      </div>

      {error && <span className="text-red-400 text-xs font-bold">{error}</span>}

      {previewIndex !== null && (
        <PhotoGallery
          photos={localPhotos}
          initialIndex={previewIndex}
          label="Náhled fotky"
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}
