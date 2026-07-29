"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { formatPrice } from "@/lib/formatPrice";
import type { Order } from "@/types/merch";

const STATUSES: Order["status"][] = ["pending", "paid", "shipped"];

const STATUS_COLOR: Record<Order["status"], string> = {
  pending: "text-orange-400",
  paid: "text-green-400",
  shipped: "text-blue-400",
};

export default function AdminOrdersPage() {
  const t = useTranslations("AdminOrdersPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (loggedIn) {
      // Auth just became true — fetch orders. setState happens after the
      // async fetch resolves, not synchronously in the effect body.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadOrders();
    }
  }, [loggedIn, loadOrders]);

  async function updateStatus(id: string, status: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadOrders(); // revert to server state on failure
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-md">
          {t("title")} <span className="text-gray-400 text-2xl ml-2">({orders.length})</span>
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
      {!loading && !error && orders.length === 0 && (
        <div className="text-center text-gray-500 font-bold">{t("noOrders")}</div>
      )}

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white/5 border-b border-gray-700">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  {t("orderId")}
                </span>
                <span className="font-mono text-sm text-white">{order.id}</span>
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
                    {t("address")}
                  </span>
                  <span className="text-sm text-gray-300">{order.address}</span>
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
                <div className="flex justify-between font-bold text-white pt-2 border-t border-gray-700">
                  <span>{t("total")}</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    {t("status")}
                  </span>
                  <select
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
