"use client";

import React, { useEffect, useState } from "react";

type Registration = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  car: string;
  plate: string;
  description: string;
  instagram?: string | null;
  photos?: string[];
  status?: string;
  createdAt?: string;
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkAuthAndLoad() {
    // try load list; if 401 then not logged in
    try {
      setLoading(true);
      const res = await fetch("/api/admin/registrations");
      if (res.status === 401) {
        setLoggedIn(false);
        setRegs([]);
      } else {
        const data = await res.json();
        setRegs(data);
        setLoggedIn(true);
      }
    } catch (e) {
      console.error(e);
      setError("Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error || "Login failed");
        return;
      }
      setUser("");
      setPass("");
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError("Login error");
    }
  }

  async function handleAction(id: number, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error || "Action failed");
        return;
      }
      await checkAuthAndLoad();
    } catch (err) {
      console.error(err);
      setError("Network error");
    }
  }

  if (!loggedIn) {
    return (
      <section className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" required className="p-2 border" />
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="password" type="password" required className="p-2 border" />
          <button className="px-4 py-2 bg-gray-800 text-white">Login</button>
          {error && <div className="text-red-500">{error}</div>}
        </form>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Registrations ({regs.length})</h1>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="space-y-4">
        {regs.map((r) => (
          <div key={r.id} className="p-4 border rounded">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{r.name} <span className="text-sm text-gray-500">({r.email})</span></div>
                <div className="text-sm text-gray-600">{r.car} — {r.plate}</div>
                <div className="text-sm mt-2">{r.description}</div>
                {r.instagram && <div className="text-sm text-blue-600">Instagram: {r.instagram}</div>}
                {r.photos && r.photos.length > 0 && (
                  <div className="text-sm mt-2">Photos: {r.photos.join(", ")}</div>
                )}
              </div>
              <div className="text-right">
                <div className="mb-2">Status: <strong>{r.status || "pending"}</strong></div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleAction(r.id, "accept")} className="px-3 py-1 bg-green-600 text-white rounded">Accept</button>
                  <button onClick={() => handleAction(r.id, "decline")} className="px-3 py-1 bg-red-600 text-white rounded">Decline</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}