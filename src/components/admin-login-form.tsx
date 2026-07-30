"use client";

import { useTranslations } from "next-intl";
import React, { useState } from "react";

export default function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("AdminPage");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) {
        const j = await res.json();
        const errorMessages: Record<string, string> = {
          rate_limited: t("rateLimited"),
          missing_credentials: t("loginErrorMissing"),
          invalid_credentials: t("loginError"),
          server_error: t("loginErrorServer"),
        };
        setError(errorMessages[j?.error] ?? t("loginError"));
        return;
      }
      setUser("");
      setPass("");
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(t("loginError"));
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <section className="flex-1 bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-xl mx-auto flex items-center justify-center">
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
            <div className="relative">
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder={t("password")}
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-3 sm:p-4 pr-12 bg-white/5 border-2 border-gray-500 text-white placeholder-gray-400 focus:border-white focus:outline-none transition-colors text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute right-0 top-0 h-full px-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.8 21.8 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a21.8 21.8 0 01-3.22 4.65M14.12 14.12a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loggingIn}
            className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-black font-bold text-lg tracking-widest uppercase hover:bg-gray-200 hover:shadow-xl transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {loggingIn && (
              <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            )}
            {loggingIn ? t("loggingIn") : t("login")}
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
