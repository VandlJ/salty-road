"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Custom dark-themed date picker — the native <input type="date"> renders a
// browser-drawn calendar icon/popup that can't be restyled, and its icon
// has near-zero contrast against this site's dark inputs (browser default
// is tuned for light backgrounds).
export default function DatePicker({
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  clearLabel?: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selected = value ? parseIsoDate(value) : null;
  const [viewDate, setViewDate] = useState(selected ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

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

  function openPicker() {
    setViewDate(selected ?? new Date());
    setOpen(true);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first grid: JS getDay() is Sunday-first (0-6), shift so Monday=0.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const displayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  // Reference week (2024-01-01 is a Monday) purely to get correctly-ordered
  // Mon-Sun weekday abbreviations for the header row.
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayFormatter.format(new Date(2024, 0, 1 + i))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border-2 border-gray-500 text-white text-sm focus:border-white focus:outline-none rounded-sm cursor-pointer text-left"
      >
        <span className={selected ? "text-white" : "text-gray-500"}>
          {selected ? displayFormatter.format(selected) : placeholder}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }
            }}
            aria-label={clearLabel}
            className="shrink-0 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-72 bg-[#111] border border-gray-600 rounded-sm shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm cursor-pointer transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-white text-sm font-bold capitalize">{monthFormatter.format(viewDate)}</span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm cursor-pointer transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdayLabels.map((label, i) => (
                <div key={i} className="text-center text-[10px] uppercase tracking-wide text-gray-500 font-bold py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const isSelected = selected && toIsoDate(date) === toIsoDate(selected);
                const isToday = toIsoDate(date) === toIsoDate(today);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(toIsoDate(date));
                      setOpen(false);
                    }}
                    className={`aspect-square rounded-sm text-sm font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-brand text-white"
                        : isToday
                          ? "border border-gray-500 text-white hover:bg-white/10"
                          : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full mt-3 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-sm cursor-pointer transition-colors"
              >
                {clearLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
