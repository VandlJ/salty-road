"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import AdminFilterChip from "@/components/admin-filter-chip";
import AdminPhotoGalleryManager from "@/components/admin-photo-gallery-manager";
import PhotoGallery from "@/components/photo-gallery";
import Skeleton from "@/components/skeleton";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { useModalA11y } from "@/lib/useModalA11y";
import { AnimatedModal } from "@/components/animated-modal";
import { FadeSwap } from "@/components/fade-swap";
import { AnimatePresence, motion } from "motion/react";
import type { MerchProductAdmin, MerchVariantAdmin } from "@/types/merch";
import { SIZE_ORDER, compareBySize } from "@/lib/variantLabel";

type ActiveFilter = "all" | "active" | "inactive";

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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [shopEnabled, setShopEnabledState] = useState(false);
  const [togglingShop, setTogglingShop] = useState(false);
  const [giftThresholdCzk, setGiftThresholdCzk] = useState("");
  const [savedGiftThresholdCzk, setSavedGiftThresholdCzk] = useState("");
  const [savingGiftThreshold, setSavingGiftThreshold] = useState(false);
  const [shippingFeeCzk, setShippingFeeCzk] = useState("");
  const [savedShippingFeeCzk, setSavedShippingFeeCzk] = useState("");
  const [savingShippingFee, setSavingShippingFee] = useState(false);
  const [shippingFree, setShippingFreeState] = useState(false);
  const [togglingShippingFree, setTogglingShippingFree] = useState(false);

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
      // Auth just became true — fetch the product list + shop toggle state.
      // setState happens after the async fetches resolve, not synchronously
      // in the effect body.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProducts();
      fetch("/api/admin/settings", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setShopEnabledState(!!data.shopEnabled);
          const czk = data.stickerGiftThresholdHalire
            ? String(data.stickerGiftThresholdHalire / 100)
            : "";
          setGiftThresholdCzk(czk);
          setSavedGiftThresholdCzk(czk);

          const shippingCzk =
            typeof data.shippingFeeHalire === "number" ? String(data.shippingFeeHalire / 100) : "";
          setShippingFeeCzk(shippingCzk);
          setSavedShippingFeeCzk(shippingCzk);
          setShippingFreeState(!!data.shippingFree);
        })
        .catch((err) => console.error(err));
    }
  }, [loggedIn, loadProducts]);

  async function saveGiftThreshold() {
    const czk = Number(giftThresholdCzk);
    if (!Number.isFinite(czk) || czk < 0) return;
    setSavingGiftThreshold(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerGiftThresholdHalire: Math.round(czk * 100) }),
      });
      if (res.ok) {
        setSavedGiftThresholdCzk(giftThresholdCzk);
      } else {
        setError(t("errorGeneric"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setSavingGiftThreshold(false);
    }
  }

  async function saveShippingFee() {
    const czk = Number(shippingFeeCzk);
    if (!Number.isFinite(czk) || czk < 0) return;
    setSavingShippingFee(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingFeeHalire: Math.round(czk * 100) }),
      });
      if (res.ok) {
        setSavedShippingFeeCzk(shippingFeeCzk);
      } else {
        setError(t("errorGeneric"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setSavingShippingFee(false);
    }
  }

  async function toggleShippingFree() {
    const next = !shippingFree;
    setTogglingShippingFree(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingFree: next }),
      });
      if (res.ok) {
        setShippingFreeState(next);
      } else {
        setError(t("errorGeneric"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setTogglingShippingFree(false);
    }
  }

  async function toggleShopEnabled() {
    const next = !shopEnabled;
    setTogglingShop(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopEnabled: next }),
      });
      if (res.ok) {
        setShopEnabledState(next);
        // Nudge the navbar (same tab) to refetch immediately instead of
        // waiting for its next poll interval.
        window.dispatchEvent(new Event("shop-status-changed"));
      } else {
        setError(t("errorGeneric"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setTogglingShop(false);
    }
  }

  const [movingProduct, setMovingProduct] = useState(false);

  async function moveProduct(product: MerchProductAdmin, dir: -1 | 1) {
    if (movingProduct) return;
    // Pairwise swap against the true neighbor in the full (unfiltered)
    // list — not a full renumber of the currently filtered view, which
    // would risk colliding `order` values with hidden items when a
    // category/active filter is active.
    const sorted = [...products].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((p) => p.id === product.id);
    const targetIndex = index + dir;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
    const target = sorted[targetIndex];

    setMovingProduct(true);
    try {
      await Promise.all([
        fetch(`/api/admin/merch/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: target.order }),
        }),
        fetch(`/api/admin/merch/products/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: product.order }),
        }),
      ]);
      await loadProducts();
    } finally {
      setMovingProduct(false);
    }
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const categoryLabel = (c: string) =>
    (CATEGORY_LABEL_KEY as Record<string, string>)[c] ? t(CATEGORY_LABEL_KEY[c as keyof typeof CATEGORY_LABEL_KEY]) : c;

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (activeFilter === "active" && !p.active) return false;
    if (activeFilter === "inactive" && p.active) return false;
    return true;
  });

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 px-4 py-4 sm:px-6 bg-[#111]/90 border border-gray-700 rounded-sm">
        <span className="font-bold uppercase tracking-widest text-sm sm:text-base">
          {t("shopEnabled")}
        </span>
        <button
          onClick={toggleShopEnabled}
          disabled={togglingShop}
          role="switch"
          aria-checked={shopEnabled}
          className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            shopEnabled ? "bg-green-600" : "bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              shopEnabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-4 py-4 sm:px-6 bg-[#111]/90 border border-gray-700 rounded-sm">
        <span className="font-bold uppercase tracking-widest text-sm sm:text-base">
          {t("giftThreshold")}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            value={giftThresholdCzk}
            onChange={(e) => setGiftThresholdCzk(e.target.value)}
            placeholder="1500"
            className="w-28 p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
          <span className="text-gray-400 text-sm">Kč</span>
          {giftThresholdCzk !== savedGiftThresholdCzk && (
            <button
              onClick={saveGiftThreshold}
              disabled={savingGiftThreshold}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
            >
              {t("save")}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-4 py-4 sm:px-6 bg-[#111]/90 border border-gray-700 rounded-sm">
        <span className="font-bold uppercase tracking-widest text-sm sm:text-base">
          {t("shippingFee")}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            value={shippingFeeCzk}
            onChange={(e) => setShippingFeeCzk(e.target.value)}
            placeholder="99"
            disabled={shippingFree}
            className="w-28 p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm disabled:opacity-40"
          />
          <span className="text-gray-400 text-sm">Kč</span>
          {shippingFeeCzk !== savedShippingFeeCzk && (
            <button
              onClick={saveShippingFee}
              disabled={savingShippingFee || shippingFree}
              className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 rounded-sm"
            >
              {t("save")}
            </button>
          )}

          <div className="h-5 w-px bg-gray-700 mx-1" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              onClick={toggleShippingFree}
              disabled={togglingShippingFree}
              role="switch"
              aria-checked={shippingFree}
              aria-label={t("shippingFreePromo")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                shippingFree ? "bg-brand" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  shippingFree ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap">
              {t("shippingFreePromo")}
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("title")}
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

      {loading && (
        <div className="text-white mb-6 text-center font-bold animate-pulse">{t("loading")}</div>
      )}
      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}

      <NewProductForm t={t} onCreated={loadProducts} />

      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mr-1">
              {t("category")}
            </span>
            <AdminFilterChip label={t("filterAll")} active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} count={products.length} />
            {categories.map((c) => (
              <AdminFilterChip
                key={c}
                label={categoryLabel(c)}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
                count={products.filter((p) => p.category === c).length}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mr-1">
              {t("active")}
            </span>
            <AdminFilterChip label={t("filterAll")} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} count={products.length} />
            <AdminFilterChip label={t("active")} active={activeFilter === "active"} onClick={() => setActiveFilter("active")} count={products.filter((p) => p.active).length} />
            <AdminFilterChip label={t("inactive")} active={activeFilter === "inactive"} onClick={() => setActiveFilter("inactive")} count={products.filter((p) => !p.active).length} />
          </div>
        </div>
      )}

      {!loading && !error && products.length > 0 && filteredProducts.length === 0 && (
        <div className="text-center text-gray-500 font-bold mt-10">{t("noResultsFilter")}</div>
      )}

      <FadeSwap activeKey={loading && products.length === 0 ? "skeleton" : "content"}>
      {loading && products.length === 0 ? (
        <MerchSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <AnimatePresence mode="popLayout" initial={false}>
          {filteredProducts.map((product) => {
            const sortedIds = [...products].sort((a, b) => a.order - b.order).map((p) => p.id);
            const posInFullList = sortedIds.indexOf(product.id);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductCard
                  product={product}
                  t={t}
                  onChange={loadProducts}
                  onMove={(dir) => moveProduct(product, dir)}
                  canMoveUp={posInFullList > 0}
                  canMoveDown={posInFullList < sortedIds.length - 1}
                  moving={movingProduct}
                />
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
      </FadeSwap>
    </section>
  );
}

type Translate = ReturnType<typeof useTranslations<"AdminMerchPage">>;

type ColorGroup = { color: string; order: number; variants: MerchVariantAdmin[] };

function groupVariantsByColor(variants: MerchVariantAdmin[]): ColorGroup[] {
  const map = new Map<string, MerchVariantAdmin[]>();
  for (const v of variants) {
    const key = v.color ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  const groups = Array.from(map.entries()).map(([color, vs]) => ({
    color,
    // All variants in a group are kept on the same `order` value by the
    // reorder/create endpoints, but fall back to the min just in case two
    // rows ever drift out of sync.
    order: Math.min(...vs.map((v) => v.order)),
    variants: [...vs].sort(compareBySize),
  }));
  groups.sort((a, b) => a.order - b.order);
  return groups;
}

const CATEGORY_OPTIONS = ["hoodie", "tshirt", "car-scent", "cap"] as const;
const CATEGORY_LABEL_KEY: Record<(typeof CATEGORY_OPTIONS)[number], string> = {
  hoodie: "categoryHoodie",
  tshirt: "categoryTshirt",
  "car-scent": "categoryCarScent",
  cap: "categoryCap",
};

function CategorySelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: Translate;
}) {
  const isKnown = (CATEGORY_OPTIONS as readonly string[]).includes(value);
  const [custom, setCustom] = useState(value !== "" && !isKnown);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={custom ? "__custom__" : value}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer"
      >
        <option value="" disabled className="bg-[#111]">
          —
        </option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c} className="bg-[#111]">
            {t(CATEGORY_LABEL_KEY[c] as "categoryHoodie")}
          </option>
        ))}
        <option value="__custom__" className="bg-[#111]">
          {t("categoryCustom")}
        </option>
      </select>
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("categoryCustomPlaceholder")}
          maxLength={40}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
        />
      )}
    </div>
  );
}

function NewProductForm({ t, onCreated }: { t: Translate; onCreated: () => void }) {
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
        setError(t(ERROR_KEY_MAP[product?.error] ?? "errorGeneric"));
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
        setError(t(ERROR_KEY_MAP[variant?.error] ?? "errorGeneric"));
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

function ProductCard({
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
      <div className="flex flex-col gap-3 px-4 py-4 bg-white/5 border-b border-gray-700">
        <div className="flex items-center justify-between gap-3">
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
                ‹
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={moving || !canMoveDown}
                aria-label={t("moveProductDown")}
                className="w-6 h-6 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-sm font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          className="p-2 bg-white/5 border-2 border-gray-600 text-white text-sm focus:border-white focus:outline-none rounded-sm resize-y"
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

        <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              {t("photosTitle")}
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setPhotoMode("shared")}
                aria-pressed={product.photoMode === "shared"}
                className={`flex-1 text-left px-4 py-2.5 rounded-sm border-2 transition-colors cursor-pointer ${
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
                className={`flex-1 text-left px-4 py-2.5 rounded-sm border-2 transition-colors cursor-pointer ${
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

function ColorGroupSection({
  productId,
  group,
  t,
  onChange,
  showPhotos,
  onMove,
  canMoveUp,
  canMoveDown,
  moving,
}: {
  productId: string;
  group: ColorGroup;
  t: Translate;
  onChange: () => void;
  showPhotos: boolean;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
}) {
  const [color, setColor] = useState(group.color);
  const [savingColor, setSavingColor] = useState(false);
  const dirty = color !== group.color;

  async function saveColor() {
    setSavingColor(true);
    try {
      // Every variant in the group shares the color name, so renaming the
      // group means patching all of them at once.
      await Promise.all(
        group.variants.map((v) =>
          fetch(`/api/admin/merch/variants/${v.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color }),
          })
        )
      );
      onChange();
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="border border-gray-700 rounded-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 bg-white/5 px-3 py-2 border-b border-gray-700">
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={moving || !canMoveUp}
            aria-label={t("moveColorUp")}
            className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={moving || !canMoveDown}
            aria-label={t("moveColorDown")}
            className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 hover:bg-white hover:text-black text-white rounded-sm text-base font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder={t("colorPlaceholder")}
          maxLength={60}
          className="flex-1 min-w-[140px] p-2 bg-white/5 border-2 border-gray-600 text-white text-sm font-bold focus:border-white focus:outline-none rounded-sm"
        />
        {dirty && (
          <button
            onClick={saveColor}
            disabled={savingColor}
            className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer rounded-sm disabled:opacity-50"
          >
            {t("save")}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 p-3">
        {group.variants.map((variant) => (
          <VariantRow key={variant.id} variant={variant} t={t} onChange={onChange} showPhotos={showPhotos} />
        ))}
        <AddVariantForm productId={productId} t={t} onCreated={onChange} presetColor={group.color} />
      </div>
    </div>
  );
}

function VariantRow({
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

function AddVariantForm({
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
        setError(t(ERROR_KEY_MAP[json?.error] ?? "errorGeneric"));
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

function MerchSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-4 bg-white/5 border-b border-gray-700">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-16 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
