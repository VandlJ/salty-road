import { seekTo } from "./analyze";

// Encodes the chosen window into the renditions the hero ships, entirely in
// the admin's browser via WebCodecs. No ffmpeg on the server, no 135MB source
// upload — only the ~1-3MB outputs ever leave the machine.
//
// Frames are captured by *seeking*, not by playing. Playing and grabbing
// frames from requestVideoFrameCallback is the obvious approach and it is
// lossy: rVFC only fires for frames the compositor actually presents, so a
// busy main thread silently drops them. Measured on this exact clip, realtime
// capture lost 26 of 186 frames with AV1, while seeking produced all 186 —
// and did it in 1.5s instead of 7.4s, because it never waits for playback.

export type RenditionSpec = {
  id: string;
  /** WebCodecs codec string, e.g. "avc1.640028". */
  codec: string;
  width: number;
  height: number;
  bitrate: number;
  /** Media query that gates this rendition in the <source> list. */
  media?: string;
};

export type EncodedRendition = RenditionSpec & {
  blob: Blob;
  /** MIME with codecs, ready for the <source type> attribute. */
  mimeType: string;
};

export type EncodeProgress = {
  renditionId: string;
  /** 0-1 within this rendition. */
  fraction: number;
  /** 0-based index of the rendition being encoded. */
  index: number;
  total: number;
};

/**
 * The renditions offered, widest and most efficient first.
 *
 * AV1 is listed before H.264 at each size because it is meaningfully smaller
 * (1.00MB vs 1.43MB at 720p on the reference clip) and browsers pick the
 * first <source> they can play. H.264 is never dropped: Safari cannot decode
 * AV1 without hardware support, so it is the fallback that makes the loop
 * work everywhere.
 */
export function candidateRenditions(sourceWidth: number): RenditionSpec[] {
  const list: RenditionSpec[] = [];
  if (sourceWidth >= 1600) {
    list.push(
      { id: "av1-1920", codec: "av01.0.08M.08", width: 1920, height: 1080, bitrate: 2_200_000, media: "(min-width: 1280px)" },
      { id: "avc-1920", codec: "avc1.640028", width: 1920, height: 1080, bitrate: 3_000_000, media: "(min-width: 1280px)" }
    );
  }
  list.push(
    { id: "av1-1280", codec: "av01.0.05M.08", width: 1280, height: 720, bitrate: 1_200_000 },
    { id: "avc-1280", codec: "avc1.640028", width: 1280, height: 720, bitrate: 1_600_000 }
  );
  return list;
}

export function mimeFor(codec: string) {
  return `video/mp4; codecs="${codec}"`;
}

/** Which of the candidates this browser can actually encode. */
export async function supportedRenditions(specs: RenditionSpec[]): Promise<RenditionSpec[]> {
  if (typeof VideoEncoder === "undefined") return [];
  const out: RenditionSpec[] = [];
  for (const spec of specs) {
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec: spec.codec,
        width: spec.width,
        height: spec.height,
        bitrate: spec.bitrate,
        framerate: 25,
      });
      if (res.supported) out.push(spec);
    } catch {
      // An unrecognised codec string throws rather than returning false.
    }
  }
  return out;
}

/**
 * The rendition a typical phone will download — the narrowest one with no
 * media query. Used to estimate weight while the admin drags the handles,
 * long before anything is encoded.
 */
export function estimateBytes(specs: RenditionSpec[], durationSec: number): number {
  const mobile = [...specs].reverse().find((s) => !s.media) ?? specs.at(-1);
  if (!mobile) return 0;
  // Bitrate is a target the encoder tracks closely on footage this short;
  // measured output landed within 5% of bitrate x duration on the reference
  // clip. The /8 is bits to bytes.
  return (mobile.bitrate / 8) * durationSec;
}

async function encodeOne(
  video: HTMLVideoElement,
  spec: RenditionSpec,
  start: number,
  end: number,
  fps: number,
  onProgress: (fraction: number) => void
): Promise<EncodedRendition> {
  // Dynamically imported so the muxer never lands in the public bundle —
  // this page is one admin screen, not something a visitor loads.
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  const canvas = new OffscreenCanvas(spec.width, spec.height);
  const ctx = canvas.getContext("2d")!;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: spec.codec.startsWith("av01") ? "av1" : "avc",
      width: spec.width,
      height: spec.height,
    },
    fastStart: "in-memory",
  });

  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      failure = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({
    codec: spec.codec,
    width: spec.width,
    height: spec.height,
    bitrate: spec.bitrate,
    framerate: fps,
    latencyMode: "quality",
  });

  const frameCount = Math.max(1, Math.round((end - start) * fps));
  const frameDuration = Math.round(1e6 / fps);

  for (let i = 0; i < frameCount; i++) {
    if (failure) break;
    // Half a frame past the boundary: landing exactly on one is ambiguous and
    // the decoder may hand back either neighbour.
    await seekTo(video, start + (i + 0.5) / fps);
    ctx.drawImage(video, 0, 0, spec.width, spec.height);
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((i * 1e6) / fps),
      duration: frameDuration,
    });
    // Only the first frame is forced; letting the encoder place the rest
    // keeps the file small, and the loop always restarts at frame 0 anyway.
    encoder.encode(frame, { keyFrame: i === 0 });
    frame.close();

    // Seeking is synchronous from our side, so without this the encode queue
    // is the one thing that can grow without bound.
    while (encoder.encodeQueueSize > 8 && !failure) {
      await new Promise((r) => setTimeout(r, 10));
    }
    if (i % 5 === 0) onProgress(i / frameCount);
  }

  await encoder.flush();
  encoder.close();
  if (failure) throw failure;

  muxer.finalize();
  onProgress(1);
  return {
    ...spec,
    blob: new Blob([muxer.target.buffer], { type: "video/mp4" }),
    mimeType: mimeFor(spec.codec),
  };
}

export async function encodeRenditions(
  video: HTMLVideoElement,
  specs: RenditionSpec[],
  start: number,
  end: number,
  fps: number,
  onProgress: (p: EncodeProgress) => void
): Promise<EncodedRendition[]> {
  const out: EncodedRendition[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    out.push(
      await encodeOne(video, spec, start, end, fps, (fraction) =>
        onProgress({ renditionId: spec.id, fraction, index: i, total: specs.length })
      )
    );
  }
  return out;
}

/**
 * The poster: the clip's own first frame, not a separate photo.
 *
 * Anything else shows a visible jump when the video takes over, because the
 * still and the first frame are different pictures.
 */
export async function encodePoster(
  video: HTMLVideoElement,
  start: number,
  width = 1920
): Promise<Blob> {
  const height = Math.round(width * (video.videoHeight / video.videoWidth));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  await seekTo(video, start + 0.02);
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("poster encode failed"))),
      "image/webp",
      0.72
    )
  );
}
