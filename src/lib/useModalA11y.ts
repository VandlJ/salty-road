"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Locks body scroll, traps Tab focus inside the modal, moves focus in on
// open, and calls onClose on Escape. Attach the returned ref to the modal
// panel element (not the overlay) and add role="dialog" aria-modal="true".
export function useModalA11y<T extends HTMLElement>(active: boolean, onClose?: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = ref.current;
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable?.[0];
    const last = focusable && focusable.length > 0 ? focusable[focusable.length - 1] : undefined;
    (first ?? container)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, onClose]);

  return ref;
}
