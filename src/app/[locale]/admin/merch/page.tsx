"use client";

import { useTranslations } from "next-intl";

import { useCallback, useEffect, useState } from "react";
import AdminFilterChip from "@/components/admin-filter-chip";

import { useAdminAuth } from "@/lib/useAdminAuth";

import { FadeSwap } from "@/components/fade-swap";
import { AnimatePresence, motion } from "motion/react";
import type { MerchProductAdmin } from "@/types/merch";

import AdminPageHeader from "@/components/admin-page-header";
import AdminGate from "@/components/admin-gate";
import { NewProductForm } from "./_components/new-product-form";
import { ProductCard } from "./_components/product-card";
import { MerchSkeleton } from "./_components/merch-skeleton";
import { CATEGORY_LABEL_KEY } from "./_components/shared";

type ActiveFilter = "all" | "active" | "inactive";

export default function AdminMerchPage() {
  const t = useTranslations("AdminMerchPage");
  const auth = useAdminAuth();
  const { loggedIn } = auth;
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

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  // Categories are free text (the form allows a custom value), so an unknown
  // one falls back to showing the raw string rather than a missing-key error.
  const categoryLabel = (c: string) =>
    Object.hasOwn(CATEGORY_LABEL_KEY, c)
      ? t(CATEGORY_LABEL_KEY[c as keyof typeof CATEGORY_LABEL_KEY])
      : c;

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (activeFilter === "active" && !p.active) return false;
    if (activeFilter === "inactive" && p.active) return false;
    return true;
  });

  return (
    <AdminGate auth={auth}>
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

        <div className="flex flex-col gap-4 mb-6 px-4 py-4 sm:px-6 bg-[#111]/90 border border-gray-700 rounded-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-bold uppercase tracking-widest text-sm sm:text-base">
              {t("shippingFee")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-700">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
              {t("shippingFreePromo")}
            </span>
            <button
              onClick={toggleShippingFree}
              disabled={togglingShippingFree}
              role="switch"
              aria-checked={shippingFree}
              aria-label={t("shippingFreePromo")}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                shippingFree ? "bg-brand" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  shippingFree ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <AdminPageHeader title={t("title")} />

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
          <div className="flex flex-col gap-6 mt-6">
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
    </AdminGate>
  );
}
