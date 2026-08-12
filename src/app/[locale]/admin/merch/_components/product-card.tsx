"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useCallback, useState } from "react";

import AdminPhotoGalleryManager from "@/components/admin-photo-gallery-manager";
import PhotoGallery from "@/components/photo-gallery";

import { useModalA11y } from "@/lib/useModalA11y";
import { AnimatedModal } from "@/components/animated-modal";

import { motion } from "motion/react";
import type { MerchProductAdmin } from "@/types/merch";

import { groupVariantsByColor, type Translate } from "./shared";
import { CategorySelect } from "./category-select";
import { ColorGroupSection } from "./color-group-section";
import { AddVariantForm } from "./add-variant-form";

export function ProductCard({
  product,
  t,
  onChange,
  onMove,
  canMoveUp,
  canMoveDown,
  moving,
}: {
  product: MerchProductAdmin;
  t: Translate;
  onChange: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [savingFields, setSavingFields] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeConfirm = useCallback(() => setConfirmDelete(false), []);
  const confirmModalRef = useModalA11y<HTMLDivElement>(confirmDelete, closeConfirm);
  const [previewSizeChart, setPreviewSizeChart] = useState(false);

  const dirty = name !== product.name || description !== product.description || category !== product.category;

  async function saveFields() {
    setSavingFields(true);
    try {
      await fetch(`/api/admin/merch/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category }),
      });
      onChange();
    } finally {
      setSavingFields(false);
    }
  }

  async function toggleActive() {
    await fetch(`/api/admin/merch/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    onChange();
  }

  type SaleMode = "product" | "gift" | "both";
  const saleMode: SaleMode = product.giftEligible
    ? product.sellable
      ? "both"
      : "gift"
    : "product";

  async function setSaleMode(mode: SaleMode) {
    if (mode === saleMode) return;
    await fetch(`/api/admin/merch/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellable: mode !== "gift",
        giftEligible: mode !== "product",
      }),
    });
    onChange();
  }

  async function setPhotoMode(mode: "shared" | "per_variant") {
    if (mode === product.photoMode) return;
    await fetch(`/api/admin/merch/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoMode: mode }),
    });
    onChange();
  }

  async function setPhotos(photos: string[]) {
    await fetch(`/api/admin/merch/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos }),
    });
    onChange();
  }

  const [movingVariant, setMovingVariant] = useState(false);

  // Variants group by color; `order` is shared across every variant in a
  // color group (sizes within a group always sort automatically instead,
  // see compareBySize) — so "moving a variant" now means swapping two whole
  // color groups' `order` values, not repositioning one row.
  async function moveColorGroup(groupIndex: number, dir: -1 | 1) {
    const groups = groupVariantsByColor(product.variants);
    const targetIndex = groupIndex + dir;
    if (targetIndex < 0 || targetIndex >= groups.length || movingVariant) return;
    const a = groups[groupIndex];
    const b = groups[targetIndex];
    setMovingVariant(true);
    try {
      await Promise.all([
        ...a.variants.map((v) =>
          fetch(`/api/admin/merch/variants/${v.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: b.order }),
          })
        ),
        ...b.variants.map((v) =>
          fetch(`/api/admin/merch/variants/${v.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: a.order }),
          })
        ),
      ]);
      onChange();
    } finally {
      setMovingVariant(false);
    }
  }

  async function uploadSizeChart(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "merch");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const blob = await res.json();
      await fetch(`/api/admin/merch/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeChartImage: blob.url }),
      });
      onChange();
    }
    e.target.value = "";
  }

  async function removeSizeChart() {
    await fetch(`/api/admin/merch/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeChartImage: null }),
    });
    onChange();
  }

  async function deleteProduct() {
    await fetch(`/api/admin/merch/products/${product.id}`, { method: "DELETE" });
    setConfirmDelete(false);
    onChange();
  }

  return (
    <div className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-4 bg-white/5 border-b border-gray-700 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center justify-between gap-3 lg:flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono">{product.slug}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={moving || !canMoveUp}
                aria-label={t("moveProductUp")}
                className="w-6 h-6 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-sm font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={moving || !canMoveDown}
                aria-label={t("moveProductDown")}
                className="w-6 h-6 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-sm font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ▼
              </button>
            </div>

            <div className="h-4 w-px bg-gray-700" />

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                onClick={toggleActive}
                role="switch"
                aria-checked={product.active}
                aria-label={product.active ? t("active") : t("inactive")}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  product.active ? "bg-green-600" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    product.active ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                {product.active ? t("active") : t("inactive")}
              </span>
            </label>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 text-gray-500 hover:text-red-400 text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
            {t("delete")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:shrink-0">
          <Link
            href={`/shop/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {t("preview")}
          </Link>

          <div className="h-4 w-px bg-gray-700" />

          <div className="relative flex items-center rounded-sm border border-gray-600 overflow-hidden text-[10px] uppercase tracking-widest font-bold">
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 bg-brand"
              animate={{ x: `${["product", "gift", "both"].indexOf(saleMode) * 100}%` }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
            {(["product", "gift", "both"] as SaleMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSaleMode(mode)}
                aria-pressed={saleMode === mode}
                className={`relative z-10 min-w-[64px] px-3 py-1.5 cursor-pointer transition-colors ${
                  saleMode === mode ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {t(mode === "product" ? "saleModeProduct" : mode === "gift" ? "saleModeGift" : "saleModeBoth")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex lg:flex-col lg:w-[360px] lg:shrink-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm font-bold"
            />
            <CategorySelect value={category} onChange={setCategory} t={t} />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={5}
            className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm resize-y lg:flex-1"
          />
        </div>
        {dirty && (
          <button
            onClick={saveFields}
            disabled={savingFields}
            className="self-start px-4 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
          >
            {t("save")}
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              {t("photosTitle")}
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 lg:inline-flex">
              <button
                type="button"
                onClick={() => setPhotoMode("shared")}
                aria-pressed={product.photoMode === "shared"}
                className={`flex-1 text-left px-4 py-2.5 rounded-sm border-2 transition-colors cursor-pointer lg:flex-none lg:w-64 ${
                  product.photoMode === "shared"
                    ? "border-white bg-white/10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-white text-sm font-bold">{t("photoModeSharedLabel")}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{t("photoModeSharedHint")}</div>
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode("per_variant")}
                aria-pressed={product.photoMode === "per_variant"}
                className={`flex-1 text-left px-4 py-2.5 rounded-sm border-2 transition-colors cursor-pointer lg:flex-none lg:w-64 ${
                  product.photoMode === "per_variant"
                    ? "border-white bg-white/10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-white text-sm font-bold">{t("photoModePerVariantLabel")}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{t("photoModePerVariantHint")}</div>
              </button>
            </div>
          </div>

          {product.photoMode === "shared" && (
            <AdminPhotoGalleryManager
              photos={product.photos}
              onChange={setPhotos}
              uploadLabel={t("uploadPhotos")}
              uploadingLabel={t("uploading")}
            />
          )}

          <div className="pt-3 border-t border-gray-800/60">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              {t("sizeChartTitle")}
            </h3>
            <p className="text-[11px] text-gray-500 mb-2">{t("sizeChartHint")}</p>
            {product.sizeChartImage ? (
              <div className="relative w-16 h-16 group">
                <button
                  type="button"
                  onClick={() => setPreviewSizeChart(true)}
                  aria-label="Zobrazit fotku"
                  className="relative w-full h-full block bg-white rounded-sm overflow-hidden border border-gray-700 hover:border-white transition-colors cursor-pointer"
                >
                  <Image src={product.sizeChartImage} alt="" fill className="object-contain p-1" sizes="64px" />
                </button>
                <button
                  type="button"
                  onClick={removeSizeChart}
                  aria-label={t("delete")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold cursor-pointer transition-colors"
                >
                  ×
                </button>
                {previewSizeChart && (
                  <PhotoGallery
                    photos={[product.sizeChartImage]}
                    label="Tabulka velikostí"
                    onClose={() => setPreviewSizeChart(false)}
                  />
                )}
              </div>
            ) : (
              <label className="self-start text-xs text-white bg-[#111] border border-white/50 px-3 py-2 rounded-sm cursor-pointer hover:bg-white hover:text-black transition-colors inline-block">
                {t("uploadImage")}
                <input type="file" accept="image/*" onChange={uploadSizeChart} className="sr-only" />
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            {t("variantsTitle")}
          </h3>
          {product.variants.length === 0 && (
            <p className="text-gray-500 text-sm italic mb-3">{t("noVariants")}</p>
          )}
          <div className="flex flex-col gap-4">
            {(() => {
              const groups = groupVariantsByColor(product.variants);
              return groups.map((group, gi) => (
                <ColorGroupSection
                  key={group.color || "_nocolor"}
                  productId={product.id}
                  group={group}
                  t={t}
                  onChange={onChange}
                  showPhotos={product.photoMode === "per_variant"}
                  onMove={(dir) => moveColorGroup(gi, dir)}
                  canMoveUp={gi > 0}
                  canMoveDown={gi < groups.length - 1}
                  moving={movingVariant}
                />
              ));
            })()}
          </div>
          <AddVariantForm productId={product.id} t={t} onCreated={onChange} />
        </div>
      </div>

      <AnimatedModal
        open={confirmDelete}
        panelRef={confirmModalRef}
        labelledBy={`delete-product-${product.id}`}
        panelClassName="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <p id={`delete-product-${product.id}`} className="text-gray-300 mb-8 text-center font-medium">
          {t("deleteProductConfirm")}
        </p>
        <div className="flex gap-4">
          <button
            onClick={closeConfirm}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            onClick={deleteProduct}
            className="flex-1 px-4 py-3 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-500 transition-all cursor-pointer"
          >
            {t("confirm")}
          </button>
        </div>
      </AnimatedModal>
    </div>
  );
}

