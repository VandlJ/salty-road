"use client";

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
// The poster is the video's own first frame, and it is carried by the <video>
// element's own `poster` attribute rather than by a separate <Image> stacked
// underneath. That detail is the whole performance story here.
//
// The previous arrangement — poster <Image>, then a <video> mounted after
// hydration and faded in — made the *video* the Largest Contentful Paint.
// It is full-bleed, so once it painted it replaced the poster as the largest
// element, and because it only appeared after hydration its paint time was
// the LCP time. Measured with Lighthouse on a throttled phone: LCP element
// = the <video>, render delay 5.7s.
//
// With the poster on the video element there is one box, painted once, from
// markup the server already sent. The poster paints at first contentful
// paint, and later video frames render into the same element at the same
// size, which is not a new LCP candidate. Sources are still attached after
// the page is idle, so the megabyte never competes with the critical path —
// but now deferring it no longer costs anything, because the pixels the
// user sees are already there.

// A pre-edited 12.7s cut supplied as-is, so there is no window to choose and
// no single resolution ladder to build: the source is 1040x576, and encoding
// a 1920 rendition from it would only ship an upscale. It already loops
// cleanly — both boundary frames are bright and land on a cut.
//
// The desktop pair is AV1 first — a CRF 36 re-encode, indistinguishable from
// the source on a detailed frame while saving ~25% — then the delivered file
// stream-copied rather than re-encoded, since the source is already a
// 1.67 Mbps H.264 and a second lossy pass for Safari's sake would only cost
// quality.
//
// Phones get a single 720-wide H.264 at 1.0MB instead of 2.0-2.6MB. It is
// H.264 rather than AV1 because at this size AV1 came out *larger* (1.03MB vs
// 1.00MB) — the efficiency gain does not survive the resolution drop — so one
// file covers every phone including Safari. That matters more here than
// anywhere: the video is full-bleed, which makes it a Largest Contentful
// Paint candidate, and mobile is where the bytes are slowest to arrive.
//
// Ordering is load-bearing. Sources are tried top to bottom and the first one
// whose type is playable *and* whose media query matches wins, so desktop
// Safari skips the AV1 and lands on the desktop MP4, while a phone fails both
// min-width gates and lands on the 720.
//
// Filenames change whenever the clip does, rather than new content being
// written over an existing path. next/image caches optimised variants by
// source URL, so reusing a path can serve the previous clip's poster from
// cache — which is exactly what happened while this one was swapped in.
const BUNDLED: HeroVideo = {
  poster: "/hero/loop-poster.webp",
  sources: [
    { url: "/hero/loop-av1.webm", type: "video/webm", media: "(min-width: 768px)", width: 1040, height: 576, bytes: 1_987_755 },
    { url: "/hero/loop-h264.mp4", type: "video/mp4", media: "(min-width: 768px)", width: 1040, height: 576, bytes: 2_637_600 },
    { url: "/hero/loop-720.mp4", type: "video/mp4", width: 720, height: 398, bytes: 1_043_932 },
  ],
  start: 0,
  end: 12.67,
  sourceName: "salty_wide_short.mp4",
  sourceBytes: 2_637_513,
  updatedAt: "2026-08-17T00:00:00.000Z",
};

export default function HeroBackground({ heroVideo }: { heroVideo?: HeroVideo | null }) {
  const clip = heroVideo ?? BUNDLED;
  // Whether the <source> children have been attached. The element itself is
  // always rendered, poster and all; this only gates the download.
  const [sourcesAttached, setSourcesAttached] = useState(false);
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

    // Wait for the browser to be idle rather than firing the moment
    // hydration finishes. Hydration is exactly when the main thread and the
    // connection are busiest, and this is a decoration — on a throttled
    // phone the megabyte landing in that window is what turns a fast page
    // into a slow-feeling one.
    const attach = () => setSourcesAttached(true);
    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof idle.requestIdleCallback === "function") {
      // The timeout is the floor: on a page that never goes idle the loop
      // should still start, just late.
      const id = idle.requestIdleCallback(attach, { timeout: 2500 });
      return () => idle.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(attach, 1200);
    return () => window.clearTimeout(id);
  }, []);

  // Attaching <source> children to a live element does nothing on its own —
  // the browser only re-reads them on an explicit load().
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourcesAttached) return;
    video.load();
    void video.play().catch(() => {});
  }, [sourcesAttached]);

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
  }, [sourcesAttached]);

  return (
    <>
      {/* The poster is now the Largest Contentful Paint, but it arrives as a
          plain `poster` attribute, which the preload scanner treats as
          ordinary priority — on the deployed site it started downloading
          2.9s into the load. React hoists this into <head>, so the request
          goes out with the document. */}
      <link rel="preload" as="image" href={clip.poster} fetchPriority="high" />
      <video
        ref={videoRef}
        // The poster is this element's own first frame, so the still and the
        // motion are one box that paints once — see the note at the top of
        // this file for why that is what fixed LCP.
        poster={clip.poster}
        autoPlay
        muted
        loop
        playsInline
        // Nothing to preload: the sources are attached from an effect once
        // the browser is idle, and load() is called then.
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover"
      >
        {/* The browser takes the first source whose type it can play and
            whose media query matches. That ordering is what makes Safari
            work: it decodes neither AV1-in-WebM nor, on most machines, AV1
            at all, so it falls through to the H.264 entry at the end. The
            `media` attribute is only set when a clip actually has
            resolution variants to gate. */}
        {sourcesAttached &&
          clip.sources.map((s) => (
            <source key={s.url} src={s.url} type={s.type} media={s.media} />
          ))}
      </video>

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
