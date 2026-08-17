// Types and the advisor rules. Deliberately free of imports: lib/heroVideoStore
// holds the Prisma side, so a unit test of the rules never constructs a client.

/** One encoded rendition of the loop, in the order the browser should try them. */
export type HeroVideoSource = {
  url: string;
  /** Full MIME with codecs, e.g. `video/mp4; codecs="av01.0.05M.08"`. */
  type: string;
  /** Optional media query gating this rendition, e.g. "(min-width: 1280px)". */
  media?: string;
  width: number;
  height: number;
  bytes: number;
};

export type HeroVideo = {
  poster: string;
  sources: HeroVideoSource[];
  /** Seconds into the source file, kept so the picker can reopen the choice. */
  start: number;
  end: number;
  /** Source filename and size — the file itself is never uploaded, so this is
   *  all the picker can show to say "this is what the current loop came from". */
  sourceName: string;
  sourceBytes: number;
  updatedAt: string;
};

/**
 * Reads the JSON column back into a HeroVideo, or null if it is anything
 * else.
 *
 * A cast would be shorter, but this value is rendered by the homepage's hero
 * on every request, and a row that is present but the wrong shape (a bad
 * write, a half-finished migration) would otherwise mean a video element with
 * an undefined poster on the site's front page. Null is always safe — it
 * falls back to the clip shipped in /public.
 */
export function parseHeroVideo(value: unknown): HeroVideo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.poster !== "string" || !Array.isArray(v.sources) || v.sources.length === 0) {
    return null;
  }
  const sources = v.sources.filter(
    (s): s is HeroVideoSource =>
      !!s &&
      typeof s === "object" &&
      typeof (s as HeroVideoSource).url === "string" &&
      typeof (s as HeroVideoSource).type === "string"
  );
  if (sources.length === 0) return null;

  return {
    poster: v.poster,
    sources,
    start: typeof v.start === "number" ? v.start : 0,
    end: typeof v.end === "number" ? v.end : 0,
    sourceName: typeof v.sourceName === "string" ? v.sourceName : "",
    sourceBytes: typeof v.sourceBytes === "number" ? v.sourceBytes : 0,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : "",
  };
}

// ---------------------------------------------------------------------------
// The advisor
// ---------------------------------------------------------------------------

// These thresholds are the whole point of the wizard, so they live here as
// named constants rather than as magic numbers inside the UI — the admin page
// displays them ("optimum is 6-12s") and the checks below enforce them, and
// those two must never drift apart.
export const HERO_VIDEO_RULES = {
  /** Below this a loop reads as a twitchy GIF rather than as footage. */
  minDurationSec: 5,
  idealMinDurationSec: 6,
  idealMaxDurationSec: 12,
  /** Past this the bytes stop paying for themselves on a decorative element. */
  maxDurationSec: 20,

  // Total transfer for the rendition a typical phone will actually pick.
  // In MiB rather than round decimal megabytes so these agree with the "1.9
  // MB" the advice text prints (which divides by 1048576) — otherwise a
  // selection reads as "1.9 MB, keep it under 2 MB", which is nonsense.
  idealMaxBytes: 2 * 1024 * 1024,
  maxBytes: 4 * 1024 * 1024,

  /** How close a boundary must be to a detected cut to count as landing on one. */
  cutToleranceSec: 0.2,

  /** Mean luma (0-255) below which a frame reads as black on screen. */
  minBoundaryLuma: 55,
  /** …and below which it is dark enough to be worth mentioning. */
  lowBoundaryLuma: 80,
} as const;

export type AdviceLevel = "error" | "warning" | "ok";

/**
 * Closed set, so the panel that renders these can map every one to a message
 * key and have TypeScript catch a code that was added without copy.
 */
export type AdviceCode =
  | "allGood"
  | "emptySelection"
  | "tooShort"
  | "shortish"
  | "longish"
  | "tooLong"
  | "heavyish"
  | "tooHeavy"
  | "seamStartNotOnCut"
  | "seamEndNotOnCut"
  | "seamNeitherOnCut"
  | "startTooDark"
  | "endTooDark"
  | "startDarkish"
  | "endDarkish"
  | "blackFrameInside";

export type Advice = {
  /** Stable id so the UI can translate it; never shown raw. */
  code: AdviceCode;
  level: AdviceLevel;
  /** Values interpolated into the translated message. */
  values?: Record<string, string | number>;
};

export type SelectionFacts = {
  start: number;
  end: number;
  /** Timestamps of detected cuts in the source, seconds, ascending. */
  cuts: number[];
  /** Mean luma of the first and last frame of the selection, 0-255. */
  startLuma: number;
  endLuma: number;
  /** Estimated bytes of the rendition most viewers will download. */
  estimatedBytes: number;
  /** Mean luma sampled across the selection, used to spot a fade to black. */
  lumaSamples?: { t: number; luma: number }[];
};

function nearestCutDistance(cuts: number[], t: number): number {
  if (cuts.length === 0) return Infinity;
  return cuts.reduce((best, c) => Math.min(best, Math.abs(c - t)), Infinity);
}

/**
 * Turns a selection into the list of things worth telling the admin, worst
 * first. Pure, so the rules are unit-testable without a browser, a video
 * decoder or a DOM.
 *
 * The checks encode what actually went wrong when this clip was cut by hand:
 * the first attempt started on a near-black frame, which made the poster →
 * video hand-off flash; and a window that ends mid-shot makes the loop jump
 * every 7 seconds in a way viewers notice without knowing why.
 */
export function evaluateSelection(facts: SelectionFacts): Advice[] {
  const advice: Advice[] = [];
  const duration = facts.end - facts.start;
  const R = HERO_VIDEO_RULES;

  if (duration <= 0) {
    return [{ code: "emptySelection", level: "error" }];
  }

  // --- duration ---
  if (duration < R.minDurationSec) {
    advice.push({
      code: "tooShort",
      level: "error",
      values: { duration: duration.toFixed(1), min: R.minDurationSec },
    });
  } else if (duration < R.idealMinDurationSec) {
    advice.push({
      code: "shortish",
      level: "warning",
      values: { duration: duration.toFixed(1), ideal: R.idealMinDurationSec },
    });
  } else if (duration > R.maxDurationSec) {
    advice.push({
      code: "tooLong",
      level: "error",
      values: { duration: duration.toFixed(1), max: R.maxDurationSec },
    });
  } else if (duration > R.idealMaxDurationSec) {
    advice.push({
      code: "longish",
      level: "warning",
      values: { duration: duration.toFixed(1), ideal: R.idealMaxDurationSec },
    });
  }

  // --- weight ---
  if (facts.estimatedBytes > R.maxBytes) {
    advice.push({
      code: "tooHeavy",
      level: "error",
      values: { mb: (facts.estimatedBytes / 1048576).toFixed(1), max: (R.maxBytes / 1048576).toFixed(0) },
    });
  } else if (facts.estimatedBytes > R.idealMaxBytes) {
    advice.push({
      code: "heavyish",
      level: "warning",
      values: { mb: (facts.estimatedBytes / 1048576).toFixed(1), ideal: (R.idealMaxBytes / 1048576).toFixed(0) },
    });
  }

  // --- the loop seam ---
  // Both ends matter equally: the seam is where the last frame meets the
  // first, so a clean cut at one end and a mid-shot chop at the other still
  // reads as a glitch.
  const startOnCut = nearestCutDistance(facts.cuts, facts.start) <= R.cutToleranceSec;
  const endOnCut = nearestCutDistance(facts.cuts, facts.end) <= R.cutToleranceSec;
  if (facts.cuts.length > 0 && !startOnCut && !endOnCut) {
    advice.push({ code: "seamNeitherOnCut", level: "warning" });
  } else if (facts.cuts.length > 0 && !startOnCut) {
    advice.push({ code: "seamStartNotOnCut", level: "warning" });
  } else if (facts.cuts.length > 0 && !endOnCut) {
    advice.push({ code: "seamEndNotOnCut", level: "warning" });
  }

  // --- boundary brightness ---
  // The poster is the first frame, so a dark first frame is doubly bad: the
  // hero sits on a black rectangle until the video is ready to take over.
  const darkest = Math.min(facts.startLuma, facts.endLuma);
  if (darkest < R.minBoundaryLuma) {
    advice.push({
      code: facts.startLuma <= facts.endLuma ? "startTooDark" : "endTooDark",
      level: "error",
      values: { luma: Math.round(darkest) },
    });
  } else if (darkest < R.lowBoundaryLuma) {
    advice.push({
      code: facts.startLuma <= facts.endLuma ? "startDarkish" : "endDarkish",
      level: "warning",
      values: { luma: Math.round(darkest) },
    });
  }

  // --- a fade to black inside the window ---
  // Not a seam problem, but it looks like the page broke for a moment.
  const inside = (facts.lumaSamples ?? []).filter(
    (s) => s.t > facts.start + 0.3 && s.t < facts.end - 0.3
  );
  const blackFrame = inside.find((s) => s.luma < 12);
  if (blackFrame) {
    advice.push({
      code: "blackFrameInside",
      level: "warning",
      values: { at: blackFrame.t.toFixed(1) },
    });
  }

  if (advice.length === 0) advice.push({ code: "allGood", level: "ok" });
  return advice.sort((a, b) => rank(a.level) - rank(b.level));
}

function rank(level: AdviceLevel) {
  return level === "error" ? 0 : level === "warning" ? 1 : 2;
}

/**
 * Picks the best loop in a clip: the wizard's opening move, so the admin
 * starts from something defensible instead of dragging blind.
 *
 * Only cut-to-cut windows are considered, because those are the only ones
 * that can loop without a visible jump. Among them it wants bright ends (the
 * first frame becomes the poster), no black frame in the middle, and a
 * duration near the middle of the ideal band.
 */
export function suggestWindow(
  cuts: number[],
  samples: { t: number; luma: number }[],
  duration: number
): { start: number; end: number } {
  const R = HERO_VIDEO_RULES;
  const lumaNear = (t: number) => {
    let best = 128;
    let bestD = Infinity;
    for (const s of samples) {
      const d = Math.abs(s.t - t);
      if (d < bestD) {
        bestD = d;
        best = s.luma;
      }
    }
    return best;
  };

  const idealMid = (R.idealMinDurationSec + R.idealMaxDurationSec) / 2;
  let best: { start: number; end: number; score: number } | null = null;

  for (let i = 0; i < cuts.length; i++) {
    const start = cuts[i];
    const startLuma = lumaNear(start);
    if (startLuma < R.minBoundaryLuma) continue;

    for (let j = i + 1; j < cuts.length; j++) {
      const end = cuts[j];
      const len = end - start;
      if (len < R.idealMinDurationSec) continue;
      if (len > R.idealMaxDurationSec) break;

      // The frame before the end cut is the one the loop actually ends on.
      const endLuma = lumaNear(end - 0.1);
      if (endLuma < R.minBoundaryLuma) continue;

      const inside = samples.filter((s) => s.t > start + 0.3 && s.t < end - 0.3);
      if (inside.some((s) => s.luma < 12)) continue;

      // Brightness is what the two hard failures were about, so it dominates;
      // the duration term only breaks ties between comparable windows.
      const score =
        Math.min(startLuma, endLuma) - Math.abs(len - idealMid) * 6;
      if (!best || score > best.score) best = { start, end, score };
    }
  }

  if (best) return { start: best.start, end: best.end };

  // Nothing cut-to-cut qualified — fall back to the first cut bright enough
  // to be a poster, running for the ideal minimum.
  const start = cuts.find((c) => lumaNear(c) >= R.lowBoundaryLuma) ?? cuts[0] ?? 0;
  return { start, end: Math.min(duration, start + R.idealMinDurationSec) };
}

/** True when nothing blocks applying the selection. Warnings do not block. */
export function selectionIsApplicable(advice: Advice[]) {
  return !advice.some((a) => a.level === "error");
}
