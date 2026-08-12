"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useState } from "react";
import Skeleton from "@/components/skeleton";
import { FadeSwap } from "@/components/fade-swap";
import { AnimatePresence, motion } from "motion/react";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { formatPrice } from "@/lib/formatPrice";
import DatePicker from "@/components/date-picker";
import type { Coupon, MerchProductAdmin } from "@/types/merch";
import { serverErrorToKey } from "@/lib/serverError";
import AdminPageHeader from "@/components/admin-page-header";
import AdminGate from "@/components/admin-gate";

type Translate = ReturnType<typeof useTranslations<"AdminCouponsPage">>;
type MerchTranslate = ReturnType<typeof useTranslations<"AdminMerchPage">>;

const ERROR_KEY_MAP = {
  missing_fields: "errorMissingFields",
  field_too_long: "errorFieldTooLong",
  invalid_value: "errorInvalidValue",
  invalid_max_uses: "errorInvalidMaxUses",
  code_taken: "errorCodeTaken",
} as const;

const CATEGORY_LABEL_KEY: Record<string, string> = {
  hoodie: "categoryHoodie",
  tshirt: "categoryTshirt",
  "car-scent": "categoryCarScent",
  cap: "categoryCap",
};

function categoryLabel(tMerch: MerchTranslate, category: string) {
  return CATEGORY_LABEL_KEY[category] ? tMerch(CATEGORY_LABEL_KEY[category] as "categoryHoodie") : category;
}

export default function AdminCouponsPage() {
  const t = useTranslations("AdminCouponsPage");
  const tMerch = useTranslations("AdminMerchPage");
  const auth = useAdminAuth();
  const { loggedIn } = auth;
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("Failed to load");
      setCoupons(await res.json());
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCoupons();
      fetch("/api/admin/merch/products")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: MerchProductAdmin[] | null) => {
          if (!data) return;
          setCategories(Array.from(new Set(data.map((p) => p.category).filter(Boolean))));
        })
        .catch((err) => console.error(err));
    }
  }, [loggedIn, loadCoupons]);

  async function toggleActive(coupon: Coupon) {
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c)));
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    });
  }

  async function removeCoupon(id: string) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
  }

  return (
    <AdminGate auth={auth}>
      <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-4xl mx-auto">
        <AdminPageHeader title={t("title")} />

        <NewCouponForm t={t} tMerch={tMerch} categoryOptions={categories} onCreated={loadCoupons} />

        {loading && (
          <div className="text-white mt-6 text-center font-bold animate-pulse">{t("loading")}</div>
        )}
        {error && (
          <div className="text-white mt-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
            {error}
          </div>
        )}
        {!loading && !error && coupons.length === 0 && (
          <div className="text-center text-gray-500 font-bold mt-6">{t("noCoupons")}</div>
        )}

        <FadeSwap activeKey={loading && coupons.length === 0 ? "skeleton" : "content"}>
        {loading && coupons.length === 0 ? (
          <div className="grid gap-3 mt-6">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-sm" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 mt-6">
            <AnimatePresence mode="popLayout" initial={false}>
            {coupons.map((coupon) => {
              const expired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
              const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
              return (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-center justify-between gap-3 bg-[#111]/90 border border-gray-700 rounded-sm p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-lg">{coupon.code}</span>
                      <span className="text-sm text-gray-400">
                        {coupon.type === "percent"
                          ? `-${coupon.value}%`
                          : coupon.type === "fixed"
                            ? `-${formatPrice(coupon.value)}`
                            : t("typeFreeShipping")}
                      </span>
                      {(expired || exhausted) && (
                        <span className="text-[10px] uppercase tracking-widest text-red-400 font-bold border border-red-900/50 bg-red-900/10 rounded-sm px-2 py-0.5">
                          {expired ? t("expired") : t("exhausted")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t("used")}: {coupon.usedCount}
                      {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ` (${t("unlimited")})`}
                      {coupon.expiresAt && (
                        <> · {t("expiresAt")}: {new Date(coupon.expiresAt).toLocaleDateString("cs-CZ")}</>
                      )}
                    </div>
                    {coupon.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {coupon.categories.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] uppercase tracking-wide text-gray-300 border border-gray-600 bg-white/5 rounded-sm px-2 py-0.5"
                          >
                            {categoryLabel(tMerch, c)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleActive(coupon)}
                      role="switch"
                      aria-checked={coupon.active}
                      aria-label={coupon.active ? t("active") : t("inactive")}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        coupon.active ? "bg-green-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          coupon.active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => removeCoupon(coupon.id)}
                      className="text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wide cursor-pointer"
                    >
                      {t("delete")}
                    </button>
                  </div>
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

function SegmentedSwitch<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex h-9 items-stretch bg-white/5 border-2 border-gray-500 rounded-sm p-0.5 shrink-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative flex items-center px-3 text-xs font-bold uppercase tracking-wide rounded-sm cursor-pointer transition-colors ${
            value === opt.value ? "text-black" : "text-gray-400 hover:text-white"
          }`}
        >
          {value === opt.value && (
            <motion.span
              layoutId={`segmented-bg-${name}`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute inset-0 bg-white rounded-sm"
            />
          )}
          <span className="relative">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function NewCouponForm({
  t,
  tMerch,
  categoryOptions,
  onCreated,
}: {
  t: Translate;
  tMerch: MerchTranslate;
  categoryOptions: string[];
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "free_shipping">("percent");
  const [value, setValue] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(c: string) {
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type,
          value:
            type === "free_shipping" ? 0 : type === "percent" ? Number(value) : Math.round(Number(value) * 100),
          maxUses: unlimited ? null : Number(maxUses),
          expiresAt: expiresAt || null,
          categories: selectedCategories,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t(serverErrorToKey(ERROR_KEY_MAP, json?.error, "errorGeneric")));
        return;
      }
      setCode("");
      setValue("");
      setUnlimited(true);
      setMaxUses("");
      setSelectedCategories([]);
      setExpiresAt("");
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
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{t("newCouponTitle")}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("code")}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SALTY10"
            required
            maxLength={40}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm uppercase"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("value")}</label>
          <div className="flex gap-2">
            {type !== "free_shipping" && (
              <input
                type="number"
                step={type === "percent" ? "1" : "0.01"}
                min="0"
                max={type === "percent" ? "100" : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="flex-1 min-w-0 h-9 px-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
              />
            )}
            <SegmentedSwitch
              name="type"
              value={type}
              onChange={setType}
              options={[
                { value: "percent", label: "%" },
                { value: "fixed", label: "Kč" },
                { value: "free_shipping", label: t("typeFreeShipping") },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("maxUses")}</label>
          <div className="flex gap-2">
            <SegmentedSwitch
              name="maxUses"
              value={unlimited ? "unlimited" : "limited"}
              onChange={(next) => setUnlimited(next === "unlimited")}
              options={[
                { value: "unlimited", label: t("unlimited") },
                { value: "limited", label: t("limited") },
              ]}
            />
            {!unlimited && (
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                required
                placeholder="10"
                className="flex-1 min-w-0 h-9 px-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-white text-sm font-bold">{t("categories")}</label>
        <p className="text-gray-500 text-xs -mt-1">{t("categoriesHint")}</p>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((c) => {
            const selected = selectedCategories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={selected}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-sm border cursor-pointer transition-colors ${
                  selected
                    ? "bg-brand border-brand text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
                }`}
              >
                {categoryLabel(tMerch, c)}
              </button>
            );
          })}
          {categoryOptions.length === 0 && (
            <span className="text-gray-600 text-xs italic">{t("noCategoriesYet")}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-72">
        <label className="text-white text-sm font-bold">{t("expiresAt")}</label>
        <DatePicker
          value={expiresAt}
          onChange={setExpiresAt}
          placeholder={t("noExpiry")}
          clearLabel={t("clearDate")}
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
        {t("createCoupon")}
      </button>
    </form>
  );
}
