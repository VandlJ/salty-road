"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import AdminFilterChip from "@/components/admin-filter-chip";
import Skeleton from "@/components/skeleton";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { useModalA11y } from "@/lib/useModalA11y";
import { AnimatedModal } from "@/components/animated-modal";
import { FadeSwap } from "@/components/fade-swap";
import { AnimatePresence, motion } from "motion/react";
import { formatPrice } from "@/lib/formatPrice";
import { getOrderVs } from "@/lib/orderVs";
import type { Order, StockRequest } from "@/types/merch";

const STATUSES: Order["status"][] = ["pending", "paid", "shipped", "cancelled"];

const STATUS_COLOR: Record<Order["status"], string> = {
  pending: "text-orange-400",
  paid: "text-green-400",
  shipped: "text-blue-400",
  cancelled: "text-red-400",
};

export default function AdminOrdersPage() {
  const t = useTranslations("AdminOrdersPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const closeRemoveModal = useCallback(() => setRemoveId(null), []);
  const removeModalRef = useModalA11y<HTMLDivElement>(!!removeId, closeRemoveModal);

  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [stockRequestsLoading, setStockRequestsLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to load");
      setOrders(await res.json());
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadStockRequests = useCallback(async () => {
    setStockRequestsLoading(true);
    try {
      const res = await fetch("/api/admin/stock-requests");
      if (res.ok) setStockRequests(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setStockRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      // Auth just became true — fetch orders + stock requests. setState
      // happens after the async fetches resolve, not synchronously in the
      // effect body.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadOrders();
      loadStockRequests();
    }
  }, [loggedIn, loadOrders, loadStockRequests]);

  async function toggleStockRequestFulfilled(id: string, fulfilled: boolean) {
    setStockRequests((prev) => prev.map((r) => (r.id === id ? { ...r, fulfilled } : r)));
    await fetch(`/api/admin/stock-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfilled }),
    });
  }

  async function removeStockRequest(id: string) {
    setStockRequests((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/admin/stock-requests/${id}`, { method: "DELETE" });
  }

  async function updateStatus(id: string, status: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(
        json?.error === "insufficient_stock"
          ? t("errorInsufficientStock")
          : json?.error === "insufficient_coupon"
            ? t("errorInsufficientCoupon")
            : t("errorLoad")
      );
      loadOrders(); // revert to server state on failure
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    try {
      const res = await fetch(`/api/admin/orders/${removeId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("errorRemove"));
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== removeId));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorRemove"));
    } finally {
      setRemoveId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = deferredSearch.trim();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q && !getOrderVs(o.createdAt, o.orderNumber).includes(q)) return false;
      return true;
    });
  }, [orders, statusFilter, deferredSearch]);

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("title")} <span className="text-gray-400 text-2xl ml-2">({orders.length})</span>
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

      {!stockRequestsLoading && stockRequests.length > 0 && (
        <div className="mb-8 bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
          <div className="px-4 py-3 bg-white/5 border-b border-gray-700">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              {t("stockRequestsTitle")}{" "}
              <span className="text-gray-400">
                ({stockRequests.filter((r) => !r.fulfilled).length})
              </span>
            </h2>
          </div>
          <div className="flex flex-col divide-y divide-gray-800">
            {stockRequests.map((r) => (
              <div
                key={r.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${r.fulfilled ? "opacity-50" : ""}`}
              >
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm truncate">
                    {r.productName} <span className="text-gray-400 font-normal">({r.variantLabel})</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {r.customerEmail} · {new Date(r.createdAt).toLocaleDateString("cs-CZ")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStockRequestFulfilled(r.id, !r.fulfilled)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors cursor-pointer ${
                      r.fulfilled
                        ? "border-gray-600 text-gray-400 hover:border-gray-400"
                        : "border-green-600 text-green-400 hover:bg-green-900/30"
                    }`}
                  >
                    {r.fulfilled ? t("stockRequestReopen") : t("stockRequestFulfill")}
                  </button>
                  <button
                    onClick={() => removeStockRequest(r.id)}
                    className="px-3 py-1.5 bg-transparent hover:bg-red-900/30 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[10px] border border-red-900/50 hover:border-red-500 rounded-sm transition-all cursor-pointer"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchVsPlaceholder")}
          inputMode="numeric"
          className="w-full mb-4 p-3 bg-white/5 border-2 border-gray-600 text-white placeholder-gray-400 focus:border-white focus:outline-none text-sm sm:text-base rounded-sm"
        />
      )}

      {orders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mr-1">
            {t("status")}
          </span>
          <AdminFilterChip label={t("filterAll")} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={orders.length} />
          {STATUSES.map((s) => (
            <AdminFilterChip
              key={s}
              label={t(`status${s.charAt(0).toUpperCase()}${s.slice(1)}` as "statusPending")}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              count={orders.filter((o) => o.status === s).length}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="text-white mb-6 text-center font-bold animate-pulse">{t("loading")}</div>
      )}
      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center text-gray-500 font-bold">{t("noOrders")}</div>
      )}
      {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="text-center text-gray-500 font-bold">{t("noResultsFilter")}</div>
      )}

      <FadeSwap activeKey={loading && orders.length === 0 ? "skeleton" : "content"}>
      {loading && orders.length === 0 ? (
        <OrdersSkeleton />
      ) : (
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
        {filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            data-testid="admin-order-row"
            data-order-id={order.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white/5 border-b border-gray-700">
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    {t("vs")}
                  </span>
                  <span className="font-mono text-lg font-bold text-white">{getOrderVs(order.createdAt, order.orderNumber)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    {t("orderId")}
                  </span>
                  <span className="font-mono text-sm text-white/50">{order.id}</span>
                </div>
              </div>
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  {t("created")}
                </span>
                <span className="text-sm text-gray-300">
                  {new Date(order.createdAt).toLocaleString("cs-CZ")}
                </span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">
                    {t("customer")}
                  </span>
                  <span className="text-white font-bold">{order.customerName}</span>
                  <div className="text-sm text-gray-300">{order.customerEmail}</div>
                  <div className="text-sm text-gray-300">{order.customerPhone}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">
                    {order.deliveryMethod === "pickup" ? t("deliveryMethod") : t("address")}
                  </span>
                  <span className="text-sm text-gray-300">
                    {order.deliveryMethod === "pickup" ? t("deliveryPickup") : order.address}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">
                    {t("payment")}
                  </span>
                  <span className="text-sm text-gray-300">
                    {order.paymentMethod === "bank_transfer" ? t("paymentBankTransfer") : t("paymentCod")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">
                  {t("items")}
                </span>
                <div className="flex flex-col gap-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-300">
                      <span>
                        {item.name} ({item.label}) x{item.qty}
                      </span>
                      <span>{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                {order.couponCode && order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                    <span>
                      {t("coupon")}: <span className="font-mono text-gray-300">{order.couponCode}</span>
                    </span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                {order.shippingCouponCode && (
                  <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                    <span>
                      {t("coupon")}: <span className="font-mono text-gray-300">{order.shippingCouponCode}</span>
                    </span>
                    <span>{t("shippingFeeFree")}</span>
                  </div>
                )}
                {order.giftLabel && (
                  <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                    <span>{t("gift")}</span>
                    <span className="text-gray-300">{order.giftLabel}</span>
                  </div>
                )}
                {order.shippingFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                    <span>{t("shippingFee")}</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                )}
                <div
                  className={`flex justify-between font-bold text-white pt-2 ${
                    !(order.couponCode && order.discountAmount > 0) &&
                    !order.shippingCouponCode &&
                    !order.giftLabel &&
                    !(order.shippingFee > 0)
                      ? "border-t border-gray-700"
                      : ""
                  }`}
                >
                  <span>{t("total")}</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                      {t("status")}
                    </span>
                    <select
                      data-testid="admin-order-status"
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value as Order["status"])}
                      className={`bg-[#111] border-2 border-gray-600 rounded-sm px-2 py-1 text-sm font-bold cursor-pointer focus:outline-none focus:border-white ${STATUS_COLOR[order.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="text-white bg-[#111]">
                          {t(`status${s.charAt(0).toUpperCase()}${s.slice(1)}` as "statusPending")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setRemoveId(order.id)}
                    className="px-3 py-1.5 bg-transparent hover:bg-red-900/30 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[10px] border border-red-900/50 hover:border-red-500 rounded-sm transition-all"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
      )}
      </FadeSwap>

      <AnimatedModal
        open={!!removeId}
        panelRef={removeModalRef}
        labelledBy="remove-order-modal-title"
        panelClassName="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full relative shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <h3 id="remove-order-modal-title" className="text-xl font-bold text-white mb-4 text-center">
          {t("remove")}
        </h3>
        <p className="text-gray-300 mb-8 text-center font-medium">
          {t("confirmRemove")}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setRemoveId(null)}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={confirmRemove}
            className="flex-1 px-4 py-3 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all"
          >
            {t("remove")}
          </button>
        </div>
      </AnimatedModal>
    </section>
  );
}

function OrdersSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/5 border-b border-gray-700">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-28 mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
