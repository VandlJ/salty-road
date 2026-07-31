"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

// Cross-fades between two render states keyed by `activeKey` (e.g.
// "skeleton" vs "content") instead of the default abrupt swap that happens
// when a conditional just renders one tree then the other on the next
// render. `mode="wait"` finishes the exit fade before the new tree mounts,
// so nothing overlaps mid-transition.
export function FadeSwap({ activeKey, children }: { activeKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
