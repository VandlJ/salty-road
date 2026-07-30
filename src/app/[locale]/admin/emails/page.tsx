"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import AdminLoginForm from "@/components/admin-login-form";
import { useAdminAuth } from "@/lib/useAdminAuth";

type TemplateMeta = { id: string; label: string; hasQr: boolean };
type Preview = { subject: string; text: string; html?: string; qrCodeBase64?: string };

export default function AdminEmailsPage() {
  const t = useTranslations("AdminEmailsPage");
  const { loggedIn, checking, recheck } = useAdminAuth();
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [view, setView] = useState<"text" | "html">("html");
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/emails");
      if (!res.ok) throw new Error("failed");
      const data: TemplateMeta[] = await res.json();
      setTemplates(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("errorLoad"));
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  useEffect(() => {
    if (loggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTemplates();
    }
  }, [loggedIn, loadTemplates]);

  useEffect(() => {
    if (!loggedIn || !selectedId) return;
    // Reset view state for the newly-selected template before the fetch
    // resolves, so stale content from the previous one doesn't flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingPreview(true);
    setPreview(null);
    setSendResult(null);
    fetch(`/api/admin/emails/${selectedId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data) => setPreview(data))
      .catch((err) => {
        console.error(err);
        setError(t("errorLoad"));
      })
      .finally(() => setLoadingPreview(false));
  }, [loggedIn, selectedId, t]);

  async function handleTestSend() {
    if (!selectedId || !testTo) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/emails/${selectedId}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo }),
      });
      setSendResult(res.ok ? "success" : "error");
    } catch (err) {
      console.error(err);
      setSendResult("error");
    } finally {
      setSending(false);
    }
  }

  if (checking) return null;
  if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;

  return (
    <section className="flex-1 w-full bg-transparent text-white px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-8 max-w-7xl mx-auto">
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

      {error && (
        <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 font-bold rounded-sm">
          {error}
        </div>
      )}

      {loadingList ? (
        <div className="text-white text-center font-bold animate-pulse">{t("loading")}</div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Template list */}
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible lg:w-64 flex-shrink-0 pb-1 lg:pb-0">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedId(tpl.id)}
                className={`text-left px-4 py-3 rounded-sm border text-sm font-bold whitespace-nowrap lg:whitespace-normal transition-colors flex-shrink-0 ${
                  selectedId === tpl.id
                    ? "bg-white text-black border-white"
                    : "bg-[#111]/90 text-gray-300 border-gray-700 hover:border-gray-500"
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Preview panel */}
          <div className="flex-1 min-w-0">
            {loadingPreview && (
              <div className="text-white text-center font-bold animate-pulse py-12">{t("loading")}</div>
            )}

            {!loadingPreview && preview && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-4">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">
                    {t("subject")}
                  </span>
                  <span className="text-white font-bold">{preview.subject}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setView("html")}
                    disabled={!preview.html}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      view === "html" ? "bg-white text-black border-white" : "bg-transparent text-gray-300 border-gray-600"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setView("text")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                      view === "text" ? "bg-white text-black border-white" : "bg-transparent text-gray-300 border-gray-600"
                    }`}
                  >
                    {t("plainText")}
                  </button>
                </div>

                {view === "html" && preview.html && (
                  <iframe
                    title="email-preview"
                    srcDoc={preview.html}
                    sandbox=""
                    className="w-full h-[500px] bg-white rounded-sm border border-gray-700"
                  />
                )}
                {view === "text" && (
                  <pre className="whitespace-pre-wrap break-words bg-[#111]/90 border border-gray-700 rounded-sm p-4 text-sm text-gray-300 max-h-[500px] overflow-y-auto">
                    {preview.text}
                  </pre>
                )}

                {preview.qrCodeBase64 && (
                  <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-4 flex flex-col items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                      {t("qrPreview")}
                    </span>
                    <Image
                      src={`data:image/png;base64,${preview.qrCodeBase64}`}
                      alt="QR"
                      width={160}
                      height={160}
                      unoptimized
                      className="bg-white p-2 rounded-sm"
                    />
                  </div>
                )}

                <div className="bg-[#111]/90 border border-gray-700 rounded-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                      {t("testSendLabel")}
                    </label>
                    <input
                      type="email"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder={t("testSendPlaceholder")}
                      className="p-3 bg-white/5 border-2 border-gray-600 text-white placeholder-gray-400 focus:border-white focus:outline-none text-sm rounded-sm"
                    />
                  </div>
                  <button
                    onClick={handleTestSend}
                    disabled={sending || !testTo}
                    className="px-6 py-3 bg-white text-black font-bold text-sm uppercase tracking-widest rounded-sm border-2 border-white hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? t("sending") : t("testSendButton")}
                  </button>
                </div>
                {sendResult === "success" && (
                  <div className="text-green-400 text-sm font-bold">{t("testSendSuccess")}</div>
                )}
                {sendResult === "error" && (
                  <div className="text-red-400 text-sm font-bold">{t("testSendError")}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
