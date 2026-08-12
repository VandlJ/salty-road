"use client";

import { useState } from "react";

import AdminPhotoGalleryManager from "@/components/admin-photo-gallery-manager";

import type { MerchVariantAdmin } from "@/types/merch";
import { SIZE_ORDER } from "@/lib/variantLabel";
import { serverErrorToKey } from "@/lib/serverError";
import { ERROR_KEY_MAP, type Translate } from "./shared";

export function VariantRow({
  variant,
  t,
  onChange,
  showPhotos,
}: {
  variant: MerchVariantAdmin;
  t: Translate;
  onChange: () => void;
  showPhotos: boolean;
}) {
  const [size, setSize] = useState(variant.size ?? "");
  const [price, setPrice] = useState((variant.price / 100).toString());
  const [quantity, setQuantity] = useState(variant.quantity.toString());
  const [error, setError] = useState<string | null>(null);

  const dirty =
    size !== (variant.size ?? "") ||
    Number(price) * 100 !== variant.price ||
    Number(quantity) !== variant.quantity;

  async function save() {
    setError(null);
    const priceHalire = Math.round(Number(price) * 100);
    const qty = Number(quantity);
    if (!Number.isInteger(priceHalire) || priceHalire <= 0) {
      setError(t("errorInvalidPrice"));
      return;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      setError(t("errorInvalidQuantity"));
      return;
    }
    const res = await fetch(`/api/admin/merch/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: size || null, price: priceHalire, quantity: qty }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(t(serverErrorToKey(ERROR_KEY_MAP, json?.error, "errorGeneric")));
      return;
    }
    onChange();
  }

  async function toggleActive() {
    await fetch(`/api/admin/merch/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !variant.active }),
    });
    onChange();
  }

  async function deleteVariant() {
    await fetch(`/api/admin/merch/variants/${variant.id}`, { method: "DELETE" });
    onChange();
  }

  async function setImages(images: string[]) {
    await fetch(`/api/admin/merch/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
    onChange();
  }

  return (
    <div className="flex flex-col gap-2 bg-white/5 border border-gray-700 rounded-sm p-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="min-w-[100px] p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer"
        >
          <option value="" className="bg-black">{t("noSize")}</option>
          {SIZE_ORDER.map((s) => (
            <option key={s} value={s} className="bg-black">
              {s}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />

        <button
          onClick={toggleActive}
          role="switch"
          aria-checked={variant.active}
          aria-label={variant.active ? t("active") : t("inactive")}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            variant.active ? "bg-green-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              variant.active ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>

        {dirty && (
          <button
            onClick={save}
            className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer rounded-sm"
          >
            {t("save")}
          </button>
        )}

        <button
          onClick={deleteVariant}
          className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wide cursor-pointer"
        >
          {t("delete")}
        </button>
      </div>

      {showPhotos && (
        <AdminPhotoGalleryManager
          photos={variant.images}
          onChange={setImages}
          uploadLabel={t("uploadPhotos")}
          uploadingLabel={t("uploading")}
        />
      )}

      <div className="text-[10px] text-gray-500 font-mono">{variant.sku}</div>
      {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
    </div>
  );
}

