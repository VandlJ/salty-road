"use client";

import React, { useState } from "react";

export default function CheckPage() {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: number; status: string; name?: string; plate?: string; createdAt?: string } | null>(null);
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

  // Helper function to format license plate for display (add space after first 3 characters)
  function formatPlate(plate: string) {
    if (!plate || plate.length <= 3) return plate;
    return `${plate.slice(0, 3)} ${plate.slice(3)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const q = plate.trim();
    if (!q) {
      setError("Enter licence plate");
      return;
    }

    setLoading(true);
    try {
      // Normalize the plate for search (remove spaces, uppercase)
      const normalizedPlate = q.replace(/\s+/g, "").toUpperCase();
      const res = await fetch(`/api/check?plate=${encodeURIComponent(normalizedPlate)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Lookup failed");
      } else {
        setResult(json);
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-transparent text-white p-4 sm:p-8 max-w-xl mx-auto flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent text-center leading-tight">
          Check Registration
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="Enter licence plate"
            className="p-3 sm:p-4 bg-gray-900/50 border border-[#C0C0C0]/30 rounded text-white placeholder-gray-400 focus:border-[#C0C0C0] focus:outline-none transition-colors text-sm sm:text-base"
          />
          <button 
            className="px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-white to-[#C0C0C0] text-black font-bold text-base sm:text-lg tracking-widest uppercase rounded-none border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:shadow-2xl hover:cursor-pointer transition-all duration-200 disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? "Checking…" : "Check"}
          </button>
        </form>

        {error && (
          <div className="text-red-400 mb-6 p-4 border border-red-400/30 bg-red-900/20 rounded text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 sm:p-6 border border-[#C0C0C0]/30 bg-gradient-to-br from-gray-900/40 to-black/60 backdrop-blur-md rounded-lg shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <div>
                <span className="text-[#C0C0C0] text-xs sm:text-sm">Name:</span>
                <div className="text-white font-semibold text-base sm:text-lg">{result.name || "—"}</div>
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 bg-[#C0C0C0]/10 border border-[#C0C0C0]/40 rounded text-xs sm:text-sm text-[#C0C0C0]">
                  <div className={`w-2 h-2 ${getStatusColor(result.status)} rounded-full mr-2`}></div>
                  {result.status || "pending"}
                </span>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-[#C0C0C0] text-xs sm:text-sm">License Plate:</span>
              <div className="text-white font-semibold text-base sm:text-lg">{formatPlate(result.plate || "")}</div>
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              Created: {result.createdAt ? new Date(result.createdAt).toLocaleString() : "—"}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}