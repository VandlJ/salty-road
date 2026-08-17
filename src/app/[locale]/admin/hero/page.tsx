"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import AdminGate from "@/components/admin-gate";
import AdminPageHeader from "@/components/admin-page-header";
import { useAdminAuth } from "@/lib/useAdminAuth";
import {
  evaluateSelection,
  selectionIsApplicable,
  suggestWindow,
  type Advice,
  type HeroVideo,
  type HeroVideoSource,
} from "@/lib/heroVideo";
import { analyzeVideo, lumaAt, type Analysis } from "./_lib/analyze";
import {
  candidateRenditions,
  supportedRenditions,
  estimateBytes,
  encodeRenditions,
  encodePoster,
  type RenditionSpec,
} from "./_lib/encode";
import LoopTimeline from "./_components/loop-timeline";
import LoopPreview from "./_components/loop-preview";
import AdvisorPanel from "./_components/advisor-panel";

type Phase =
  | { step: "idle" }
  | { step: "analyzing"; progress: number }
  | { step: "ready" }
  | { step: "encoding"; label: string; progress: number }
  | { step: "uploading"; progress: number }
  | { step: "saved" };

export default function AdminHeroPage() {
  const t = useTranslations("AdminHeroPage");
  const auth = useAdminAuth();
  const { loggedIn } = auth;

  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [boundaryLuma, setBoundaryLuma] = useState({ start: 255, end: 255 });
  const [specs, setSpecs] = useState<RenditionSpec[]>([]);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [scrubTo, setScrubTo] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [current, setCurrent] = useState<HeroVideo | null>(null);
  const [editionName, setEditionName] = useState<string | null>(null);

  // The element the analysis and the encoder seek against. Kept off-screen and
  // separate from the preview's element so scrubbing for a frame never fights
  // with playback the admin is watching.
  const workRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/admin/hero", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json) return;
        setCurrent(json.heroVideo ?? null);
        setEditionName(json.editionName ?? null);
      })
      .catch(() => {
        /* The picker still works without knowing what is live. */
      });
  }, [loggedIn]);

  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const handleFile = useCallback(
    async (picked: File) => {
      setError(null);
      setAnalysis(null);
      setPhase({ step: "analyzing", progress: 0 });

      const url = URL.createObjectURL(picked);
      setFile(picked);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });

      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.preload = "auto";
      workRef.current = video;

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("decode"));
        });

        const result = await analyzeVideo(video, (p) =>
          setPhase({ step: "analyzing", progress: p })
        );
        setAnalysis(result);

        const available = await supportedRenditions(candidateRenditions(result.width));
        setSpecs(available);
        if (available.length === 0) {
          setError(t("errors.noCodec"));
          setPhase({ step: "idle" });
          return;
        }

        // Open on the wizard's own pick rather than at 0, so the first thing
        // the admin sees is already a valid loop they can accept or adjust.
        setRange(suggestWindow(result.cuts, result.samples, result.duration));
        setPhase({ step: "ready" });
      } catch {
        setError(t("errors.decode"));
        setPhase({ step: "idle" });
      }
    },
    [t]
  );

  // Boundary brightness is measured, not interpolated from the coarse
  // samples — it is the check that blocks applying, so it has to look at the
  // actual frames the loop starts and ends on.
  //
  // Debounced, because this runs on every pointermove of a drag: each pass is
  // two seeks on the shared work element, so an unthrottled drag queued
  // hundreds of them and the readings arrived long after the handle had moved
  // on. Waiting for the drag to settle costs nothing — the value only matters
  // once the admin stops somewhere.
  useEffect(() => {
    const video = workRef.current;
    if (!video || !analysis || phase.step !== "ready") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const s = await lumaAt(video, range.start + 0.02);
          const e = await lumaAt(video, Math.max(range.start, range.end - 0.05));
          if (!cancelled) setBoundaryLuma({ start: s, end: e });
        } catch {
          /* A failed probe leaves the previous reading; the next drag retries. */
        }
      })();
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [analysis, range.start, range.end, phase.step]);

  const estimated = useMemo(
    () => estimateBytes(specs, range.end - range.start),
    [specs, range]
  );

  const advice: Advice[] = useMemo(() => {
    if (!analysis) return [];
    return evaluateSelection({
      start: range.start,
      end: range.end,
      cuts: analysis.cuts,
      startLuma: boundaryLuma.start,
      endLuma: boundaryLuma.end,
      estimatedBytes: estimated,
      lumaSamples: analysis.samples,
    });
  }, [analysis, range, boundaryLuma, estimated]);

  const canApply = analysis !== null && selectionIsApplicable(advice) && phase.step === "ready";

  const apply = async () => {
    if (!analysis || !file || !objectUrl) return;
    setError(null);

    // A dedicated element rather than the shared workRef one. The encoder
    // seeks and then reads the frame it landed on, so anything else moving
    // that element in between — a boundary-brightness probe that was already
    // in flight when Publish was pressed — would be silently baked into the
    // output. Its own element cannot be moved by anyone.
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.preload = "auto";

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("decode"));
      });

      const encoded = await encodeRenditions(
        video,
        specs,
        range.start,
        range.end,
        analysis.fps,
        (p) =>
          setPhase({
            step: "encoding",
            label: p.renditionId,
            progress: (p.index + p.fraction) / p.total,
          })
      );
      const poster = await encodePoster(video, range.start);

      const stamp = Date.now();
      const put = async (blob: Blob, name: string) => {
        const result = await upload(`hero/${stamp}-${name}`, blob, {
          access: "public",
          handleUploadUrl: "/api/admin/hero/upload",
          contentType: blob.type,
        });
        return result.url;
      };

      const total = encoded.length + 1;
      let done = 0;
      const bump = () => setPhase({ step: "uploading", progress: ++done / total });

      const posterUrl = await put(poster, "poster.webp");
      bump();

      const sources: HeroVideoSource[] = [];
      for (const r of encoded) {
        sources.push({
          url: await put(r.blob, `${r.id}.mp4`),
          type: r.mimeType,
          ...(r.media ? { media: r.media } : {}),
          width: r.width,
          height: r.height,
          bytes: r.blob.size,
        });
        bump();
      }

      const heroVideo = {
        poster: posterUrl,
        sources,
        start: range.start,
        end: range.end,
        sourceName: file.name,
        sourceBytes: file.size,
      };

      const res = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroVideo }),
      });
      if (!res.ok) throw new Error("save");
      const json = await res.json();
      setCurrent(json.heroVideo);
      setPhase({ step: "saved" });
    } catch {
      setError(t("errors.apply"));
      setPhase({ step: "ready" });
    } finally {
      // Frees the decoder whether the publish succeeded or blew up.
      video.removeAttribute("src");
      video.load();
    }
  };

  const revert = async () => {
    if (!confirm(t("revertConfirm"))) return;
    const res = await fetch("/api/admin/hero", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroVideo: null }),
    });
    if (res.ok) setCurrent(null);
  };

  const busy = phase.step === "analyzing" || phase.step === "encoding" || phase.step === "uploading";

  return (
    <AdminGate auth={auth}>
      <div className="min-h-screen bg-black px-4 py-8 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <AdminPageHeader
            title={t("title")}
            eyebrow={editionName ?? undefined}
            subtitle={t("subtitle")}
          />

          <section className="border border-gray-800 bg-gray-950 p-4 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">{t("live.title")}</h2>
            {current ? (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                {/* eslint-disable-next-line @next/next/no-img-element -- a Blob
                    poster at thumbnail size; next/image would add a proxy hop
                    for one 80px image. */}
                <img src={current.poster} alt="" className="h-14 w-24 object-cover border border-gray-700" />
                <div className="tabular-nums">
                  <p>{t("live.range", { start: current.start.toFixed(2), end: current.end.toFixed(2) })}</p>
                  <p className="text-gray-500">
                    {t("live.source", { name: current.sourceName })} ·{" "}
                    {t("live.weight", {
                      mb: (Math.min(...current.sources.map((s) => s.bytes)) / 1048576).toFixed(2),
                    })}
                  </p>
                </div>
                <button
                  onClick={revert}
                  className="ml-auto px-4 py-2 border border-gray-600 text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 hover:text-white transition-colors"
                >
                  {t("revert")}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("live.none")}</p>
            )}
          </section>

          <label className="block border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors p-8 text-center cursor-pointer mb-6">
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) void handleFile(picked);
              }}
            />
            <span className="block text-white font-bold uppercase tracking-wider text-sm">
              {file ? file.name : t("pick.cta")}
            </span>
            <span className="block text-gray-500 text-xs mt-1">{t("pick.hint")}</span>
          </label>

          {error && (
            <p className="border border-red-900 bg-red-950/40 text-red-300 text-sm px-3 py-2 mb-6">{error}</p>
          )}

          {phase.step === "analyzing" && (
            <Progress label={t("progress.analyzing")} value={phase.progress} />
          )}
          {phase.step === "encoding" && (
            <Progress label={t("progress.encoding", { rendition: phase.label })} value={phase.progress} />
          )}
          {phase.step === "uploading" && (
            <Progress label={t("progress.uploading")} value={phase.progress} />
          )}

          {analysis && objectUrl && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
                <LoopPreview
                  src={objectUrl}
                  start={range.start}
                  end={range.end}
                  scrubTo={scrubTo}
                  onTime={setPlayhead}
                />
                <AdvisorPanel
                  advice={advice}
                  stats={{
                    duration: range.end - range.start,
                    estimatedMb: (estimated / 1048576).toFixed(2),
                    cuts: analysis.cuts.length,
                    fps: analysis.fps,
                  }}
                />
              </div>

              <LoopTimeline
                analysis={analysis}
                start={range.start}
                end={range.end}
                playhead={scrubTo ?? playhead}
                onChange={setRange}
                onScrub={setScrubTo}
              />

              <p className="text-xs text-gray-500">{t("timelineHint")}</p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={apply}
                  disabled={!canApply}
                  className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("apply")}
                </button>
                <span className="text-xs text-gray-500">
                  {t("applyHint", {
                    count: specs.length,
                    list: specs.map((s) => s.id).join(", "),
                  })}
                </span>
              </div>

              {phase.step === "saved" && (
                <p className="border border-emerald-900 bg-emerald-950/30 text-emerald-200 text-sm px-3 py-2">
                  {t("saved")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1 bg-gray-800">
        <div className="h-full bg-brand transition-[width]" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
