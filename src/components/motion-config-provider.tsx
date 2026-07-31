"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// `reducedMotion="user"` makes every motion.* component site-wide respect
// the OS-level prefers-reduced-motion setting automatically (animations
// jump straight to their end state instead of playing) — the same
// guarantee globals.css already gives plain CSS transitions/keyframes via
// its own @media query, extended to cover the JS-driven Framer Motion
// animations added alongside them.
export default function MotionConfigProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
