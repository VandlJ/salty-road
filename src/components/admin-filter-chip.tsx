"use client";

import React from "react";

export default function AdminFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
        active
          ? "bg-white text-black border-white"
          : "bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-white"
      }`}
    >
      {label}
      {count !== undefined && <span className={active ? "text-black/50" : "text-gray-600"}> ({count})</span>}
    </button>
  );
}
