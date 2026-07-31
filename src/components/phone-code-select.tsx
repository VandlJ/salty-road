"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type PhoneCountry = { code: string; flag: string; name: string };

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "+420", flag: "🇨🇿", name: "Česko" },
  { code: "+421", flag: "🇸🇰", name: "Slovensko" },
  { code: "+48", flag: "🇵🇱", name: "Polsko" },
  { code: "+43", flag: "🇦🇹", name: "Rakousko" },
  { code: "+49", flag: "🇩🇪", name: "Německo" },
];

export default function PhoneCodeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = PHONE_COUNTRIES.find((c) => c.code === value) ?? PHONE_COUNTRIES[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-2 px-3 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200 cursor-pointer hover:border-gray-300"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="font-medium tabular-nums">{selected.code}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
      {open && (
        <motion.ul
          role="listbox"
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20 mt-2 w-max min-w-full bg-[#111] border border-gray-600 rounded-sm shadow-2xl overflow-hidden"
        >
          {PHONE_COUNTRIES.map((c) => {
            const isSelected = c.code === value;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer transition-colors ${
                    isSelected ? "bg-brand text-white" : "text-white hover:bg-white/10"
                  }`}
                >
                  {isSelected ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="font-medium tabular-nums">{c.code}</span>
                </button>
              </li>
            );
          })}
        </motion.ul>
      )}
      </AnimatePresence>
    </div>
  );
}
