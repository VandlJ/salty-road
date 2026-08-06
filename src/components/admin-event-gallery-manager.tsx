"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useMotionValue, animate, type PanInfo } from "motion/react";
import imageCompression from "browser-image-compression";
import PhotoGallery from "@/components/photo-gallery";
import { AnimatedModal } from "@/components/animated-modal";
import { useModalA11y } from "@/lib/useModalA11y";
import type { GalleryPhoto } from "@/lib/galleryPhoto";

type UploadItem = {
  id: number;
  name: string;
  status: "pending" | "uploading" | "error";
  message?: string;
};

const TILE_CLASS = "w-20 h-20 sm:w-24 sm:h-24";

// Event-gallery-specific sibling of AdminPhotoGalleryManager (which stays
// string[]-only for merch product/variant photos). This one carries a
// per-photo Instagram credit — the whole reason it's a separate component
// rather than a generalized prop on the shared one, which had no reason to
// grow a merch-irrelevant concept.
export default function AdminEventGalleryManager({
  photos,
  onChange,
  uploadingLabel,
  uploadLabel,
}: {
  photos: GalleryPhoto[];
  onChange: (photos: GalleryPhoto[]) => Promise<void> | void;
  uploadingLabel: string;
  uploadLabel: string;
}) {
  // Mirrors `photos` but updates instantly on reorder/delete/tag instead of
  // waiting for the PUT round-trip — the request that actually persists it
  // still fires (via `onChange`), this is purely so the UI doesn't feel like
  // the click did nothing for the ~1s the request takes.
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

  // Drag-to-reorder: itemRefs backs the "which tile is under the pointer"
  // hit-test, orderRef mirrors localPhotos so the rapid-fire onDrag
  // callback always reorders off the latest array instead of a stale
  // closure from when the drag started.
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const orderRef = useRef(localPhotos);
  useEffect(() => {
    orderRef.current = localPhotos;
  }, [localPhotos]);
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null);
  const dragStartOrderRef = useRef<GalleryPhoto[] | null>(null);

  const [confirmMode, setConfirmMode] = useState<"selected" | "all" | null>(null);
  const closeConfirm = () => setConfirmMode(null);
  const confirmModalRef = useModalA11y<HTMLDivElement>(confirmMode !== null, closeConfirm);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const closeTagModal = () => setTagModalOpen(false);
  const tagModalRef = useModalA11y<HTMLDivElement>(tagModalOpen, closeTagModal);

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
        formData.append("folder", "gallery");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error || `Upload failed (${res.status})`);
        }
        current = [...current, { url: json.url as string, instagram: null }];
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

  async function persist(next: GalleryPhoto[]) {
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
    const url = localPhotos[index].url;
    await persist(localPhotos.filter((_, i) => i !== index));
    setSelected((prev) => {
      if (!prev.has(url)) return prev;
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }

  function handleDragStart(url: string) {
    dragStartOrderRef.current = orderRef.current;
    setDraggingUrl(url);
  }

  // Fires continuously while a tile is dragged. Live-reorders localPhotos
  // (optimistic only, not persisted yet) once the pointer is actually over
  // a different tile — a plain rect hit-test, not nearest-center distance.
  // On a wrapping flex grid, distance-based nearest-neighbor picks the
  // wrong tile near row boundaries (a tile in the row below can be closer
  // than the real target in the same row), which is what made the swap
  // feel like it wasn't snapping into the grid correctly.
  function handleDragMove(url: string, point: { x: number; y: number }) {
    const current = orderRef.current;
    const fromIndex = current.findIndex((p) => p.url === url);
    if (fromIndex === -1) return;
    const toIndex = current.findIndex((p) => {
      if (p.url === url) return false;
      const rect = itemRefs.current.get(p.url)?.getBoundingClientRect();
      if (!rect) return false;
      return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    });
    if (toIndex !== -1 && toIndex !== fromIndex) {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      orderRef.current = next;
      setLocalPhotos(next);
    }
  }

  async function handleDragEnd() {
    setDraggingUrl(null);
    const startOrder = dragStartOrderRef.current;
    dragStartOrderRef.current = null;
    const changed = startOrder?.some((p, i) => p.url !== orderRef.current[i]?.url);
    if (changed) await persist(orderRef.current);
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
      await persist(localPhotos.filter((p) => !selected.has(p.url)));
      setSelected(new Set());
    }
  }

  function openTagModal() {
    // Pre-fill with the existing tag only if every selected photo already
    // shares the exact same one — otherwise start blank rather than picking
    // one arbitrarily and looking like it applies to all of them already.
    const tags = new Set(localPhotos.filter((p) => selected.has(p.url)).map((p) => p.instagram ?? ""));
    setTagInput(tags.size === 1 ? [...tags][0] : "");
    setTagModalOpen(true);
  }

  async function applyTag() {
    const value = tagInput.trim() || null;
    const next = localPhotos.map((p) => (selected.has(p.url) ? { ...p, instagram: value } : p));
    setTagModalOpen(false);
    await persist(next);
  }

  const allSelected = localPhotos.length > 0 && selected.size === localPhotos.length;

  return (
    <div className="flex flex-col gap-3">
      {localPhotos.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(localPhotos.map((p) => p.url)))}
            disabled={busy}
            className="text-gray-400 hover:text-white font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? "Zrušit výběr" : "Vybrat vše"}
          </button>
          {selected.size > 0 && (
            <>
              <button
                type="button"
                onClick={openTagModal}
                disabled={busy}
                className="text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Přidat Instagram ({selected.size})
              </button>
              <button
                type="button"
                onClick={() => setConfirmMode("selected")}
                disabled={busy}
                className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Smazat vybrané ({selected.size})
              </button>
            </>
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
        <div className={`flex flex-wrap gap-x-6 gap-y-3 transition-opacity duration-150 ${saving ? "opacity-60" : ""}`}>
          {localPhotos.map((photo, i) => (
            <GalleryTile
              key={photo.url}
              photo={photo}
              isSelected={selected.has(photo.url)}
              isDragging={draggingUrl === photo.url}
              busy={busy}
              onPreview={() => setPreviewIndex(i)}
              onToggleSelect={() => toggleSelected(photo.url)}
              onRemove={() => remove(i)}
              registerRef={(el) => {
                if (el) itemRefs.current.set(photo.url, el);
                else itemRefs.current.delete(photo.url);
              }}
              onDragStart={() => handleDragStart(photo.url)}
              onDragMove={(point) => handleDragMove(photo.url, point)}
              onDragEnd={handleDragEnd}
            />
          ))}

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
          photos={localPhotos.map((p) => p.url)}
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

      <AnimatedModal
        open={tagModalOpen}
        panelRef={tagModalRef}
        labelledBy="tag-instagram-title"
        panelClassName="bg-[#111] border-2 border-blue-600 p-8 max-w-md w-full shadow-[0_0_20px_rgba(37,99,235,0.3)]"
      >
        <h3 id="tag-instagram-title" className="text-white font-bold mb-2 text-center">
          Instagram pro {selected.size} {selected.size === 1 ? "fotku" : "fotky"}
        </h3>
        <p className="text-gray-400 text-xs mb-4 text-center">
          Handle, @handle nebo celá URL — hodí se pro dávku fotek od stejného fotografa.
        </p>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="@fotograf"
          autoFocus
          className="w-full p-3 mb-6 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
        <div className="flex gap-4">
          <button
            onClick={closeTagModal}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            Zrušit
          </button>
          <button
            onClick={applyTag}
            className="flex-1 px-4 py-3 bg-blue-600 border border-blue-500 text-white font-bold uppercase tracking-wider hover:bg-blue-500 transition-all cursor-pointer"
          >
            Uložit
          </button>
        </div>
      </AnimatedModal>
    </div>
  );
}

// A single tile in the grid: drag is bound to the grip handle only
// (`dragListener={false}` + `dragControls.start()` on the handle's
// pointerdown), so the preview/select/delete buttons keep working as
// plain clicks and never race against a drag gesture starting on them.
function GalleryTile({
  photo,
  isSelected,
  isDragging,
  busy,
  onPreview,
  onToggleSelect,
  onRemove,
  registerRef,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  photo: GalleryPhoto;
  isSelected: boolean;
  isDragging: boolean;
  busy: boolean;
  onPreview: () => void;
  onToggleSelect: () => void;
  onRemove: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
  onDragStart: () => void;
  onDragMove: (point: { x: number; y: number }) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  // Bound explicitly via style={{x, y}} rather than left as Framer's
  // internal (hidden) drag motion values — that's what lets us reset them
  // to 0 on drop below. Without this, the tile keeps whatever transform
  // offset it had when the pointer lifted forever, since the array reorder
  // already moved its natural DOM slot underneath it; the two together is
  // what produced the "tile stuck floating, hole left in the grid" bug.
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  return (
    <motion.div
      ref={registerRef}
      layout="position"
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      style={{ x, y }}
      onDragStart={onDragStart}
      onDrag={(_, info: PanInfo) => onDragMove({ x: info.point.x, y: info.point.y })}
      onDragEnd={() => {
        animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
        animate(y, 0, { type: "spring", stiffness: 500, damping: 40 });
        onDragEnd();
      }}
      whileDrag={{ scale: 1.08, boxShadow: "0 12px 28px rgba(0,0,0,0.6)" }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 40 } }}
      className={`relative w-20 sm:w-24 shrink-0 select-none ${isDragging ? "z-50" : ""}`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onPreview}
          aria-label="Zobrazit fotku"
          className={`relative ${TILE_CLASS} block bg-white rounded-sm overflow-hidden border-2 transition-colors cursor-pointer ${
            isSelected ? "border-blue-600" : "border-gray-700 hover:border-white"
          }`}
        >
          <Image src={photo.url} alt="" fill draggable={false} className="object-contain p-1.5" sizes="96px" />
        </button>

        {photo.instagram && (
          <span
            title={`Instagram: ${photo.instagram}`}
            className="absolute bottom-1 right-1 w-5 h-5 flex items-center justify-center bg-black/80 border border-white/30 text-white rounded-full"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleSelect}
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
        onClick={onRemove}
        disabled={busy}
        aria-label="Odstranit fotku"
        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ×
      </button>

      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          dragControls.start(e);
        }}
        aria-hidden="true"
        style={{ touchAction: "none" }}
        className="mt-1 h-9 flex items-center justify-center gap-1 bg-gray-800 border border-gray-600 rounded-sm cursor-grab active:cursor-grabbing active:bg-gray-700 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-current" />
        ))}
      </div>
    </motion.div>
  );
}
