"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useCartStore, cartCount } from "@/lib/cartStore";

export default function CartLink({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const items = useCartStore((state) => state.items);
  // Avoid a hydration mismatch: the server always renders 0 (no access to
  // localStorage), so only show the real count once mounted on the client.
  const [mounted, setMounted] = useState(false);
  // Standard client-mount-detection pattern for avoiding SSR/localStorage
  // hydration mismatches — not the render-cascade pattern the rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const count = mounted ? cartCount(items) : 0;

  return (
    <Link
      href="/shop/cart"
      aria-label="Cart"
      data-testid="cart-link"
      onClick={onClick}
      className={`relative flex items-center text-white hover:text-gray-300 transition-colors duration-200 ${className}`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {count > 0 && (
        // Keying on `count` remounts this element on every change, so the
        // CSS pop-in animation replays each time an item is added or
        // removed — not just on the 0→1 transition.
        <span
          key={count}
          data-testid="cart-badge"
          className="badge-pop absolute -top-2 -right-2 bg-brand text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
