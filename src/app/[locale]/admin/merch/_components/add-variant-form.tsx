"use client";

import React, { useState } from "react";

import { SIZE_ORDER } from "@/lib/variantLabel";
import { serverErrorToKey } from "@/lib/serverError";
import { ERROR_KEY_MAP, type Translate } from "./shared";

export function AddVariantForm({
  productId,
  t,
  onCreated,
  presetColor,
}: {
  productId: string;
  t: Translate;
  onCreated: () => void;
  // Set when this form lives inside an existing color group (adding a size
  // to that color) — the color field is then fixed instead of editable.
  // Omitted for the product-level "add variant" form, which starts a new
  // color group (or a colorless one, if left blank).
  presetColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const priceHalire = Math.round(Number(price) * 100);
    try {
      const res = await fetch(`/api/admin/merch/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          color: presetColor ?? color,
          size: size || null,
          price: priceHalire,
          quantity: Number(quantity),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t(serverErrorToKey(ERROR_KEY_MAP, json?.error, "errorGeneric")));
        return;
      }
      setSku("");
      setColor("");
      setSize("");
      setPrice("");
      setQuantity("0");
      setOpen(false);
      onCreated();
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 px-4 py-2 border-2 border-gray-600 text-gray-300 text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors cursor-pointer rounded-sm"
      >
        + {presetColor !== undefined ? t("addSize") : t("addVariant")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 bg-white/5 border border-gray-700 rounded-sm p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder={t("variantSkuPlaceholder")}
            required
            maxLength={80}
            className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
          <span className="text-[11px] text-gray-500">{t("variantSkuHint")}</span>
        </div>
        {presetColor === undefined && (
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={t("colorPlaceholder")}
            maxLength={60}
            className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm h-fit"
          />
        )}
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm h-fit cursor-pointer"
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
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("variantPrice")}
          required
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm h-fit"
        />
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t("variantQuantity")}
          required
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm h-fit"
        />
      </div>
      {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
        >
          {presetColor !== undefined ? t("addSize") : t("addVariant")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 border border-gray-600 text-gray-300 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer rounded-sm"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

