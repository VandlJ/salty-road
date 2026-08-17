"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// The hero's backdrop: a 7.4s silent loop cut from the Volume 1 aftermovie,
// with the poster still underneath it.
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
export default function HeroBackground() {
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
        src="/hero/poster.webp"
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
          {/* Ordered most- to least-preferred. The browser takes the first
              source whose type it can play and whose media query matches, so
              the 1920 AV1 is reserved for viewports wide enough to resolve it.
              Safari plays neither AV1-in-WebM nor VP9 here and falls through
              to the H.264 MP4. */}
          <source src="/hero/loop-1920.webm" type="video/webm" media="(min-width: 1280px)" />
          <source src="/hero/loop-1280.webm" type="video/webm" />
          <source src="/hero/loop-1280.mp4" type="video/mp4" />
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
