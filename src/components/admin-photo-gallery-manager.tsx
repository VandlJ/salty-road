"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import PhotoGallery from "@/components/photo-gallery";
import { AnimatedModal } from "@/components/animated-modal";
import { useModalA11y } from "@/lib/useModalA11y";

type UploadItem = {
  id: number;
  name: string;
  status: "pending" | "uploading" | "error";
  message?: string;
};

const TILE_CLASS = "w-20 h-20 sm:w-24 sm:h-24";

// Admin-only multi-photo manager: upload (multiple at once), reorder via
// left/right buttons, delete (single, multi-select, or all), click a
// thumbnail to view it full-size. No drag-and-drop library — this project
// doesn't have one installed, and left/right buttons cover the "reorder"
// need without adding a dependency for what's an infrequent admin action.
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
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const busy = uploading || saving;
  const nextUploadId = useRef(0);

  const [confirmMode, setConfirmMode] = useState<"selected" | "all" | null>(null);
  const closeConfirm = () => setConfirmMode(null);
  const confirmModalRef = useModalA11y<HTMLDivElement>(confirmMode !== null, closeConfirm);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    const items: UploadItem[] = files.map((f) => ({ id: nextUploadId.current++, name: f.name, status: "pending" }));
    setUploadQueue((q) => [...q, ...items]);

    // Sequential, not Promise.all — each successful upload is persisted
    // immediately (one photo at a time) instead of only saving once the
    // whole batch finishes. With 20-30 files that matters twice over: the
    // admin sees each one land instead of a single spinner with no
    // feedback for a minute-plus, and a failure partway through (a bad
    // file, a transient network blip) doesn't lose every upload that
    // already succeeded. `current` (not React state) tracks the running
    // list between iterations — reading `localPhotos` here would race, since
    // state updates from the previous iteration aren't guaranteed to have
    // committed yet.
    let current = localPhotos;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = items[i].id;
      setUploadQueue((q) => q.map((item) => (item.id === itemId ? { ...item, status: "uploading" } : item)));
      try {
        // Vercel's Serverless Functions reject request bodies over ~4.5MB
        // outright (413, before our own MAX_FILE_BYTES check in /api/upload
        // ever runs) — a phone/camera JPEG routinely exceeds that. Same fix
        // as registerForm.tsx's registration-photo upload.
        let fileToUpload: File | Blob = file;
        try {
          if (file.type.startsWith("image/")) {
            fileToUpload = await imageCompression(file, {
              maxSizeMB: 4,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          }
        } catch (compressionError) {
          console.warn("Image compression failed, uploading original:", compressionError);
        }

        const formData = new FormData();
        formData.append("file", fileToUpload, file.name);
        formData.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error || `Upload failed (${res.status})`);
        }
        current = [...current, json.url as string];
        setLocalPhotos(current);
        await onChange(current);
        // Done — the photo is now in localPhotos itself, so the queue entry
        // (a skeleton tile) is removed rather than switched to a third
        // "done" visual state.
        setUploadQueue((q) => q.filter((item) => item.id !== itemId));
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadQueue((q) => q.map((item) => (item.id === itemId ? { ...item, status: "error", message } : item)));
      }
    }

    setUploading(false);
    e.target.value = "";
  }

  function dismissUploadError(id: number) {
    setUploadQueue((q) => q.filter((item) => item.id !== id));
  }

  async function persist(next: string[]) {
    setLocalPhotos(next);
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  }

  async function remove(index: number) {
    if (busy) return;
    const url = localPhotos[index];
    await persist(localPhotos.filter((_, i) => i !== index));
    setSelected((prev) => {
      if (!prev.has(url)) return prev;
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }

  async function move(index: number, dir: -1 | 1) {
    if (busy) return;
    const target = index + dir;
    if (target < 0 || target >= localPhotos.length) return;
    const next = [...localPhotos];
    [next[index], next[target]] = [next[target], next[index]];
    await persist(next);
  }

  function toggleSelected(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function confirmDelete() {
    const mode = confirmMode;
    setConfirmMode(null);
    if (mode === "all") {
      await persist([]);
      setSelected(new Set());
    } else if (mode === "selected") {
      await persist(localPhotos.filter((url) => !selected.has(url)));
      setSelected(new Set());
    }
  }

  const allSelected = localPhotos.length > 0 && selected.size === localPhotos.length;

  return (
    <div className="flex flex-col gap-3">
      {localPhotos.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(localPhotos))}
            disabled={busy}
            className="text-gray-400 hover:text-white font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? "Zrušit výběr" : "Vybrat vše"}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setConfirmMode("selected")}
              disabled={busy}
              className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Smazat vybrané ({selected.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmMode("all")}
            disabled={busy}
            className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Smazat vše
          </button>
        </div>
      )}

      {(localPhotos.length > 0 || uploadQueue.length > 0) && (
        <div className={`flex flex-wrap gap-3 transition-opacity duration-150 ${saving ? "opacity-60" : ""}`}>
          {localPhotos.map((url, i) => {
            const isSelected = selected.has(url);
            return (
              <div key={url} className="relative w-20 sm:w-24 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  aria-label="Zobrazit fotku"
                  className={`relative ${TILE_CLASS} block bg-white rounded-sm overflow-hidden border-2 transition-colors cursor-pointer ${
                    isSelected ? "border-blue-600" : "border-gray-700 hover:border-white"
                  }`}
                >
                  <Image src={url} alt="" fill className="object-contain p-1.5" sizes="96px" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleSelected(url)}
                  disabled={busy}
                  aria-label={isSelected ? "Zrušit výběr fotky" : "Vybrat fotku"}
                  aria-pressed={isSelected}
                  className={`absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed border-2 ${
                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-[#111] border-gray-600 text-transparent hover:border-white"
                  }`}
                >
                  ✓
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
            );
          })}

          {/* Upload placeholders live in the same grid as the real
              thumbnails (not a separate list below) — each one sits exactly
              where its photo will land once the upload finishes, instead of
              a growing status list the finished photos then jump past. */}
          {uploadQueue.map((item) => (
            <div key={item.id} className="relative w-20 sm:w-24 shrink-0">
              <div
                title={item.status === "error" ? item.message : item.name}
                className={`${TILE_CLASS} rounded-sm border-2 flex items-center justify-center ${
                  item.status === "error"
                    ? "border-red-600 bg-red-900/20"
                    : "border-gray-700 bg-white/5 animate-pulse"
                }`}
              >
                {item.status === "error" ? (
                  <span className="text-red-400 text-2xl font-bold">!</span>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
              </div>
              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => dismissUploadError(item.id)}
                  aria-label="Skrýt chybu nahrávání"
                  className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold cursor-pointer transition-colors shadow-md"
                >
                  ×
                </button>
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

      {previewIndex !== null && (
        <PhotoGallery
          photos={localPhotos}
          initialIndex={previewIndex}
          label="Náhled fotky"
          onClose={() => setPreviewIndex(null)}
        />
      )}

      <AnimatedModal
        open={confirmMode !== null}
        panelRef={confirmModalRef}
        labelledBy="confirm-delete-photos"
        panelClassName="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <p id="confirm-delete-photos" className="text-gray-300 mb-8 text-center font-medium">
          {confirmMode === "all"
            ? `Opravdu smazat všech ${localPhotos.length} fotek?`
            : `Opravdu smazat ${selected.size} vybraných fotek?`}
        </p>
        <div className="flex gap-4">
          <button
            onClick={closeConfirm}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            Zrušit
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 px-4 py-3 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-500 transition-all cursor-pointer"
          >
            Smazat
          </button>
        </div>
      </AnimatedModal>
    </div>
  );
}
