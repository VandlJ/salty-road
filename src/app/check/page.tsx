"use client";

import React, { useState } from "react";

export default function CheckPage() {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: number; status: string; name?: string; createdAt?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(`/api/check?plate=${encodeURIComponent(q)}`);
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
    <section className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Check registration status</h1>
      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Enter licence plate"
          className="flex-1 p-2 border"
        />
        <button className="px-4 py-2 bg-gray-800 text-white" disabled={loading}>
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {result && (
        <div className="p-4 border rounded">
          <div className="mb-2">Name: <strong>{result.name || "—"}</strong></div>
          <div className="mb-2">Status: <strong>{result.status || "pending"}</strong></div>
          <div className="text-sm text-gray-600">ID: {result.id} — created: {result.createdAt ? new Date(result.createdAt).toLocaleString() : "—"}</div>
        </div>
      )}
    </section>
  );
}