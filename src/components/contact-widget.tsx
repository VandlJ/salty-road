"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/routing";

export default function ContactWidget() {
  const t = useTranslations("ContactWidget");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside closes the panel. Not a full modal (useModalA11y) — this
  // doesn't block interaction with the rest of the page, it's a small
  // floating panel, so no scroll-lock/focus-trap is appropriate here.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error === "invalid_email" ? t("errorInvalidEmail") : t("errorGeneric"));
        return;
      }
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  // Admin already has its own dedicated messages inbox — the public contact
  // bubble doesn't belong on those pages.
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("title")}
          className="widget-pop-in absolute bottom-16 right-0 w-[calc(100vw-2.5rem)] max-w-sm bg-[#111] border border-gray-700 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">{t("title")}</h2>
            <p className="text-gray-400 text-xs mt-1">{t("subtitle")}</p>
          </div>

          {sent ? (
            <div className="flex items-center gap-2 text-green-500 font-bold text-sm py-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("sent")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
                maxLength={100}
                className="w-full px-3 py-2 bg-white/5 text-white placeholder-gray-500 border-2 border-gray-600 rounded-sm focus:outline-none focus:border-white transition-colors text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                maxLength={200}
                className="w-full px-3 py-2 bg-white/5 text-white placeholder-gray-500 border-2 border-gray-600 rounded-sm focus:outline-none focus:border-white transition-colors text-sm"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                required
                maxLength={2000}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 text-white placeholder-gray-500 border-2 border-gray-600 rounded-sm focus:outline-none focus:border-white transition-colors text-sm resize-none"
              />
              {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-white text-black font-bold text-xs tracking-widest uppercase rounded-sm hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t("sending") : t("submit")}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (sent) setSent(false);
        }}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-black border-2 border-brand shadow-2xl flex items-center justify-center hover:scale-105 transition-transform cursor-pointer overflow-hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <Image
            src="/logo_saltyroad-cropped.svg"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9"
            style={{ filter: "invert(1)" }}
          />
        )}
      </button>
    </div>
  );
}
