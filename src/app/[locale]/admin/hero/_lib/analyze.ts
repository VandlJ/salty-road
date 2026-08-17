// Frame analysis for the hero clip picker. Everything here runs in the
// admin's browser against a File the admin picked from disk — the source
// video is never uploaded, so seeking is local and fast.

export type LumaSample = { t: number; luma: number };

export type Analysis = {
  duration: number;
  width: number;
  height: number;
  /** Source frame rate, measured rather than assumed. */
  fps: number;
  samples: LumaSample[];
  /** Cut timestamps, refined to frame accuracy. */
  cuts: number[];
  /**
   * Evenly spaced preview frames as data URLs.
   *
   * Individual images rather than one pre-composited strip: the strip has to
   * be stretched to whatever width the track ends up, and at 60-odd frames
   * across a 1000px track that squeezes every thumbnail into an unreadable
   * smear. Separate images in a flex row let each one object-cover its cell,
   * so they crop instead of distorting and the row adapts to any width.
   */
  thumbs: string[];
};

/** Coarse pass resolution. 5/s is enough to *find* a cut; refineCut places it. */
const COARSE_FPS = 5;
/** Mean-abs-difference above which two consecutive samples are a cut, 0-1. */
const CUT_THRESHOLD = 0.11;
/** Analysis frames are downscaled to this width — luma and diffs don't need pixels. */
const ANALYSIS_WIDTH = 96;
/** Thumbnails are decorative; this is plenty at the size they render. */
const THUMB_HEIGHT = 112;
const THUMB_COUNT = 36;

// One in-flight seek per element, enforced.
//
// A video element has a single "seeked" event, so two overlapping seeks both
// listen for it and the second currentTime assignment simply overwrites the
// first. Both promises then resolve, each believing the element is parked at
// its own timestamp, and whichever caller reads a frame next gets the wrong
// one. That is not theoretical here: the boundary-brightness probe fires as
// the admin drags, and a wrong reading flips the advisor's verdict on the
// check that actually blocks publishing.
const seekQueue = new WeakMap<HTMLVideoElement, Promise<unknown>>();

export function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  const previous = seekQueue.get(video) ?? Promise.resolve();
  // Swallow the predecessor's rejection so one timed-out seek doesn't poison
  // every later one; its own caller still sees the failure.
  const next = previous.then(
    () => rawSeek(video, t),
    () => rawSeek(video, t)
  );
  seekQueue.set(video, next);
  return next;
}

function rawSeek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`seek to ${t.toFixed(2)}s timed out`));
    }, 5000);
    const done = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
    };
    video.addEventListener("seeked", done);
    // Clamping matters: assigning past duration never fires "seeked" in
    // Chrome, which would hang the whole analysis on the last frame.
    video.currentTime = Math.max(0, Math.min(t, Math.max(0, video.duration - 1e-3)));
  });
}

/**
 * Measures the source frame rate by playing a fraction of a second and
 * timing the frames the compositor actually presents.
 *
 * Assuming 25 would be wrong often enough to matter: resampling 30fps
 * footage to 25 adds a visible stutter to a loop that plays forever.
 */
async function measureFps(video: HTMLVideoElement): Promise<number> {
  if (!("requestVideoFrameCallback" in video)) return 25;
  const times: number[] = [];
  await seekTo(video, Math.min(1, video.duration / 4));
  try {
    await video.play();
  } catch {
    return 25;
  }
  await new Promise<void>((resolve) => {
    const tick = (_now: number, meta: VideoFrameCallbackMetadata) => {
      times.push(meta.mediaTime);
      if (times.length >= 16) return resolve();
      video.requestVideoFrameCallback(tick);
    };
    video.requestVideoFrameCallback(tick);
    setTimeout(resolve, 2000);
  });
  video.pause();

  const deltas = times.slice(1).map((t, i) => t - times[i]).filter((d) => d > 1e-4);
  if (deltas.length < 4) return 25;
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  const fps = 1 / median;
  // Snap to the rates footage is actually shot at; a measured 24.97 is 25.
  const known = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
  const nearest = known.reduce((a, b) => (Math.abs(b - fps) < Math.abs(a - fps) ? b : a));
  return Math.abs(nearest - fps) < 1.5 ? nearest : Math.round(fps);
}

function meanLuma(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma — the same weighting ffmpeg's signalstats YAVG reports,
    // so thresholds tuned against one match the other.
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4);
}

function meanAbsDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return sum / (a.length / 4) / 3 / 255;
}

/**
 * Walks a coarse cut candidate frame by frame to find the exact boundary.
 *
 * The coarse pass only says "something changed between 6.0 and 6.2". A loop
 * boundary 0.2s off a cut still shows a slice of the wrong shot, which is
 * exactly the jump the picker exists to prevent.
 */
async function refineCut(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: number,
  to: number,
  fps: number
): Promise<number> {
  const step = 1 / fps;
  let prev: Uint8ClampedArray | null = null;
  let best = to;
  let bestDiff = 0;
  for (let t = from; t <= to + step / 2; t += step) {
    await seekTo(video, t);
    ctx.drawImage(video, 0, 0, w, h);
    const cur = ctx.getImageData(0, 0, w, h).data;
    if (prev) {
      const d = meanAbsDiff(prev, cur);
      if (d > bestDiff) {
        bestDiff = d;
        // The cut is *this* frame — the first one belonging to the new shot.
        best = t;
      }
    }
    prev = cur;
  }
  return best;
}

export async function analyzeVideo(
  video: HTMLVideoElement,
  onProgress?: (fraction: number) => void
): Promise<Analysis> {
  const duration = video.duration;
  const aspect = video.videoHeight / video.videoWidth;
  const w = ANALYSIS_WIDTH;
  const h = Math.max(2, Math.round(w * aspect));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // willReadFrequently: every single sampled frame is read back, which is the
  // exact case the GPU-backed default is slowest at.
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const fps = await measureFps(video);

  const thumbH = THUMB_HEIGHT;
  const thumbW = Math.round(thumbH / aspect);
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext("2d")!;
  const thumbEvery = duration / THUMB_COUNT;
  const thumbs: string[] = [];
  let thumbsDrawn = 0;

  const samples: LumaSample[] = [];
  const candidates: { from: number; to: number }[] = [];
  let prev: Uint8ClampedArray | null = null;

  const total = Math.floor(duration * COARSE_FPS);
  for (let i = 0; i < total; i++) {
    const t = i / COARSE_FPS;
    await seekTo(video, t);
    ctx.drawImage(video, 0, 0, w, h);
    const cur = ctx.getImageData(0, 0, w, h).data;

    samples.push({ t, luma: meanLuma(cur) });
    if (prev && meanAbsDiff(prev, cur) > CUT_THRESHOLD) {
      candidates.push({ from: t - 1 / COARSE_FPS, to: t });
    }
    prev = cur;

    // Piggyback the filmstrip on the same seeks rather than doing a second
    // pass — seeking is the expensive part, drawing is free.
    if (thumbsDrawn < THUMB_COUNT && t >= thumbsDrawn * thumbEvery) {
      thumbCtx.drawImage(video, 0, 0, thumbW, thumbH);
      // toDataURL rather than toBlob: toBlob's callback runs later, by which
      // point the canvas has been overwritten by a subsequent frame, so every
      // thumbnail would end up being the last one drawn.
      thumbs.push(thumbCanvas.toDataURL("image/webp", 0.6));
      thumbsDrawn++;
    }

    if (onProgress && i % 5 === 0) onProgress((i / total) * 0.75);
  }

  const cuts: number[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const { from, to } = candidates[i];
    cuts.push(await refineCut(video, ctx, w, h, from, to, fps));
    if (onProgress) onProgress(0.75 + (i / Math.max(1, candidates.length)) * 0.25);
  }

  // A dissolve registers as several consecutive "cuts"; keep the first, which
  // is where the outgoing shot stops being clean.
  const merged = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 0.35);

  if (onProgress) onProgress(1);

  return {
    duration,
    width: video.videoWidth,
    height: video.videoHeight,
    fps,
    samples,
    cuts: merged,
    thumbs,
  };
}

/** Mean luma of one exact moment — used for the two selection boundaries. */
export async function lumaAt(video: HTMLVideoElement, t: number): Promise<number> {
  const w = ANALYSIS_WIDTH;
  const h = Math.max(2, Math.round(w * (video.videoHeight / video.videoWidth)));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  await seekTo(video, t);
  ctx.drawImage(video, 0, 0, w, h);
  return meanLuma(ctx.getImageData(0, 0, w, h).data);
}

/** Nearest detected cut to `t`, or null when none is within `within` seconds. */
export function snapToCut(cuts: number[], t: number, within: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const c of cuts) {
    const d = Math.abs(c - t);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best !== null && bestD <= within ? best : null;
}
