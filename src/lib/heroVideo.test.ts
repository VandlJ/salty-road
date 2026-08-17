import { describe, it, expect } from "vitest";
import {
  evaluateSelection,
  selectionIsApplicable,
  suggestWindow,
  parseHeroVideo,
  HERO_VIDEO_RULES as R,
  type SelectionFacts,
} from "@/lib/heroVideo";

// The advisor is the only thing standing between an admin and a hero loop
// that flashes black or jumps every seven seconds — both of which happened
// when this clip was first cut by hand. Every rule here corresponds to one of
// those failures.

const good: SelectionFacts = {
  start: 6,
  end: 13.44,
  cuts: [3.56, 6, 9.2, 13.44, 15.88],
  startLuma: 124,
  endLuma: 110,
  estimatedBytes: 1_400_000,
};

const codes = (f: Partial<SelectionFacts>) =>
  evaluateSelection({ ...good, ...f }).map((a) => a.code);

describe("evaluateSelection", () => {
  it("reports a clean selection as good and applicable", () => {
    const advice = evaluateSelection(good);
    expect(advice.map((a) => a.code)).toEqual(["allGood"]);
    expect(selectionIsApplicable(advice)).toBe(true);
  });

  it("blocks a selection whose first frame is near-black", () => {
    // The exact regression: a cut at 3.56s had a mean luma of 16.7, and the
    // poster (which is the first frame) made the hero flash black on load.
    const advice = evaluateSelection({ ...good, start: 3.56, startLuma: 16.7 });
    expect(advice.map((a) => a.code)).toContain("startTooDark");
    expect(selectionIsApplicable(advice)).toBe(false);
  });

  it("names whichever boundary is darker", () => {
    expect(codes({ startLuma: 20, endLuma: 200 })).toContain("startTooDark");
    expect(codes({ startLuma: 200, endLuma: 20 })).toContain("endTooDark");
  });

  it("warns rather than blocks on a merely dim boundary", () => {
    const advice = evaluateSelection({ ...good, startLuma: 70 });
    expect(advice.map((a) => a.code)).toContain("startDarkish");
    expect(selectionIsApplicable(advice)).toBe(true);
  });

  it("flags each end of the seam independently", () => {
    expect(codes({ start: 7.1 })).toContain("seamStartNotOnCut");
    expect(codes({ end: 12.0 })).toContain("seamEndNotOnCut");
    expect(codes({ start: 7.1, end: 12.0 })).toContain("seamNeitherOnCut");
  });

  it("accepts a boundary that is close to a cut without being exact", () => {
    // Frame-accurate dragging is not a thing a human does with a mouse.
    const nearly = R.cutToleranceSec * 0.9;
    expect(codes({ start: 6 + nearly })).not.toContain("seamStartNotOnCut");
    expect(codes({ start: 6 + R.cutToleranceSec * 2 })).toContain("seamStartNotOnCut");
  });

  it("says nothing about the seam when no cuts were detected", () => {
    // A single continuous shot has no cuts to land on; complaining would be
    // noise the admin can do nothing about.
    expect(codes({ cuts: [] })).not.toContain("seamNeitherOnCut");
  });

  it("separates too-short from merely short", () => {
    expect(codes({ end: good.start + R.minDurationSec - 0.5 })).toContain("tooShort");
    expect(codes({ end: good.start + R.idealMinDurationSec - 0.5 })).toContain("shortish");
  });

  it("separates too-long from merely long", () => {
    const cuts = [good.start, good.start + 30];
    expect(codes({ end: good.start + R.maxDurationSec + 1, cuts })).toContain("tooLong");
    expect(codes({ end: good.start + R.idealMaxDurationSec + 1, cuts })).toContain("longish");
  });

  it("blocks on weight only past the hard cap", () => {
    expect(codes({ estimatedBytes: R.idealMaxBytes + 1 })).toContain("heavyish");
    expect(selectionIsApplicable(evaluateSelection({ ...good, estimatedBytes: R.idealMaxBytes + 1 }))).toBe(true);

    const heavy = evaluateSelection({ ...good, estimatedBytes: R.maxBytes + 1 });
    expect(heavy.map((a) => a.code)).toContain("tooHeavy");
    expect(selectionIsApplicable(heavy)).toBe(false);
  });

  it("spots a fade to black inside the window but ignores one at the edges", () => {
    expect(
      codes({ lumaSamples: [{ t: 9, luma: 4 }] })
    ).toContain("blackFrameInside");
    // A dark frame right at a boundary is already covered by the luma checks;
    // reporting it twice would just be noise.
    expect(
      codes({ lumaSamples: [{ t: good.start + 0.1, luma: 4 }] })
    ).not.toContain("blackFrameInside");
  });

  it("returns a single error for an inverted or empty selection", () => {
    expect(codes({ end: good.start })).toEqual(["emptySelection"]);
    expect(codes({ end: good.start - 1 })).toEqual(["emptySelection"]);
  });

  it("orders errors before warnings", () => {
    const advice = evaluateSelection({
      ...good,
      start: 7.1, // warning: seam
      startLuma: 10, // error: black
    });
    expect(advice[0].level).toBe("error");
    expect(advice.at(-1)!.level).toBe("warning");
  });
});

describe("suggestWindow", () => {
  // Samples every 0.2s at a given brightness, so a fixture reads as
  // "the clip is this bright from here to here".
  const samplesFrom = (spans: [number, number, number][]) => {
    const out: { t: number; luma: number }[] = [];
    for (const [from, to, luma] of spans) {
      for (let t = from; t < to; t += 0.2) out.push({ t: Number(t.toFixed(1)), luma });
    }
    return out;
  };

  it("returns a cut-to-cut window inside the ideal duration band", () => {
    const cuts = [0, 4, 12, 20, 30];
    const { start, end } = suggestWindow(cuts, samplesFrom([[0, 30, 150]]), 30);
    expect(cuts).toContain(start);
    expect(cuts).toContain(end);
    expect(end - start).toBeGreaterThanOrEqual(R.idealMinDurationSec);
    expect(end - start).toBeLessThanOrEqual(R.idealMaxDurationSec);
  });

  it("refuses a window that starts on a dark cut", () => {
    // The regression this whole screen exists to prevent: the brightest
    // available start wins even though the dark one comes first.
    const cuts = [0, 9, 18];
    const samples = samplesFrom([
      [0, 9, 20], // dark opening shot
      [9, 18, 160],
    ]);
    expect(suggestWindow(cuts, samples, 18).start).toBe(9);
  });

  it("skips a window containing a fade to black", () => {
    const cuts = [0, 8, 16, 24];
    const samples = samplesFrom([
      [0, 4, 150],
      [4, 5, 3], // black mid-shot, inside 0-8
      [5, 24, 150],
    ]);
    const { start } = suggestWindow(cuts, samples, 24);
    expect(start).not.toBe(0);
  });

  it("prefers a duration near the middle of the ideal band", () => {
    const cuts = [0, 6, 15, 40];
    const { start, end } = suggestWindow(cuts, samplesFrom([[0, 40, 150]]), 40);
    // 6->15 (9s) sits nearer the ideal midpoint than 0->6 (6s, too short to
    // even qualify) or 15->40 (25s, past the band).
    expect({ start, end }).toEqual({ start: 6, end: 15 });
  });

  it("falls back to a bright cut when nothing cut-to-cut qualifies", () => {
    // Cuts too far apart for any pair to land in the ideal band.
    const cuts = [0, 40];
    const samples = samplesFrom([
      [0, 20, 30], // dark
      [20, 60, 140],
    ]);
    const { start, end } = suggestWindow(cuts, samples, 60);
    expect(start).toBe(40);
    expect(end - start).toBeCloseTo(R.idealMinDurationSec, 5);
  });

  it("survives a clip with no detected cuts at all", () => {
    const { start, end } = suggestWindow([], samplesFrom([[0, 20, 150]]), 20);
    expect(start).toBe(0);
    expect(end).toBeGreaterThan(0);
  });
});

describe("parseHeroVideo", () => {
  const valid = {
    poster: "https://blob/p.webp",
    sources: [{ url: "https://blob/a.mp4", type: 'video/mp4; codecs="avc1.640028"', width: 1280, height: 720, bytes: 1 }],
    start: 1,
    end: 9,
    sourceName: "clip.mp4",
    sourceBytes: 10,
    updatedAt: "2026-08-17T00:00:00.000Z",
  };

  it("passes a well-formed value through", () => {
    expect(parseHeroVideo(valid)).toEqual(valid);
  });

  it("rejects the shapes that would break the homepage", () => {
    // `{ set: null }` is what Prisma writes when a Json? column is cleared
    // with the wrong shorthand — it is present, so a bare null check lets it
    // through, and the hero then renders a poster with an undefined src.
    expect(parseHeroVideo({ set: null })).toBeNull();
    expect(parseHeroVideo(null)).toBeNull();
    expect(parseHeroVideo("nope")).toBeNull();
    expect(parseHeroVideo([])).toBeNull();
    expect(parseHeroVideo({ ...valid, sources: [] })).toBeNull();
    expect(parseHeroVideo({ ...valid, poster: 123 })).toBeNull();
    expect(parseHeroVideo({ ...valid, sources: [{ url: 1 }] })).toBeNull();
  });

  it("tolerates missing bookkeeping fields rather than discarding the clip", () => {
    // start/end/sourceName only feed the picker's "what is live" panel; a clip
    // that plays should not be thrown away because one of them is absent.
    const parsed = parseHeroVideo({ poster: valid.poster, sources: valid.sources });
    expect(parsed?.sources).toHaveLength(1);
    expect(parsed?.start).toBe(0);
  });
});
