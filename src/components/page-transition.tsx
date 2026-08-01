"use client";

import { usePathname } from "next/navigation";

// Keying by pathname forces React to remount this div on every route
// change, which re-triggers the `.page-enter` CSS animation (see
// globals.css) — a real page-transition feel without a JS animation
// library. `prefers-reduced-motion` already collapses it to instant via the
// site-wide override in globals.css.
//
// Also owns the `<main>` tag (rather than layout.tsx rendering it
// statically) — main is flex-1 so it fills the remaining space between
// navbar and footer (sticky-footer pattern), with the page-enter div
// stretching to match so short-content pages still center/lay out inside
// the full available height.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main className="flex-1 flex flex-col overflow-x-hidden">
      <div key={pathname} className="page-enter flex-1 flex flex-col">
        {children}
      </div>
    </main>
  );
}
