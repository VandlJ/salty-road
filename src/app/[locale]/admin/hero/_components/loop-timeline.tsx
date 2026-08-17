"use client";

import { useCallback, useRef } from "react";
import type { Analysis } from "../_lib/analyze";
import { snapToCut } from "../_lib/analyze";
import { HERO_VIDEO_RULES } from "@/lib/heroVideo";

// The scrubber: filmstrip, detected cuts, a brightness trace and the two
// handles that define the loop.
//
// Cuts are drawn rather than merely snapped to, because the single most
// useful thing an editor can see here is where the shots change — a loop
// whose ends don't sit on cuts jumps every few seconds, and no amount of
// careful dragging finds those boundaries by eye on a filmstrip alone.

type Handle = "start" | "end" | "window";

export default function LoopTimeline({
  analysis,
  start,
  end,
  playhead,
  onChange,
  onScrub,
}: {
  analysis: Analysis;
  start: number;
  end: number;
  /** Current preview position, seconds, or null when not playing. */
  playhead: number | null;
  onChange: (next: { start: number; end: number }) => void;
  /** Fired while dragging a handle so the preview can show that exact frame. */
  onScrub: (t: number | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; grabOffset: number } | null>(null);

  const { duration, cuts, samples, thumbs, fps } = analysis;
  const pct = (t: number) => `${(t / duration) * 100}%`;

  const timeAt = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(duration, ratio * duration));
    },
    [duration]
  );

  // Reads which handle was grabbed from the element rather than closing over
  // it: a curried `onPointerDown(handle)` builds the handler during render,
  // which is where the ref write would then appear to happen.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget.dataset.handle as Handle;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeAt(e.clientX);
    dragRef.current = {
      handle,
      // Grabbing the window in the middle shouldn't teleport it so its start
      // lands under the cursor.
      grabOffset: handle === "window" ? t - start : 0,
    };
    onScrub(handle === "end" ? end : start);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeAt(e.clientX);
    // Never let a drag collapse the window to nothing — the handles would
    // end up stacked and neither could be grabbed again.
    const minLen = HERO_VIDEO_RULES.minDurationSec / 2;

    if (drag.handle === "start") {
      const next = Math.min(t, end - minLen);
      onChange({ start: Math.max(0, next), end });
      onScrub(next);
    } else if (drag.handle === "end") {
      const next = Math.max(t, start + minLen);
      onChange({ start, end: Math.min(duration, next) });
      onScrub(next);
    } else {
      const length = end - start;
      const nextStart = Math.max(0, Math.min(duration - length, t - drag.grabOffset));
      onChange({ start: nextStart, end: nextStart + length });
      onScrub(nextStart);
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    onScrub(null);
    if (!drag) return;

    // Snap on release rather than continuously: snapping mid-drag makes the
    // handle fight the cursor, and the admin can still place a boundary
    // deliberately off a cut by letting go further away than the tolerance.
    const within = HERO_VIDEO_RULES.cutToleranceSec;
    const snappedStart = snapToCut(cuts, start, within) ?? start;
    const snappedEnd = snapToCut(cuts, end, within) ?? end;
    if (snappedStart !== start || snappedEnd !== end) {
      onChange({ start: snappedStart, end: Math.max(snappedEnd, snappedStart + 0.5) });
    }
  };

  const nudge = (handle: "start" | "end", frames: number) => {
    const delta = frames / fps;
    if (handle === "start") {
      onChange({ start: Math.max(0, Math.min(start + delta, end - 0.5)), end });
    } else {
      onChange({ start, end: Math.min(duration, Math.max(end + delta, start + 0.5)) });
    }
  };

  const onHandleKeyDown = (handle: "start" | "end") => (e: React.KeyboardEvent) => {
    // Frame-accurate placement with a mouse is not realistic; the arrow keys
    // are how a boundary actually gets nailed to the exact frame.
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(handle, e.shiftKey ? -10 : -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(handle, e.shiftKey ? 10 : 1);
    }
  };

  // The brightness trace, as an SVG path in a 0-100 x 0-100 viewBox so it
  // stretches with the track without any layout measurement.
  const lumaPath = samples.length
    ? samples
        .map((s, i) => {
          const x = (s.t / duration) * 100;
          const y = 100 - (s.luma / 255) * 100;
          return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ")
    : "";

  return (
    <div className="select-none">
      <div
        ref={trackRef}
        className="relative w-full h-28 border border-gray-700 bg-black touch-none overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Each thumbnail gets an equal share of the width and crops to fill
            it, so the strip stays undistorted whatever the track's width. */}
        <div className="absolute inset-0 flex pointer-events-none">
          {thumbs.map((src, i) => (
            /* eslint-disable-next-line @next/next/no-img-element -- data URLs
               generated in this browser; next/image cannot process them. */
            <img key={i} src={src} alt="" className="flex-1 min-w-0 h-full object-cover" />
          ))}
        </div>

        {/* Outside the selection, dimmed — the eye should land on the loop. */}
        <div className="absolute inset-y-0 left-0 bg-black/70 pointer-events-none" style={{ width: pct(start) }} />
        <div className="absolute inset-y-0 right-0 bg-black/70 pointer-events-none" style={{ width: pct(duration - end) }} />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* The threshold below which a boundary frame reads as black. */}
          <line
            x1="0"
            x2="100"
            y1={100 - (HERO_VIDEO_RULES.minBoundaryLuma / 255) * 100}
            y2={100 - (HERO_VIDEO_RULES.minBoundaryLuma / 255) * 100}
            stroke="#ef4444"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
          <path d={lumaPath} fill="none" stroke="#facc15" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>

        {cuts.map((c) => (
          <div
            key={c}
            className="absolute top-0 bottom-0 w-px bg-white/45 pointer-events-none"
            style={{ left: pct(c) }}
          />
        ))}

        {playhead !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-brand pointer-events-none"
            style={{ left: pct(playhead) }}
          />
        )}

        {/* Drag the whole window. Sits under the handles so the edges win. */}
        <div
          className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
          style={{ left: pct(start), width: pct(end - start) }}
          data-handle="window"
          onPointerDown={onPointerDown}
        />

        {(["start", "end"] as const).map((handle) => (
          <div
            key={handle}
            role="slider"
            tabIndex={0}
            aria-label={handle === "start" ? "Loop start" : "Loop end"}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={handle === "start" ? start : end}
            data-handle={handle}
            onPointerDown={onPointerDown}
            onKeyDown={onHandleKeyDown(handle)}
            className="absolute inset-y-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group focus:outline-none"
            style={{ left: pct(handle === "start" ? start : end) }}
          >
            <div className="w-1 h-full bg-white group-focus:bg-brand" />
            <div className="absolute w-3 h-6 bg-white group-focus:bg-brand rounded-sm" />
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[11px] text-gray-500 font-mono mt-1 tabular-nums">
        <span>0:00</span>
        <span className="text-gray-300">
          {start.toFixed(2)}s → {end.toFixed(2)}s
        </span>
        <span>
          {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
