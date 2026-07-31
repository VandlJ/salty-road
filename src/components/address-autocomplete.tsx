"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Suggestion = { label: string; street: string; city: string; zip: string };

export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(value.trim())}`);
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(json.items ?? []);
        setOpen((json.items ?? []).length > 0);
      } catch {
        // Network hiccup — autocomplete just stays empty, typing still works.
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        // Safari (and to a lesser extent Chrome) largely ignore
        // autocomplete="off" on address-shaped fields and show their own
        // native Contacts-based suggestion panel on top, which is the
        // "Adresa"-with-no-real-text overlay covering this dropdown — not a
        // bug in this component. Renaming away from "street"/"address" and
        // stacking the usual defeat-autofill attributes is the standard
        // (still imperfect, but much better) workaround.
        name="q"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore=""
        data-bwignore="true"
        data-form-type="other"
        className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
      />

      <AnimatePresence>
      {open && (
        <motion.ul
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute z-30 mt-2 w-full max-h-64 overflow-y-auto bg-[#111] border border-gray-600 rounded-sm shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-gray-400"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </motion.ul>
      )}
      </AnimatePresence>
    </div>
  );
}
