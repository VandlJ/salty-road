"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Shows the selection exactly as the homepage will: same scrim, same
// gradient, the real wordmark on top. Judging contrast against a bare video
// is guesswork — a shot that looks fine raw can swallow the logo once it is
// the hero's background, and that is the decision this screen exists to make.

export default function LoopPreview({
  src,
  start,
  end,
  scrubTo,
  onTime,
}: {
  /** Object URL of the source file. */
  src: string;
  start: number;
  end: number;
  /** When set, hold this exact frame instead of playing — used while dragging. */
  scrubTo: number | null;
  onTime: (t: number | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Mirrored into a ref so the rAF loop below can read the current window
  // without being torn down and rebuilt on every pixel of a drag.
  const rangeRef = useRef({ start, end });
  useEffect(() => {
    rangeRef.current = { start, end };
  }, [start, end]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (scrubTo !== null) {
      video.pause();
      video.currentTime = scrubTo;
      return;
    }

    // Restart from the top whenever the window changes, so the preview always
    // answers "what does this loop look like", not "where was I".
    video.currentTime = rangeRef.current.start;
    void video.play().catch(() => {
      // Autoplay can be refused before the admin has interacted with the
      // page; the controls below still work.
    });
  }, [scrubTo, start, end]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    const tick = () => {
      const { start: s, end: e } = rangeRef.current;
      // timeupdate fires roughly 4x a second, which overshoots the loop end
      // by up to a quarter second — visible as a stray frame of the next
      // shot every time round. rAF catches it within a frame.
      if (video.currentTime >= e || video.currentTime < s - 0.05) {
        video.currentTime = s;
      }
      onTime(video.paused ? null : video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      onTime(null);
    };
  }, [onTime]);

  return (
    <div className="relative w-full aspect-video overflow-hidden border border-gray-700 bg-black">
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Kept in sync with components/hero-background.tsx by hand — if the
          scrim there changes, change it here, or this preview starts lying. */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/80" />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <Image
          src="/SaltyRoad/SRM_text.webp"
          alt=""
          width={1200}
          height={470}
          sizes="(max-width: 1024px) 100vw, 640px"
          className="w-full max-w-md h-auto drop-shadow-2xl"
          priority={false}
        />
      </div>
    </div>
  );
}
