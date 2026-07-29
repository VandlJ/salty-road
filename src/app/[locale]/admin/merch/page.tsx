"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { useModalA11y } from "@/lib/useModalA11y";
import type { MerchProductAdmin, MerchVariantAdmin } from "@/types/merch";

const ERROR_KEY_MAP: Record<string, string> = {
  missing_fields: "errorMissingFields",
  field_too_long: "errorFieldTooLong",
  invalid_slug: "errorInvalidSlug",
  slug_taken: "errorSlugTaken",
  sku_taken: "errorSkuTaken",
  invalid_price: "errorInvalidPrice",
  invalid_quantity: "errorInvalidQuantity",
};

export default function AdminMerchPage() {
  const t = useTranslations("AdminMerchPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [products, setProducts] = useState<MerchProductAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/merch/products");
      if (!res.ok) throw new Error("Failed to load");
      setProducts(await res.json());
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
      // Auth just became true — fetch the product list. setState happens
      // after the async fetch resolves, not synchronously in the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProducts();
    }
  }, [loggedIn, loadProducts]);

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-md">
          {t("title")}
        </h1>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-white transition-colors underline"
        >
          {t("backToAdmin")}
        </Link>
      </div>

      {loading && (
        <div className="text-white mb-6 text-center font-bold animate-pulse">{t("loading")}</div>
      )}
      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}

      <NewProductForm t={t} onCreated={loadProducts} />

      <div className="grid gap-6 mt-10">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} t={t} onChange={loadProducts} />
        ))}
      </div>
    </section>
  );
}

type Translate = ReturnType<typeof useTranslations<"AdminMerchPage">>;

function NewProductForm({ t, onCreated }: { t: Translate; onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/merch/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, category, name, description }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t(ERROR_KEY_MAP[json?.error] ?? "errorGeneric"));
        return;
      }
      setSlug("");
      setCategory("");
      setName("");
      setDescription("");
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("slug")}</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("slugHint")}
            required
            maxLength={80}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("category")}</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="hoodie / tshirt / car-scent / cap"
            required
            maxLength={40}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-white text-sm font-bold">{t("name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-white text-sm font-bold">{t("description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={2000}
          rows={2}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm resize-none"
        />
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

function ProductCard({
  product,
  t,
  onChange,
}: {
  product: MerchProductAdmin;
  t: Translate;
  onChange: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [savingFields, setSavingFields] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeConfirm = useCallback(() => setConfirmDelete(false), []);
  const confirmModalRef = useModalA11y<HTMLDivElement>(confirmDelete, closeConfirm);

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

  async function deleteProduct() {
    await fetch(`/api/admin/merch/products/${product.id}`, { method: "DELETE" });
    setConfirmDelete(false);
    onChange();
  }

  return (
    <div className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 bg-white/5 border-b border-gray-700">
        <span className="text-xs text-gray-500 font-mono">{product.slug}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleActive}
            role="switch"
            aria-checked={product.active}
            aria-label={product.active ? t("active") : t("inactive")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              product.active ? "bg-green-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                product.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wide cursor-pointer"
          >
            {t("delete")}
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm font-bold"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={40}
            className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm resize-none"
        />
        {dirty && (
          <button
            onClick={saveFields}
            disabled={savingFields}
            className="self-start px-4 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
          >
            {t("save")}
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            {t("variantsTitle")}
          </h3>
          {product.variants.length === 0 && (
            <p className="text-gray-500 text-sm italic mb-3">{t("noVariants")}</p>
          )}
          <div className="flex flex-col gap-3">
            {product.variants.map((variant) => (
              <VariantRow key={variant.id} variant={variant} t={t} onChange={onChange} />
            ))}
          </div>
          <AddVariantForm productId={product.id} t={t} onCreated={onChange} />
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div
            ref={confirmModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-product-${product.id}`}
            tabIndex={-1}
            className="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full shadow-[0_0_20px_rgba(220,38,38,0.3)] outline-none"
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
          </div>
        </div>
      )}
    </div>
  );
}

function VariantRow({
  variant,
  t,
  onChange,
}: {
  variant: MerchVariantAdmin;
  t: Translate;
  onChange: () => void;
}) {
  const [label, setLabel] = useState(variant.label);
  const [price, setPrice] = useState((variant.price / 100).toString());
  const [quantity, setQuantity] = useState(variant.quantity.toString());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    label !== variant.label ||
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
      body: JSON.stringify({ label, price: priceHalire, quantity: qty }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(t(ERROR_KEY_MAP[json?.error] ?? "errorGeneric"));
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "merch");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const blob = await uploadRes.json();
      await fetch(`/api/admin/merch/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: blob.url }),
      });
      onChange();
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-white/5 border border-gray-700 rounded-sm p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-12 h-12 shrink-0 bg-black rounded-sm overflow-hidden border border-gray-700">
          {variant.image && (
            <Image src={variant.image} alt={variant.label} fill className="object-cover" sizes="48px" />
          )}
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          className="flex-1 min-w-[140px] p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
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

        <label className="text-xs text-white bg-[#111] border border-white/50 px-3 py-2 rounded-sm cursor-pointer hover:bg-white hover:text-black transition-colors">
          {uploading ? t("uploading") : t("uploadImage")}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" disabled={uploading} />
        </label>

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
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-md transition-transform ${
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
      <div className="text-[10px] text-gray-500 font-mono">{variant.sku}</div>
      {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
    </div>
  );
}

function AddVariantForm({
  productId,
  t,
  onCreated,
}: {
  productId: string;
  t: Translate;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [label, setLabel] = useState("");
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
        body: JSON.stringify({ sku, label, price: priceHalire, quantity: Number(quantity) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t(ERROR_KEY_MAP[json?.error] ?? "errorGeneric"));
        return;
      }
      setSku("");
      setLabel("");
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
        + {t("addVariant")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 bg-white/5 border border-gray-700 rounded-sm p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder={t("variantSkuHint")}
          required
          maxLength={80}
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("variantLabelHint")}
          required
          maxLength={100}
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("variantPrice")}
          required
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t("variantQuantity")}
          required
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
      </div>
      {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
        >
          {t("addVariant")}
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
