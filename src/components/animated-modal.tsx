"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode, Ref } from "react";

const panelTransition = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

interface AnimatedModalProps {
  open: boolean;
  panelRef: Ref<HTMLDivElement>;
  overlayClassName?: string;
  panelClassName: string;
  labelledBy?: string;
  ariaLabel?: string;
  ariaLive?: "polite" | "assertive";
  children: ReactNode;
}

// Shared enter/exit animation for every confirm/error/success `fixed inset-0`
// dialog in the app — before this they all just popped into and out of
// existence with zero transition. Structure (overlay div > dialog div,
// role="dialog"/aria-modal/tabIndex) matches what useModalA11y expects
// unchanged, so callers keep using that hook for focus-trap/Escape/scroll-lock
// and only swap their raw `{cond && (<div>...)}` markup for this.
export function AnimatedModal({
  open,
  panelRef,
  overlayClassName = "bg-black/90 backdrop-blur-sm",
  panelClassName,
  labelledBy,
  ariaLabel,
  ariaLive,
  children,
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={ariaLabel}
            aria-live={ariaLive}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={panelTransition}
            className={`outline-none ${panelClassName}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
