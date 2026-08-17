"use client";

import { useTranslations } from "next-intl";
import type { Advice, AdviceCode } from "@/lib/heroVideo";

// The wizard's voice. Every line is a rule from lib/heroVideo.ts, translated
// here — the rules themselves stay free of copy so they can be unit-tested.

const STYLES = {
  error: { dot: "bg-red-500", text: "text-red-300", border: "border-red-900/60 bg-red-950/30" },
  warning: { dot: "bg-yellow-500", text: "text-yellow-200", border: "border-yellow-900/60 bg-yellow-950/20" },
  ok: { dot: "bg-emerald-500", text: "text-emerald-200", border: "border-emerald-900/60 bg-emerald-950/20" },
} as const;

export default function AdvisorPanel({
  advice,
  stats,
}: {
  advice: Advice[];
  stats: { duration: number; estimatedMb: string; cuts: number; fps: number };
}) {
  const t = useTranslations("AdminHeroPage.advice");
  const tStats = useTranslations("AdminHeroPage.stats");

  // Spelled out rather than `t(a.code)`: next-intl can only verify a key it
  // can see, and a Record over the AdviceCode union makes TypeScript fail the
  // build if a rule is ever added without a message to go with it.
  const v = (a: Advice) => a.values ?? {};
  const LINES: Record<AdviceCode, (a: Advice) => string> = {
    allGood: () => t("allGood"),
    emptySelection: () => t("emptySelection"),
    tooShort: (a) => t("tooShort", v(a)),
    shortish: (a) => t("shortish", v(a)),
    longish: (a) => t("longish", v(a)),
    tooLong: (a) => t("tooLong", v(a)),
    heavyish: (a) => t("heavyish", v(a)),
    tooHeavy: (a) => t("tooHeavy", v(a)),
    seamStartNotOnCut: () => t("seamStartNotOnCut"),
    seamEndNotOnCut: () => t("seamEndNotOnCut"),
    seamNeitherOnCut: () => t("seamNeitherOnCut"),
    startTooDark: (a) => t("startTooDark", v(a)),
    endTooDark: (a) => t("endTooDark", v(a)),
    startDarkish: (a) => t("startDarkish", v(a)),
    endDarkish: (a) => t("endDarkish", v(a)),
    blackFrameInside: (a) => t("blackFrameInside", v(a)),
  };

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-px bg-gray-800 border border-gray-800 text-sm">
        {[
          [tStats("duration"), `${stats.duration.toFixed(2)} s`],
          [tStats("estimatedSize"), `~${stats.estimatedMb} MB`],
          [tStats("cuts"), String(stats.cuts)],
          [tStats("fps"), String(stats.fps)],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-950 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-widest text-gray-500">{label}</dt>
            <dd className="text-white font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-2">
        {advice.map((a) => {
          const style = STYLES[a.level];
          return (
            <li
              key={a.code}
              className={`flex gap-3 items-start border px-3 py-2 text-sm ${style.border}`}
            >
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
              <span className={style.text}>{LINES[a.code](a)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
