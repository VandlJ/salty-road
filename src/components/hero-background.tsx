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
// hydration puts the ~2MB fetch strictly after first paint.

// A pre-edited 12.7s cut supplied as-is, so there is no window to choose and
// no single resolution ladder to build: the source is 1040x576, and encoding
// a 1920 rendition from it would only ship an upscale. It already loops
// cleanly — both boundary frames are bright and land on a cut.
//
// Two entries, most- to least-preferred. AV1 is a re-encode at CRF 36, which
// is visually indistinguishable from the source at this bitrate while saving
// ~25%. The MP4 is the delivered file stream-copied, not re-encoded: the
// source is already a 1.67 Mbps H.264, and a second lossy pass for the one
// browser family that needs it would only add generation loss.
//
// All three filenames change whenever the clip does, rather than new content
// being written over /hero/poster.webp. next/image caches optimised variants
// by source URL, so reusing a path can serve the previous clip's poster from
// cache — which is exactly what happened while this one was swapped in.
const BUNDLED: HeroVideo = {
  poster: "/hero/loop-poster.webp",
  sources: [
    { url: "/hero/loop-av1.webm", type: "video/webm", width: 1040, height: 576, bytes: 1_987_755 },
    { url: "/hero/loop-h264.mp4", type: "video/mp4", width: 1040, height: 576, bytes: 2_637_600 },
  ],
  start: 0,
  end: 12.67,
  sourceName: "salty_wide_short.mp4",
  sourceBytes: 2_637_513,
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

  // Stop decoding once the hero has mostly scrolled away, and while the tab
  // is in the background.
  //
  // A looping <video> keeps a decoder and a compositor layer busy for as long
  // as it plays, whether or not anyone can see it — on a page this long that
  // is the whole visit, for a decoration that left the screen in the first
  // second. Browsers throttle background *tabs* inconsistently and do nothing
  // at all about an off-screen element, so both cases are handled here.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden) {
        // Rejected autoplay is not an error worth surfacing; the poster
        // underneath is a complete fallback.
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    // 0.3 rather than 0: "mostly gone" is the point at which it stops being
    // worth decoding, and a 0 threshold would keep it running until the very
    // last pixel of a full-height hero left the viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.intersectionRatio >= 0.3;
        sync();
      },
      { threshold: [0, 0.3, 0.6] }
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [showVideo]);

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
              whose media query matches. That ordering is what makes Safari
              work: it decodes neither AV1-in-WebM nor, on most machines, AV1
              at all, so it falls through to the H.264 entry at the end. The
              `media` attribute is only set when a clip actually has
              resolution variants to gate. */}
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
