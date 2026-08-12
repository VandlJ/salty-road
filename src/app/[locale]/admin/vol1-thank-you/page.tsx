"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import { AnimatedModal } from "@/components/animated-modal";
import { useModalA11y } from "@/lib/useModalA11y";
import { useAdminAuth } from "@/lib/useAdminAuth";

interface Counts {
  total: number;
  alreadySent: number;
  remaining: number;
}

interface SendResult {
  sent: number;
  failed: number;
  total: number;
}

export default function AdminVol1ThankYouPage() {
  const t = useTranslations("AdminVol1ThankYouPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [couponCode, setCouponCode] = useState("SALTYVOL1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const closeModal = useCallback(() => setConfirmOpen(false), []);
  const modalRef = useModalA11y<HTMLDivElement>(confirmOpen, closeModal);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/registrations/thank-you-email");
      if (!res.ok) throw new Error("failed");
      setCounts(await res.json());
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
      loadCounts();
    }
  }, [loggedIn, loadCounts]);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/registrations/thank-you-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(t("errorSend"));
        return;
      }
      setResult(json);
      await loadCounts();
    } catch (err) {
      console.error(err);
      setError(t("errorSend"));
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3 sm:gap-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-md">
          {t("title")}
        </h1>
        <Link
          href="/admin"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-transparent border border-gray-600 text-gray-300 font-bold uppercase tracking-wider text-sm hover:bg-gray-800 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          {t("backToAdmin")}
        </Link>
      </div>

      <p className="text-gray-400 text-sm mb-8">
        {t("intro")}{" "}
        <Link href="/admin/emails" className="underline hover:text-white transition-colors">
          {t("introEmailsLink")}
        </Link>
        .
      </p>

      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}

      {loading && !counts ? (
        <div className="text-white text-center font-bold animate-pulse">{t("loading")}</div>
      ) : counts ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-4 text-center">
              <div className="text-2xl font-extrabold text-white">{counts.total}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                {t("statTotal")}
              </div>
            </div>
            <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-4 text-center">
              <div className="text-2xl font-extrabold text-white">{counts.alreadySent}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                {t("statAlreadySent")}
              </div>
            </div>
            <div className="bg-[#111]/90 border border-brand rounded-sm p-4 text-center">
              <div className="text-2xl font-extrabold text-brand">{counts.remaining}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">
                {t("statRemaining")}
              </div>
            </div>
          </div>

          <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-white text-sm font-bold">{t("couponCodeLabel")}</label>
              <p className="text-gray-500 text-xs">{t("couponCodeHint")}</p>
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                maxLength={40}
                className="p-2 bg-white/5 border-2 border-gray-500 text-white text-sm font-mono focus:border-white focus:outline-none rounded-sm uppercase sm:w-64"
              />
            </div>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={counts.remaining === 0 || !couponCode.trim()}
              className="self-start px-6 py-3 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
            >
              {t("sendButton", { count: counts.remaining })}
            </button>
          </div>

          {result && (
            <div className="bg-[#111]/90 border border-green-700 rounded-sm p-4 text-sm">
              <p className="text-white font-bold">
                {t("resultSummary", { sent: result.sent, total: result.total })}
              </p>
              {result.failed > 0 && (
                <p className="text-red-400 mt-1">{t("resultFailed", { failed: result.failed })}</p>
              )}
            </div>
          )}
        </div>
      ) : null}

      <AnimatedModal
        open={confirmOpen}
        panelRef={modalRef}
        labelledBy="vol1-send-modal-title"
        panelClassName="bg-[#111] border-2 border-brand p-8 max-w-md w-full relative shadow-[0_0_20px_rgba(220,38,38,0.3)]"
      >
        <h3 id="vol1-send-modal-title" className="text-xl font-bold text-white mb-4 text-center">
          {t("confirmTitle")}
        </h3>
        <p className="text-gray-300 mb-8 text-center font-medium">
          {t("confirmBody", { count: counts?.remaining ?? 0, code: couponCode })}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-brand border border-brand-dark text-white font-bold uppercase tracking-wider hover:brightness-110 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {sending ? t("sending") : t("confirmSend")}
          </button>
        </div>
      </AnimatedModal>
    </section>
  );
}
