"use client";

import { useTranslations } from "next-intl";
import React from "react";
import { motion } from "motion/react";

export default function QuantityStepper({
  id,
  value,
  onChange,
  min = 1,
  max,
}: {
  id?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const t = useTranslations("QuantityStepper");
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));

  return (
    <div className="inline-flex w-fit items-stretch border-2 border-gray-400 rounded-sm overflow-hidden bg-white/5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={t("decrease")}
        className="flex items-center justify-center w-9 h-9 text-white text-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        −
      </motion.button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-12 text-center bg-transparent text-white focus:outline-none"
      />
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        onClick={() => onChange(clamp(value + 1))}
        disabled={max !== undefined && value >= max}
        aria-label={t("increase")}
        className="flex items-center justify-center w-9 h-9 text-white text-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        +
      </motion.button>
    </div>
  );
}
