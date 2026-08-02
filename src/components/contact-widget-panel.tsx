"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";

const panelTransition = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

export default function ContactWidgetPanel({
  open,
  panelRef,
}: {
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("ContactWidget");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form on every re-open, including after a previous send — this
  // component now stays mounted across opens/closes (only the initial
  // dynamic import is deferred to first open), so state doesn't reset
  // itself just from unmounting like it used to.
  useEffect(() => {
    // Resetting the form's result state when the panel reopens, not a
    // render-cascade loop.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSent(false);
      setError(null);
    }
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={t("title")}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.92 }}
          transition={panelTransition}
          style={{ transformOrigin: "bottom right" }}
          className="absolute bottom-16 right-0 w-[calc(100vw-2.5rem)] max-w-sm bg-[#111] border border-gray-700 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
