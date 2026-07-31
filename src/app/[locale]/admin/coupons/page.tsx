"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import Skeleton from "@/components/skeleton";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { formatPrice } from "@/lib/formatPrice";
import type { Coupon } from "@/types/merch";

type Translate = ReturnType<typeof useTranslations<"AdminCouponsPage">>;

const ERROR_KEY_MAP: Record<string, string> = {
  missing_fields: "errorMissingFields",
  field_too_long: "errorFieldTooLong",
  invalid_value: "errorInvalidValue",
  invalid_max_uses: "errorInvalidMaxUses",
  code_taken: "errorCodeTaken",
};

export default function AdminCouponsPage() {
  const t = useTranslations("AdminCouponsPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-4xl mx-auto">
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

      <NewCouponForm t={t} onCreated={loadCoupons} />

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

      {loading && coupons.length === 0 ? (
        <div className="grid gap-3 mt-6">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 mt-6">
          {coupons.map((coupon) => {
            const expired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
            const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
            return (
              <div
                key={coupon.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-[#111]/90 border border-gray-700 rounded-sm p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-lg">{coupon.code}</span>
                    <span className="text-sm text-gray-400">
                      {coupon.type === "percent" ? `-${coupon.value}%` : `-${formatPrice(coupon.value)}`}
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
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NewCouponForm({ t, onCreated }: { t: Translate; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          value: type === "percent" ? Number(value) : Math.round(Number(value) * 100),
          maxUses: maxUses ? Number(maxUses) : null,
          expiresAt: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t(ERROR_KEY_MAP[json?.error] ?? "errorGeneric"));
        return;
      }
      setCode("");
      setValue("");
      setMaxUses("");
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <label className="text-white text-sm font-bold">{t("type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer"
          >
            <option value="percent" className="bg-black">{t("typePercent")}</option>
            <option value="fixed" className="bg-black">{t("typeFixed")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">
            {type === "percent" ? t("valuePercent") : t("valueFixed")}
          </label>
          <input
            type="number"
            step={type === "percent" ? "1" : "0.01"}
            min="0"
            max={type === "percent" ? "100" : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-white text-sm font-bold">{t("maxUses")}</label>
          <input
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder={t("unlimited")}
            className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-64">
        <label className="text-white text-sm font-bold">{t("expiresAt")}</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm"
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
