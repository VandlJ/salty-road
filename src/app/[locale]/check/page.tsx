"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

export default function CheckPage() {
  const t = useTranslations("CheckPage");
  const [idInput, setIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ 
    id: string; 
    status: string; 
    firstName?: string; 
    lastName?: string;
    brand?: string;
    model?: string;
    year?: string;
    createdAt?: string 
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function for status indicator color
  function getStatusColor(status?: string) {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "bg-green-400";
      case "declined":
        return "bg-red-400";
      default: // pending or undefined
        return "bg-orange-400";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const q = idInput.trim();
    if (!q) {
      setError(t("errorEmpty"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/check?id=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || t("errorLookup"));
      } else {
        setResult(json);
      }
    } catch (err) {
      console.error(err);
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-transparent text-white p-4 sm:p-8 max-w-xl mx-auto flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 text-white text-center leading-tight drop-shadow-md">
          {t("title")}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder={t("placeholder")}
            className="p-3 sm:p-4 bg-white/10 border-2 border-gray-400 rounded-none text-white placeholder-gray-300 focus:border-white focus:bg-white/20 focus:outline-none transition-all duration-200 text-sm sm:text-base font-medium"
          />
          <button 
            className="px-6 py-2 sm:px-8 sm:py-3 bg-white text-black font-bold text-base sm:text-lg tracking-widest uppercase rounded-none border-2 border-white hover:bg-gray-200 hover:scale-105 hover:shadow-2xl hover:cursor-pointer transition-all duration-200 disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? t("loading") : t("button")}
          </button>
        </form>

        {error && (
          <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 rounded text-center font-bold">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 sm:p-6 border-2 border-white bg-black/80 backdrop-blur-md rounded-none shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <div>
                <span className="text-gray-300 text-xs sm:text-sm font-semibold uppercase tracking-wide">{t("resultName")} </span>
                <div className="text-white font-bold text-base sm:text-lg tracking-wide">
                  {result.firstName} {result.lastName}
                </div>
              </div>
              <div>
                <span className="inline-flex items-center px-3 py-1 bg-white/10 border border-white/50 rounded text-xs sm:text-sm text-white font-semibold">
                  <div className={`w-2 h-2 ${getStatusColor(result.status)} rounded-full mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]`}></div>
                  {result.status || "pending"}
                </span>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-gray-300 text-xs sm:text-sm font-semibold uppercase tracking-wide">{t("resultVehicle")} </span>
              <div className="text-white font-bold text-base sm:text-lg tracking-wide">
                {result.brand} {result.model} ({result.year})
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-400 font-medium">
              {t("resultCreated")} {result.createdAt ? new Date(result.createdAt).toLocaleString() : "—"}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}