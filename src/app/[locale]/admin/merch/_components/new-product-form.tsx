"use client";

import React, { useState } from "react";

import { SIZE_ORDER } from "@/lib/variantLabel";
import { serverErrorToKey } from "@/lib/serverError";
import { ERROR_KEY_MAP, type Translate } from "./shared";
import { CategorySelect } from "./category-select";

export function NewProductForm({ t, onCreated }: { t: Translate; onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantQuantity, setVariantQuantity] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const productRes = await fetch("/api/admin/merch/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, category, name, description }),
      });
      const product = await productRes.json();
      if (!productRes.ok) {
        setError(t(serverErrorToKey(ERROR_KEY_MAP, product?.error, "errorGeneric")));
        return;
      }

      // New products default to photoMode "shared" — a photo uploaded here
      // goes straight to the product's shared gallery, not the variant.
      // Per-variant photos (and switching to per-variant mode) are managed
      // afterward from the product card once it's created.
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("folder", "merch");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const blob = await uploadRes.json();
          await fetch(`/api/admin/merch/products/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photos: [blob.url] }),
          });
        }
      }

      const priceHalire = Math.round(Number(variantPrice) * 100);
      const variantRes = await fetch(`/api/admin/merch/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: variantSku,
          color: variantColor,
          size: variantSize || null,
          price: priceHalire,
          quantity: Number(variantQuantity),
        }),
      });
      const variant = await variantRes.json();
      if (!variantRes.ok) {
        // The product was created but the variant failed — surface the
        // error and let the admin add the variant from the product card.
        setError(t(serverErrorToKey(ERROR_KEY_MAP, variant?.error, "errorGeneric")));
        onCreated();
        return;
      }

      setSlug("");
      setCategory("");
      setName("");
      setDescription("");
      setVariantSku("");
      setVariantColor("");
      setVariantSize("");
      setVariantPrice("");
      setVariantQuantity("0");
      setImageFile(null);
      onCreated();
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#111]/90 border border-gray-700 rounded-sm p-6 flex flex-col gap-4"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
        {t("newProductTitle")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("slug")}</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("slugPlaceholder")}
            required
            maxLength={80}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
          <span className="text-[11px] text-gray-500">{t("slugHint")}</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("category")}</label>
          <CategorySelect value={category} onChange={setCategory} t={t} />
        </div>
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-white text-sm font-bold">{t("name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-white text-sm font-bold">{t("description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={2000}
          rows={5}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm resize-y"
        />
      </div>

      <div className="pt-4 border-t border-gray-800 flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            {t("firstVariantTitle")}
          </h3>
          <p className="text-[11px] text-gray-500">{t("firstVariantHint")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">{t("variantSku")}</label>
            <input
              value={variantSku}
              onChange={(e) => setVariantSku(e.target.value)}
              placeholder={t("variantSkuPlaceholder")}
              required
              maxLength={80}
              className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
            />
            <span className="text-[11px] text-gray-500">{t("variantSkuHint")}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">{t("colorLabel")}</label>
            <input
              value={variantColor}
              onChange={(e) => setVariantColor(e.target.value)}
              placeholder={t("colorPlaceholder")}
              maxLength={60}
              className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">{t("sizeLabel")}</label>
            <select
              value={variantSize}
              onChange={(e) => setVariantSize(e.target.value)}
              className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer"
            >
              <option value="" className="bg-black">{t("noSize")}</option>
              {SIZE_ORDER.map((s) => (
                <option key={s} value={s} className="bg-black">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">{t("variantPrice")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
              required
              className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-white text-sm font-bold">{t("variantQuantity")}</label>
            <input
              type="number"
              min="0"
              value={variantQuantity}
              onChange={(e) => setVariantQuantity(e.target.value)}
              required
              className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("variantImage")}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-300 file:mr-3 file:px-3 file:py-2 file:bg-[#111] file:border file:border-white/50 file:text-white file:rounded-sm file:cursor-pointer file:hover:bg-white file:hover:text-black file:transition-colors cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="text-red-400 p-2 border border-red-500/50 bg-red-900/20 text-sm font-bold rounded-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start px-6 py-2 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50 rounded-sm"
      >
        {t("createProduct")}
      </button>
    </form>
  );
}

