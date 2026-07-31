"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Locks body scroll, traps Tab focus inside the modal, moves focus in on
// open, and calls onClose on Escape. Attach the returned ref to the modal
// panel element (not the overlay) and add role="dialog" aria-modal="true".
export function useModalA11y<T extends HTMLElement>(active: boolean, onClose?: () => void) {
  const ref = useRef<T>(null);
  // Read via ref instead of putting `onClose` in the effect's deps — a
  // caller passing an inline arrow function (common, e.g. `() =>
  // setOpen(false)`) gets a new identity on every parent re-render, which
  // would tear the lock down and reapply it every time — harmless-looking
  // but real (a re-render mid-scroll-gesture opens a scrollable gap), and
  // it's exactly what re-renders in the middle of admin actions (reorder,
  // delete) were doing to the photo-gallery lightbox's scroll lock.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    // Lock both html and body (not just body) — matches the mobile-nav
    // scroll-lock pattern elsewhere in this codebase; some browsers keep
    // scrolling the document via the <html> element even with body's
    // overflow hidden.
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const container = ref.current;
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable?.[0];
    const last = focusable && focusable.length > 0 ? focusable[focusable.length - 1] : undefined;
    (first ?? container)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onCloseRef.current) {
        onCloseRef.current();
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
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousOverscroll;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  return ref;
}
