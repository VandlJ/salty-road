"use client";

import { usePathname } from "next/navigation";

// Keying by pathname forces React to remount this div on every route
// change, which re-triggers the `.page-enter` CSS animation (see
// globals.css) — a real page-transition feel without a JS animation
// library. `prefers-reduced-motion` already collapses it to instant via the
// site-wide override in globals.css.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter flex-1 flex flex-col">
      {children}
    </div>
  );
}
