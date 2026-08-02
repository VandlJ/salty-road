"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/routing";

// The panel (form, motion/react animations) is the expensive part — deferred
// until the user actually opens the widget for the first time, so the
// `motion` chunk isn't forced into every page's critical bundle just for a
// floating action button most visitors never click. `ssr: false` is safe
// here since the panel is never visible on first paint anyway (open starts
// false).
const ContactWidgetPanel = dynamic(() => import("@/components/contact-widget-panel"), {
  ssr: false,
});

export default function ContactWidget() {
  const t = useTranslations("ContactWidget");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Once true, stays true — the panel chunk is cheap to keep mounted after
  // the first load, and its own AnimatePresence handles show/hide from then
  // on via the `open` prop.
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Click-outside closes the panel. Not a full modal (useModalA11y) — this
  // doesn't block interaction with the rest of the page, it's a small
  // floating panel, so no scroll-lock/focus-trap is appropriate here.
  // The toggle button is explicitly excluded here — mousedown fires before
  // click, so without this exclusion a click on the button while open would
  // close via this handler and then immediately reopen via the button's own
  // onClick toggle.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current && !panelRef.current.contains(target)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Admin already has its own dedicated messages inbox — the public contact
  // bubble doesn't belong on those pages.
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-3 right-5 sm:bottom-6 sm:right-6 z-40">
      {loaded && <ContactWidgetPanel open={open} panelRef={panelRef} />}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setLoaded(true);
        }}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        className="relative w-14 h-14 rounded-full bg-black border-2 border-brand shadow-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-transform duration-150 hover:scale-[1.08] active:scale-95"
      >
        <span
          className={`absolute w-9 h-9 transition-all duration-200 ease-out ${
            open ? "opacity-0 -rotate-90 scale-[0.4]" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <Image
            src="/logo_saltyroad-cropped.svg"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9"
            style={{ filter: "invert(1)" }}
          />
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute text-white transition-all duration-200 ease-out ${
            open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-[0.4]"
          }`}
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
