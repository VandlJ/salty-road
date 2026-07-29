"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";

export default function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("AdminPage");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        setError(j?.error === "rate_limited" ? t("rateLimited") : t("loginError"));
        return;
      }
      setUser("");
      setPass("");
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(t("loginError"));
    }
  }

  return (
    <section className="min-h-screen bg-transparent text-white p-4 sm:p-8 max-w-xl mx-auto flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 sm:mb-8 text-white text-center drop-shadow-md">
          {t("loginTitle")}
        </h1>
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 sm:gap-6 bg-[#111]/80 p-8 border border-gray-600 shadow-2xl backdrop-blur-md"
        >
          <div className="flex flex-col gap-2">
            <label className="text-white font-bold tracking-wide">{t("username")}</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder={t("username")}
              required
              className="p-3 sm:p-4 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-white font-bold tracking-wide">{t("password")}</label>
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={t("password")}
              type="password"
              required
              className="p-3 sm:p-4 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
            />
          </div>
          <button className="px-6 py-3 bg-white text-black font-bold text-lg tracking-widest uppercase hover:bg-gray-200 hover:shadow-xl transition-all duration-200 mt-2 cursor-pointer">
            {t("login")}
          </button>
          {error && (
            <div className="text-red-400 p-3 border border-red-500/50 bg-red-900/20 text-center text-sm font-bold">
              {error}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
