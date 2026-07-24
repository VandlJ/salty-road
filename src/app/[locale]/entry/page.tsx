"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Entry = {
  id: string;
  firstName: string;
  lastName: string;
  brand: string;
  model: string;
  year: string;
  paymentStatus?: string;
  arrived: boolean;
  arrivedAt?: string | null;
};

export default function EntryPage() {
  const t = useTranslations("EntryPage");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/entry");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
        setError(null);
      } else {
        setError(t("errorLoad"));
      }
    } catch (e) {
      console.error(e);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function toggleArrived(id: string, arrived: boolean) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, arrived } : e))
    );
    try {
      const res = await fetch("/api/entry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, arrived }),
      });
      if (!res.ok) throw new Error("failed");
    } catch (e) {
      console.error(e);
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, arrived: !arrived } : entry))
      );
      setError(t("actionFailed"));
    }
  }

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = `${e.firstName} ${e.lastName}`.toLowerCase();
      const car = `${e.brand} ${e.model}`.toLowerCase();
      return name.includes(q) || car.includes(q);
    });
  }, [entries, deferredSearch]);

  const notArrived = filtered.filter((e) => !e.arrived);
  const arrived = filtered.filter((e) => e.arrived);

  function Card({ entry }: { entry: Entry }) {
    const paid = entry.paymentStatus === "paid";
    return (
      <button
        onClick={() => toggleArrived(entry.id, !entry.arrived)}
        className={`flex-1 min-w-[280px] max-w-[480px] text-left p-4 rounded-sm border transition-colors cursor-pointer ${
          entry.arrived
            ? "bg-[#111]/60 border-gray-800 opacity-60"
            : "bg-[#111]/90 border-gray-700 active:bg-white/10"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold text-white truncate">
                {entry.firstName} {entry.lastName}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {entry.brand} {entry.model}{" "}
                <span className="font-mono">{entry.year}</span>
              </div>
            </div>
            <span
              className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${
                paid ? "bg-green-900/40 text-green-400" : "bg-orange-900/40 text-orange-400"
              }`}
            >
              {paid ? t("paymentPaid") : t("paymentPending")}
            </span>
          </div>
          <span
            className={`w-full text-center py-3 rounded-md font-bold uppercase tracking-wider text-sm shadow ${
              entry.arrived
                ? "border border-gray-600 text-gray-300"
                : "bg-blue-600 text-white"
            }`}
          >
            {entry.arrived ? t("markNotArrived") : t("markArrived")}
          </span>
        </div>
      </button>
    );
  }

  return (
    <section className="min-h-screen bg-transparent text-white p-4 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold text-white mb-4 uppercase tracking-widest">
        {t("title")}
      </h1>

      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-black/90 backdrop-blur-sm mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full p-3 bg-white/5 border-2 border-gray-600 text-white placeholder-gray-400 focus:border-white focus:outline-none text-base rounded-sm"
        />
      </div>

      {loading && (
        <div className="text-center text-white font-bold animate-pulse mb-4">
          {t("loading")}
        </div>
      )}
      {error && (
        <div className="text-white mb-4 p-3 border-2 border-red-500 bg-red-600/50 font-bold text-sm">
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-500 font-bold mt-8">{t("noResults")}</div>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        {notArrived.map((entry) => (
          <Card key={entry.id} entry={entry} />
        ))}
      </div>

      {arrived.length > 0 && (
        <>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 border-t border-gray-800 pt-4">
            {t("arrived")} ({arrived.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {arrived.map((entry) => (
              <Card key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
