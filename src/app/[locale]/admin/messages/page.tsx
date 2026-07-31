"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import Skeleton from "@/components/skeleton";
import { FadeSwap } from "@/components/fade-swap";
import { AnimatePresence, motion } from "motion/react";
import { useAdminAuth } from "@/lib/useAdminAuth";
import type { ContactMessage } from "@/types/merch";

export default function AdminMessagesPage() {
  const t = useTranslations("AdminMessagesPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact-messages");
      if (!res.ok) throw new Error("Failed to load");
      setMessages(await res.json());
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (loggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMessages();
    }
  }, [loggedIn, loadMessages]);

  async function toggleExpand(message: ContactMessage) {
    const opening = expandedId !== message.id;
    setExpandedId(opening ? message.id : null);
    if (opening && !message.read) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, read: true } : m)));
      await fetch(`/api/admin/contact-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    }
  }

  async function removeMessage(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" });
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("title")}{" "}
          {unreadCount > 0 && <span className="text-gray-400 text-2xl ml-2">({unreadCount})</span>}
        </h1>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-600 text-gray-300 font-bold uppercase tracking-wider text-sm hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          {t("backToAdmin")}
        </Link>
      </div>

      {loading && (
        <div className="text-white mb-6 text-center font-bold animate-pulse">{t("loading")}</div>
      )}
      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}
      {!loading && !error && messages.length === 0 && (
        <div className="text-center text-gray-500 font-bold">{t("noMessages")}</div>
      )}

      <FadeSwap activeKey={loading && messages.length === 0 ? "skeleton" : "content"}>
      {loading && messages.length === 0 ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
          {messages.map((message) => {
            const expanded = expandedId === message.id;
            return (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-[#111]/90 border rounded-sm overflow-hidden ${
                  message.read ? "border-gray-700" : "border-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(message)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {!message.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-white font-bold text-sm truncate">{message.name}</div>
                      <div className="text-xs text-gray-400 truncate">{message.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {new Date(message.createdAt).toLocaleDateString("cs-CZ")}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex flex-col gap-3">
                      <p className="text-gray-200 text-sm whitespace-pre-wrap border-t border-gray-800 pt-3">
                        {message.message}
                      </p>
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeMessage(message.id)}
                          className="px-3 py-1.5 bg-transparent hover:bg-red-900/30 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[10px] border border-red-900/50 hover:border-red-500 rounded-sm transition-all cursor-pointer"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
      </FadeSwap>
    </section>
  );
}
