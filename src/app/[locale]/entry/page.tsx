"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useModalA11y } from "@/lib/useModalA11y";

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
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const closeUndoModal = useCallback(() => setUndoTarget(null), []);
  const undoModalRef = useModalA11y<HTMLDivElement>(!!undoTarget, closeUndoModal);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/entry");
      if (res.status === 401) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
        setAuthorized(true);
        setError(null);
      } else {
        setError(t("errorLoad"));
      }
    } catch (e) {
      console.error(e);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, [t]);

  useEffect(() => {
    // Initial data fetch on mount — setState happens after the async
    // fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [authorized, load]);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    try {
      const res = await fetch("/api/entry/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        if (j?.error === "invalid_pin") setPinError(t("pinError"));
        else if (j?.error === "rate_limited") setPinError(t("errorRateLimited"));
        else setPinError(t("actionFailed"));
        return;
      }
      setPin("");
      setLoading(true);
      await load();
    } catch (e) {
      console.error(e);
      setPinError(t("actionFailed"));
    }
  }

  async function applyArrived(id: string, arrived: boolean) {
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

  function toggleArrived(id: string, arrived: boolean) {
    // Marking as arrived is a one-tap action; undoing it needs a confirmation
    // so crew don't accidentally kick someone off the arrived list mid-scroll.
    if (!arrived) {
      setUndoTarget(id);
      return;
    }
    applyArrived(id, arrived);
  }

  async function confirmUndo() {
    if (!undoTarget) return;
    await applyArrived(undoTarget, false);
    setUndoTarget(null);
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

  if (checkingAuth) {
    return (
      <section className="flex-1 w-full bg-transparent text-white p-4 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse">{t("loading")}</div>
      </section>
    );
  }

  if (!authorized) {
    return (
      <section className="flex-1 w-full bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-xl mx-auto">
        <div className="w-full">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 sm:mb-8 text-white text-center drop-shadow-md">
            {t("pinTitle")}
          </h1>
          <form
            onSubmit={handlePinSubmit}
            className="flex flex-col gap-4 sm:gap-6 bg-[#111]/80 p-8 border border-gray-600 shadow-2xl backdrop-blur-md rounded-sm"
          >
            <div className="flex flex-col gap-2">
              <label className="text-white font-bold tracking-wide">
                {t("pinLabel")}
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t("pinPlaceholder")}
                type="password"
                inputMode="numeric"
                autoFocus
                required
                className="p-3 sm:p-4 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-lg tracking-widest text-center rounded-sm"
              />
            </div>
            <button className="px-6 py-3 bg-white text-black font-bold text-lg tracking-widest uppercase hover:bg-gray-200 hover:shadow-xl transition-all duration-200 mt-2 cursor-pointer rounded-sm">
              {t("unlock")}
            </button>
            {pinError && (
              <div className="text-red-400 p-3 border border-red-500/50 bg-red-900/20 text-center text-sm font-bold rounded-sm">
                {pinError}
              </div>
            )}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-5xl mx-auto w-full">
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

      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div
            ref={undoModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="undo-modal-title"
            tabIndex={-1}
            className="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full relative shadow-[0_0_20px_rgba(220,38,38,0.3)] outline-none"
          >
            <h3 id="undo-modal-title" className="text-xl font-bold text-white mb-4 text-center">
              {t("confirmUndoTitle")}
            </h3>
            <p className="text-gray-300 mb-8 text-center font-medium">
              {t("confirmUndoText")}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setUndoTarget(null)}
                className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmUndo}
                className="flex-1 px-4 py-3 bg-red-600 border border-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
