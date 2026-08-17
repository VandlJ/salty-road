"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { HeroVideo } from "@/lib/heroVideo";

// The hero's backdrop: a short silent loop cut from the aftermovie, with the
// poster still underneath it.
//
// The clip is whichever one the current edition points at (chosen in
// /admin/hero and stored on the Edition row). The files committed under
// /public/hero are the fallback for an edition that has never had one picked
// — including a fresh database, where the homepage still has to look right.
//
// The poster is the video's own first frame, not a separate photo, so the
// hand-off from still to motion has no visible jump — the video fades in over
// an image it already matches pixel for pixel.
//
// Why the video is mounted from an effect rather than rendered server-side:
// the wordmark <Image> in hero.tsx is this page's LCP element, and a <video>
// in the initial HTML starts fetching immediately at high priority. On mobile
// that cost measurably more LCP than the loop is worth. Mounting after
// hydration puts the ~1.3MB fetch strictly after first paint.
// Ordered most- to least-preferred, matching what the picker encodes: AV1
// first because it is meaningfully smaller, H.264 last because Safari plays
// nothing else here.
const BUNDLED: HeroVideo = {
  poster: "/hero/poster.webp",
  sources: [
    { url: "/hero/loop-1920.webm", type: "video/webm", media: "(min-width: 1280px)", width: 1920, height: 1080, bytes: 1_931_653 },
    { url: "/hero/loop-1280.webm", type: "video/webm", width: 1280, height: 720, bytes: 1_330_352 },
    { url: "/hero/loop-1280.mp4", type: "video/mp4", width: 1280, height: 720, bytes: 1_519_858 },
  ],
  start: 6,
  end: 13.44,
  sourceName: "salty_wide.mp4",
  sourceBytes: 0,
  updatedAt: "2026-08-17T00:00:00.000Z",
};

export default function HeroBackground({ heroVideo }: { heroVideo?: HeroVideo | null }) {
  const clip = heroVideo ?? BUNDLED;
  const [showVideo, setShowVideo] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Respect the OS setting: reduced motion means the poster stays, full
    // stop. Checked once at mount rather than via a live listener — flipping
    // a background video on mid-session is more jarring than not reacting.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Skip the download entirely on a metered or slow connection. Non-standard
    // API, absent in Safari, so treat "unknown" as "go ahead".
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /^(slow-)?2g$/.test(conn.effectiveType)) return;

    // Setting state in an effect is normally a smell, hence the rule — but
    // deferring the fetch until after hydration is the entire purpose of this
    // component, and it can't be a lazy initial state without a hydration
    // mismatch (the server has no matchMedia to agree with).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowVideo(true);
  }, []);

  return (
    <>
      <Image
        src={clip.poster}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority
        // Deliberately not fetchPriority="high": see hero.tsx — the wordmark
        // is the LCP element and these two compete for early bandwidth.
        quality={60}
      />

      {showVideo && (
        <video
          ref={videoRef}
          // A poster attribute would double up on the <Image> above and
          // load the same bytes twice; the Image is the poster here.
          autoPlay
          muted
          loop
          playsInline
          // Not "none": the element only exists once we've decided to play it,
          // so there's nothing left to defer.
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          // Only revealed once a frame is actually decodable, otherwise the
          // first paint of the element is a black rectangle over the poster.
          onCanPlay={() => setVisible(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* The browser takes the first source whose type it can play and
              whose media query matches, so the 1080p rendition is reserved for
              viewports wide enough to resolve it and Safari — which decodes
              neither AV1-in-WebM nor, on most machines, AV1 at all — falls
              through to the H.264 one at the end. */}
          {clip.sources.map((s) => (
            <source key={s.url} src={s.url} type={s.type} media={s.media} />
          ))}
        </video>
      )}

      {/* Darkening pass. Two layers on purpose: a flat scrim that guarantees
          contrast for the white wordmark and CTA wherever the shot happens to
          be bright, plus a vertical gradient that weights the top (navbar) and
          bottom (scroll cue) darker than the middle. The blur that the still
          image used to carry is gone — blurring a video costs a compositor
          pass every frame, and the scrim alone is enough now that the poster
          is a clean frame rather than a compressed photo. */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/80" />
    </>
  );
}
